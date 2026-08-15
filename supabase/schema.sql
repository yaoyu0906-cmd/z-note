-- Z-Note: Supabase schema
-- Run this in the Supabase SQL editor for a fresh project.

-- Per-user vault salt (not secret, but needed to re-derive the AES key
-- from the user's passphrase on every session).
create table if not exists vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null,
  created_at timestamptz not null default now()
);

-- Encrypted provider API keys. ciphertext/iv are base64; plaintext keys
-- never reach this table or any server — encryption happens in-browser.
create table if not exists api_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini')),
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

-- Notes metadata for cloud sync/backup (actual file bytes live in the
-- user's local directory via File System Access API; this table just
-- tracks sync state + a cloud copy of each synced file's content so it
-- can be viewed/downloaded from another device).
--
-- Paths are relative and namespaced by the local workspace's folder name
-- (see lib/sync.ts) so syncing "the same" workspace from a second
-- device naturally lines up under the same prefix, without needing any
-- cross-device workspace identity system. Folders are their own rows
-- (is_folder = true, content null) purely so the folder itself — and
-- empty folders — show up in a "browse my cloud files" view; every file
-- under a synced folder gets its own row with the same workspace_name
-- prefix, preserving the folder structure.
create table if not exists synced_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_name text not null,
  path text not null, -- relative to the workspace root, e.g. "Projects/todo.md"
  is_folder boolean not null default false,
  file_type text check (file_type in ('md', 'txt', 'note', 'canvas') or file_type is null),
  content text, -- full file contents; null for folder rows
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_name, path)
);

-- One JSON blob per user for the optional "sync settings across devices"
-- toggle (Settings → Account). Deliberately a single opaque blob rather
-- than a column-per-setting table, mirroring how useSettingsStore already
-- treats app settings as one in-memory object — this just mirrors that
-- same object to the cloud instead of introducing a parallel schema.
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table vaults enable row level security;
alter table api_keys enable row level security;
alter table synced_files enable row level security;
alter table user_settings enable row level security;

create policy "vaults_owner_only" on vaults
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "api_keys_owner_only" on api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "synced_files_owner_only" on synced_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_settings_owner_only" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atomic, race-safe "check quota, then write" for one synced file.
--
-- The naive approach — SELECT current usage, compare to the cap, then
-- upsert — has a classic check-then-write race: two devices syncing at
-- nearly the same moment can each read a usage total that's still under
-- the cap, each pass their own check, and then both write, landing the
-- account over the 2 MB limit. pg_advisory_xact_lock serializes calls for
-- the *same* user (calls for different users never block each other) so
-- the second call's usage read always sees the first call's write already
-- committed — closing the race without needing a heavier locking scheme.
--
-- security definer lets this read/aggregate across the user's own rows
-- reliably regardless of RLS on the calling session; the auth.uid() check
-- keeps a user from calling this for anyone but themselves.
create or replace function sync_upsert_file(
  p_user_id uuid,
  p_workspace_name text,
  p_path text,
  p_file_type text,
  p_content text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_size bigint;
  v_usage bigint;
  v_new_size bigint;
  -- Keep this in sync with CLOUD_QUOTA_BYTES in lib/sync.ts.
  v_quota bigint := 2 * 1024 * 1024;
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(octet_length(content), 0) into v_old_size
  from synced_files
  where user_id = p_user_id and workspace_name = p_workspace_name and path = p_path;

  select coalesce(sum(octet_length(content)), 0) into v_usage
  from synced_files
  where user_id = p_user_id and is_folder = false;

  v_new_size := octet_length(p_content);

  if (v_usage - coalesce(v_old_size, 0) + v_new_size) > v_quota then
    raise exception 'quota_exceeded:%:%', (v_usage - coalesce(v_old_size, 0) + v_new_size), v_quota;
  end if;

  insert into synced_files (user_id, workspace_name, path, is_folder, file_type, content, updated_at)
  values (p_user_id, p_workspace_name, p_path, false, p_file_type, p_content, now())
  on conflict (user_id, workspace_name, path)
  do update set file_type = excluded.file_type, content = excluded.content, updated_at = excluded.updated_at, is_folder = false;
end;
$$;

grant execute on function sync_upsert_file(uuid, text, text, text, text) to authenticated;

-- Custom avatar uploads (Settings/account dropdown → "Upload avatar").
-- Google-login avatars don't use this bucket at all — they come straight
-- from the Google profile via user_metadata.avatar_url.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatar_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_owner_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Enables Supabase Realtime for synced_files — used so a cloud-only file
-- open on one device (no local File System Access, e.g. Safari/iOS) can
-- pick up an edit saved from another device live, without polling.
alter publication supabase_realtime add table synced_files;

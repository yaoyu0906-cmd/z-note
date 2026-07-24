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
-- tracks sync state + optional cloud backup blobs for the .note format).
create table if not exists notes_sync (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('md', 'txt', 'note')),
  content jsonb, -- used for .note files; md/txt sync as plain content below
  content_text text, -- used for .md/.txt files
  updated_at timestamptz not null default now(),
  unique (user_id, file_name)
);

alter table vaults enable row level security;
alter table api_keys enable row level security;
alter table notes_sync enable row level security;

create policy "vaults_owner_only" on vaults
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "api_keys_owner_only" on api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes_sync_owner_only" on notes_sync
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

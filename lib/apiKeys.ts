import { createClient } from "@/lib/supabase/client";
import {
  encryptApiKey,
  decryptApiKey,
  generateSalt,
  unlockVault,
  type EncryptedPayload,
} from "@/lib/crypto";

export type Provider = "openai" | "anthropic" | "gemini";

interface VaultRow {
  user_id: string;
  salt: string;
}

interface ApiKeyRow {
  user_id: string;
  provider: Provider;
  ciphertext: string;
  iv: string;
  updated_at: string;
}

/**
 * Ensures the user has a vault salt row, then derives + caches the session
 * vault key from their passphrase. Call on first key entry or on unlock.
 */
export async function ensureVaultAndUnlock(userId: string, passphrase: string) {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("vaults")
    .select("salt")
    .eq("user_id", userId)
    .maybeSingle<VaultRow>();

  let salt = existing?.salt;

  if (!salt) {
    const generated = generateSalt();
    salt = generated.salt;
    const { error } = await supabase.from("vaults").insert({ user_id: userId, salt });
    if (error) throw error;
  }

  await unlockVault(passphrase, salt);
}

export async function saveApiKey(userId: string, provider: Provider, plaintextKey: string) {
  const supabase = createClient();
  const payload: EncryptedPayload = await encryptApiKey(plaintextKey);

  const { error } = await supabase.from("api_keys").upsert(
    {
      user_id: userId,
      provider,
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" }
  );

  if (error) throw error;
}

export async function loadApiKey(userId: string, provider: Provider): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("ciphertext, iv")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle<ApiKeyRow>();

  if (error) throw error;
  if (!data) return null;

  return decryptApiKey({ ciphertext: data.ciphertext, iv: data.iv });
}

export async function loadAllApiKeys(userId: string): Promise<Partial<Record<Provider, string>>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("provider, ciphertext, iv")
    .eq("user_id", userId);

  if (error) throw error;

  const result: Partial<Record<Provider, string>> = {};
  for (const row of data ?? []) {
    result[row.provider as Provider] = await decryptApiKey({
      ciphertext: row.ciphertext,
      iv: row.iv,
    });
  }
  return result;
}

export async function deleteApiKey(userId: string, provider: Provider) {
  const supabase = createClient();
  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw error;
}

/**
 * Client-side encryption for user-supplied AI provider API keys.
 *
 * Design goal: a Supabase DB breach alone must NOT be enough to recover
 * plaintext keys. So the wrapping key is derived from a "vault passphrase"
 * that the user sets in the app and that is NEVER transmitted to Supabase
 * or any server — only the derived key's ciphertext output ever leaves
 * the browser.
 *
 * Flow:
 *   1. User sets a vault passphrase (separate from their login password).
 *   2. We derive an AES-GCM key from it via PBKDF2 + a random per-user salt.
 *   3. Each provider key (OpenAI / Anthropic / Gemini) is encrypted with
 *      that AES key before being written to Supabase.
 *   4. On load, the user unlocks the vault (re-enters the passphrase, or
 *      it's cached in memory only — never in localStorage) and keys are
 *      decrypted in-browser, then used directly against the provider API.
 *
 * The derived CryptoKey is kept in memory (module-level, non-exported)
 * for the session and cleared on logout / tab close.
 */

const PBKDF2_ITERATIONS = 250_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

let sessionVaultKey: CryptoKey | null = null;

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
}

export interface VaultSalt {
  salt: string; // base64, stored per-user in Supabase (safe to store — not secret)
}

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function generateSalt(): VaultSalt {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return { salt: bufToBase64(salt.buffer) };
}

/**
 * Derives the AES-GCM vault key from the passphrase + salt and caches it
 * in memory for the rest of the session. Call this once after "unlocking".
 */
export async function unlockVault(passphrase: string, saltB64: string): Promise<void> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  sessionVaultKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBuf(saltB64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // not extractable — cannot be exported out of the browser process
    ["encrypt", "decrypt"]
  );
}

export function lockVault(): void {
  sessionVaultKey = null;
}

export function isVaultUnlocked(): boolean {
  return sessionVaultKey !== null;
}

export async function encryptApiKey(plaintext: string): Promise<EncryptedPayload> {
  if (!sessionVaultKey) throw new Error("Vault is locked. Call unlockVault() first.");

  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const enc = new TextEncoder();

  const ciphertextBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sessionVaultKey,
    enc.encode(plaintext)
  );

  return {
    ciphertext: bufToBase64(ciphertextBuf),
    iv: bufToBase64(iv.buffer),
  };
}

export async function decryptApiKey(payload: EncryptedPayload): Promise<string> {
  if (!sessionVaultKey) throw new Error("Vault is locked. Call unlockVault() first.");

  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuf(payload.iv) },
    sessionVaultKey,
    base64ToBuf(payload.ciphertext)
  );

  return new TextDecoder().decode(plainBuf);
}

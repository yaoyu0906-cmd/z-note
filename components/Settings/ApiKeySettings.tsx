"use client";

import { useState } from "react";
import { ensureVaultAndUnlock, saveApiKey, deleteApiKey, type Provider } from "@/lib/apiKeys";
import { DEFAULT_MODELS } from "@/lib/ai/providers";
import { isVaultUnlocked } from "@/lib/crypto";

interface ApiKeySettingsProps {
  userId: string;
  selectedModels: Record<Provider, string>;
  onModelChange: (provider: Provider, model: string) => void;
}

const PROVIDERS: Provider[] = ["openai", "anthropic", "gemini"];

export function ApiKeySettings({ userId, selectedModels, onModelChange }: ApiKeySettingsProps) {
  const [passphrase, setPassphrase] = useState("");
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());
  const [keyInputs, setKeyInputs] = useState<Partial<Record<Provider, string>>>({});
  const [status, setStatus] = useState<string>("");

  async function handleUnlock() {
    if (!passphrase) return;
    try {
      await ensureVaultAndUnlock(userId, passphrase);
      setUnlocked(true);
      setStatus("Vault unlocked for this session.");
    } catch (err) {
      setStatus("Could not unlock vault. " + (err as Error).message);
    }
  }

  async function handleSaveKey(provider: Provider) {
    const value = keyInputs[provider];
    if (!value) return;
    try {
      await saveApiKey(userId, provider, value);
      setKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      setStatus(`${provider} key saved (encrypted).`);
    } catch (err) {
      setStatus(`Failed to save ${provider} key: ` + (err as Error).message);
    }
  }

  async function handleDeleteKey(provider: Provider) {
    await deleteApiKey(userId, provider);
    setStatus(`${provider} key removed.`);
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm space-y-3 p-4 border border-line rounded-md bg-white">
        <p className="text-sm text-graphite">
          Set or enter your vault passphrase. This is separate from your login
          password and is never sent to the server — it only ever exists in
          this browser tab.
        </p>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Vault passphrase"
          className="w-full border border-line rounded px-2 py-1.5 text-sm"
        />
        <button
          onClick={handleUnlock}
          className="text-sm px-3 py-1.5 rounded bg-accent text-white hover:opacity-90"
        >
          Unlock vault
        </button>
        {status && <p className="text-xs text-graphite">{status}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4 p-4 border border-line rounded-md bg-white">
      {PROVIDERS.map((provider) => (
        <div key={provider} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{provider}</span>
            <select
              value={selectedModels[provider]}
              onChange={(e) => onModelChange(provider, e.target.value)}
              className="text-xs border border-line rounded px-1.5 py-1"
            >
              {DEFAULT_MODELS[provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInputs[provider] ?? ""}
              onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
              placeholder={`${provider} API key`}
              className="flex-1 border border-line rounded px-2 py-1 text-sm"
            />
            <button
              onClick={() => handleSaveKey(provider)}
              className="text-xs px-2 py-1 rounded border border-line hover:bg-accentSoft"
            >
              Save
            </button>
            <button
              onClick={() => handleDeleteKey(provider)}
              className="text-xs px-2 py-1 rounded border border-line text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      {status && <p className="text-xs text-graphite">{status}</p>}
    </div>
  );
}

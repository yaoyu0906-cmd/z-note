"use client";

import { useState } from "react";
import { ensureVaultAndUnlock, saveApiKey, deleteApiKey, type Provider } from "@/lib/apiKeys";
import { DEFAULT_MODELS } from "@/lib/ai/providers";
import { isVaultUnlocked } from "@/lib/crypto";
import { Button, Input } from "@/components/ui";

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
      <div className="max-w-sm space-y-3 p-4 border border-line dark:border-lineDark rounded-md bg-white dark:bg-surfaceDark">
        <p className="text-sm text-graphite dark:text-graphiteDark">
          Set or enter your vault passphrase. This is separate from your login
          password and is never sent to the server — it only ever exists in
          this browser tab.
        </p>
        <Input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Vault passphrase"
        />
        <Button variant="primary" onClick={handleUnlock}>
          Unlock vault
        </Button>
        {status && <p className="text-xs text-graphite dark:text-graphiteDark">{status}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4 p-4 border border-line dark:border-lineDark rounded-md bg-white dark:bg-surfaceDark">
      {PROVIDERS.map((provider) => (
        <div key={provider} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize text-ink dark:text-inkDark">
              {provider}
            </span>
            <select
              value={selectedModels[provider]}
              onChange={(e) => onModelChange(provider, e.target.value)}
              className="text-xs border border-line dark:border-lineDark rounded px-1.5 py-1 bg-white dark:bg-surfaceDark text-ink dark:text-inkDark"
            >
              {DEFAULT_MODELS[provider].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              value={keyInputs[provider] ?? ""}
              onChange={(e) => setKeyInputs((prev) => ({ ...prev, [provider]: e.target.value }))}
              placeholder={`${provider} API key`}
              className="flex-1"
            />
            <Button size="sm" onClick={() => handleSaveKey(provider)}>
              Save
            </Button>
            <Button size="sm" variant="danger" onClick={() => handleDeleteKey(provider)}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      {status && <p className="text-xs text-graphite dark:text-graphiteDark">{status}</p>}
    </div>
  );
}

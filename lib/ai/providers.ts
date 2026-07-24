/**
 * Direct client -> provider calls. No backend involved, so $0 inference
 * infra cost — the user's own key pays for their own usage.
 *
 * IMPORTANT gotcha: Anthropic's API blocks browser-origin requests by
 * default (CORS). You must send the `anthropic-dangerous-direct-browser-access: true`
 * header, and users should know direct browser calls are officially
 * intended for local/dev use — for a public production app, check
 * Anthropic's current CORS guidance before relying on this in prod.
 */

export type Provider = "openai" | "anthropic" | "gemini";

export interface CompletionRequest {
  provider: Provider;
  apiKey: string;
  model: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

export const DEFAULT_MODELS: Record<Provider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini"],
  anthropic: ["claude-sonnet-4-6", "claude-haiku-4-5"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash"],
};

export async function complete({
  provider,
  apiKey,
  model,
  prompt,
  system,
  maxTokens = 1000,
  signal,
}: CompletionRequest): Promise<string> {
  switch (provider) {
    case "openai":
      return completeOpenAI({ apiKey, model, prompt, system, maxTokens, signal });
    case "anthropic":
      return completeAnthropic({ apiKey, model, prompt, system, maxTokens, signal });
    case "gemini":
      return completeGemini({ apiKey, model, prompt, system, maxTokens, signal });
  }
}

async function completeOpenAI({
  apiKey,
  model,
  prompt,
  system,
  maxTokens,
  signal,
}: Omit<CompletionRequest, "provider">): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function completeAnthropic({
  apiKey,
  model,
  prompt,
  system,
  maxTokens,
  signal,
}: Omit<CompletionRequest, "provider">): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.content?.map((b: { text?: string }) => b.text ?? "").join("") ?? "";
}

async function completeGemini({
  apiKey,
  model,
  prompt,
  system,
  maxTokens,
  signal,
}: Omit<CompletionRequest, "provider">): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
}

import { useCallback, useEffect, useRef, useState } from "react";
import { complete, type Provider } from "@/lib/ai/providers";

interface UseGhostTextOptions {
  provider: Provider;
  apiKey: string | null;
  model: string;
  debounceMs?: number;
  minCharsSinceLastCall?: number;
}

/**
 * Suggests inline completions the way VS Code's ghost text does, but is
 * careful with the user's own API spend:
 *  - debounces so a live API call doesn't fire on every keystroke
 *  - skips re-firing for tiny edits (single chars, backspace) below a
 *    minimum delta
 *  - caches the last suggestion for the same prefix so retyping the same
 *    text doesn't re-trigger a call
 */
export function useGhostText({
  provider,
  apiKey,
  model,
  debounceMs = 500,
  minCharsSinceLastCall = 3,
}: UseGhostTextOptions) {
  const [suggestion, setSuggestion] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPrefixRef = useRef<string>("");
  const cacheRef = useRef<Map<string, string>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const request = useCallback(
    (textBeforeCursor: string) => {
      if (!apiKey) return;

      if (timerRef.current) clearTimeout(timerRef.current);

      const delta = Math.abs(textBeforeCursor.length - lastPrefixRef.current.length);
      if (delta < minCharsSinceLastCall && textBeforeCursor.length > 0) return;

      timerRef.current = setTimeout(async () => {
        const cached = cacheRef.current.get(textBeforeCursor);
        if (cached) {
          setSuggestion(cached);
          return;
        }

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        try {
          const result = await complete({
            provider,
            apiKey,
            model,
            prompt: textBeforeCursor,
            system:
              "Continue the user's text naturally. Return ONLY the continuation, " +
              "no commentary, no repetition of the input. Keep it to one short " +
              "sentence or phrase.",
            maxTokens: 40,
            signal: controller.signal,
          });

          cacheRef.current.set(textBeforeCursor, result);
          lastPrefixRef.current = textBeforeCursor;
          setSuggestion(result);
        } catch (err) {
          if ((err as Error).name !== "AbortError") {
            console.error("Ghost text request failed", err);
          }
        } finally {
          setLoading(false);
        }
      }, debounceMs);
    },
    [apiKey, provider, model, debounceMs, minCharsSinceLastCall]
  );

  const clear = useCallback(() => setSuggestion(""), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { suggestion, loading, request, clear };
}

import type { Provider } from "@/lib/ai/providers";

export interface AIFeatureFlags {
  chat: boolean;
  inline: boolean;
  slashCommands: boolean;
  autocomplete: boolean;
  quickActions: boolean;
}

export const DEFAULT_AI_FEATURE_FLAGS: AIFeatureFlags = {
  chat: true,
  inline: true,
  slashCommands: true,
  autocomplete: true,
  quickActions: true,
};

export interface AIProviderPreference {
  provider: Provider;
  model: string;
  enabled: boolean;
}

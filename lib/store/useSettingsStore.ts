import { create } from "zustand";
import type { ThemeMode } from "@/lib/types/theme";
import { DEFAULT_AI_FEATURE_FLAGS, type AIFeatureFlags } from "@/lib/types/ai";
import type { ShortcutBinding } from "@/lib/types/shortcuts";
import { DEFAULT_SHORTCUTS } from "@/lib/keyboard/shortcuts";
import { DEFAULT_MODELS, type Provider } from "@/lib/ai/providers";

interface SettingsState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;

  aiFeatureFlags: AIFeatureFlags;
  toggleAIFeature: (flag: keyof AIFeatureFlags) => void;

  activeProvider: Provider;
  setActiveProvider: (provider: Provider) => void;
  selectedModels: Record<Provider, string>;
  setModel: (provider: Provider, model: string) => void;

  shortcuts: ShortcutBinding[];
  setShortcut: (id: ShortcutBinding["id"], keys: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: "light",
  setThemeMode: (themeMode) => set({ themeMode }),

  aiFeatureFlags: DEFAULT_AI_FEATURE_FLAGS,
  toggleAIFeature: (flag) =>
    set((state) => ({
      aiFeatureFlags: { ...state.aiFeatureFlags, [flag]: !state.aiFeatureFlags[flag] },
    })),

  activeProvider: "anthropic",
  setActiveProvider: (activeProvider) => set({ activeProvider }),

  selectedModels: {
    openai: DEFAULT_MODELS.openai[0],
    anthropic: DEFAULT_MODELS.anthropic[0],
    gemini: DEFAULT_MODELS.gemini[0],
  },
  setModel: (provider, model) =>
    set((state) => ({ selectedModels: { ...state.selectedModels, [provider]: model } })),

  shortcuts: DEFAULT_SHORTCUTS,
  setShortcut: (id, keys) =>
    set((state) => ({
      shortcuts: state.shortcuts.map((s) => (s.id === id ? { ...s, keys } : s)),
    })),
}));

import { create } from "zustand";
import type { ThemeMode } from "@/lib/types/theme";
import { DEFAULT_AI_FEATURE_FLAGS, type AIFeatureFlags } from "@/lib/types/ai";
import type { ShortcutBinding, CanvasShortcutAction, CanvasShortcutBinding } from "@/lib/types/shortcuts";
import { DEFAULT_SHORTCUTS, DEFAULT_CANVAS_SHORTCUTS } from "@/lib/keyboard/shortcuts";
import { DEFAULT_MODELS, type Provider } from "@/lib/ai/providers";

export interface CanvasSettings {
  /** After finishing a shape/drawing tool, jump back to the Move tool so
   *  the next click doesn't accidentally draw another element. */
  switchToMoveAfterTool: boolean;
  /** Whether arrow keys pan the canvas when nothing is selected. */
  arrowKeyPanEnabled: boolean;
  /** Pixels panned per arrow-key press at 100% zoom (Shift multiplies this). */
  panAmount: number;
}

export const DEFAULT_CANVAS_SETTINGS: CanvasSettings = {
  switchToMoveAfterTool: true,
  arrowKeyPanEnabled: true,
  panAmount: 40,
};

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

  canvasSettings: CanvasSettings;
  setCanvasSetting: <K extends keyof CanvasSettings>(key: K, value: CanvasSettings[K]) => void;

  canvasShortcuts: CanvasShortcutBinding[];
  setCanvasShortcut: (id: CanvasShortcutAction, keys: string) => void;
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

  canvasSettings: DEFAULT_CANVAS_SETTINGS,
  setCanvasSetting: (key, value) =>
    set((state) => ({ canvasSettings: { ...state.canvasSettings, [key]: value } })),

  canvasShortcuts: DEFAULT_CANVAS_SHORTCUTS,
  setCanvasShortcut: (id, keys) =>
    set((state) => ({
      canvasShortcuts: state.canvasShortcuts.map((s) => (s.id === id ? { ...s, keys } : s)),
    })),
}));

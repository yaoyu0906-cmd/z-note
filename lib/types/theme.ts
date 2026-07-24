export type ThemeMode = "light" | "dark" | "custom";

export interface ThemeTokens {
  bg: string;
  surface: string;
  fg: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
}

export interface Theme {
  id: string;
  name: string;
  mode: ThemeMode;
  tokens: ThemeTokens;
}

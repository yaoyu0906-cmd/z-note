import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1D1F",
        paper: "#FAFAF8",
        graphite: "#6B6F76",
        line: "#E4E4E0",
        accent: "#2F5D50", // deep pine — deliberate choice, not the default terracotta
        accentSoft: "#E4EDE9",
        // Dark-mode counterparts, applied via `dark:` variants. Kept as
        // separate named tokens (rather than mutating the ones above) so
        // light-mode usage elsewhere in the app is unaffected.
        inkDark: "#EDEEF0",
        paperDark: "#17181B",
        surfaceDark: "#1F2124",
        graphiteDark: "#9297A0",
        lineDark: "#2C2E32",
        accentSoftDark: "#1E2B27",
        accentDark: "#6FB79E", // muted pine for readable accent text on dark surfaces
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

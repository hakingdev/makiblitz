import type { Config } from "tailwindcss";

/**
 * MakiLove — design tokens from the Figma file
 * "MakiLove — Sushi Restaurant · Tischreservierung" (Components · MakiLove, 3:2).
 * Light "paper" theme with a red accent. Radii use the Tailwind defaults that
 * match the Figma tokens: rounded-lg = 8, rounded-2xl = 16, rounded-3xl = 24.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#211D1B", // --text-ink
        muted: "#706864", // --text-muted
        brand: {
          DEFAULT: "#D91F2D", // --surface-red / --text-red / --border-red
          dark: "#B41624", // --surface-darkred (primary hover)
        },
        paper: "#FFFCF8", // --surface-paper
        blush: "#F9EBE7", // --surface-blush
        line: "#E7DED8", // --surface-line / --border-line
      },
      fontFamily: {
        sans: ["var(--font-mulish)", "system-ui", "sans-serif"],
        script: ["var(--font-rock-salt)", "cursive"],
      },
      maxWidth: {
        page: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;

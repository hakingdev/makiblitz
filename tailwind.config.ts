import type { Config } from "tailwindcss";

/**
 * Makiblitz — design tokens extracted from the Figma kit
 * "Sushi Resto Mobile Apps UI Kit" (node 21:44).
 * Dark premium theme with a red accent gradient.
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
        // Dark surface scale (from the background gradient #2A2C31 -> #16171A)
        ink: {
          DEFAULT: "#16171A",
          900: "#16171A",
          800: "#1D1F23",
          700: "#2A2C31",
          600: "#34363C",
          500: "#4B4E55",
        },
        // Brand red (accent gradient #D42028 -> #770110)
        brand: {
          DEFAULT: "#D42028",
          light: "#E63A41",
          500: "#D42028",
          600: "#A50C18",
          700: "#770110",
        },
        cream: "#F7F7F8",
      },
      backgroundImage: {
        "ink-gradient":
          "linear-gradient(156deg, #2A2C31 28%, #16171A 100%)",
        "brand-gradient":
          "linear-gradient(160deg, #D42028 28%, #770110 100%)",
        "brand-gradient-v":
          "linear-gradient(177deg, #D42028 28%, #770110 100%)",
        "card-glow":
          "linear-gradient(89deg, #D42028 2%, rgba(119,1,16,0) 110%)",
      },
      fontFamily: {
        sans: ["var(--font-mulish)", "system-ui", "sans-serif"],
        display: ["var(--font-rock-salt)", "cursive"],
      },
      borderRadius: {
        card: "13px",
        pill: "17px",
        chip: "25px",
      },
      boxShadow: {
        brand: "0 12px 30px -8px rgba(212,32,40,0.45)",
        card: "0 18px 40px -20px rgba(0,0,0,0.6)",
      },
      maxWidth: {
        shell: "1200px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
      },
    },
  },
  plugins: [],
};

export default config;

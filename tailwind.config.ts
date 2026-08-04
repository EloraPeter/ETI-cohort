import type { Config } from "tailwindcss";

/**
 * ETI design tokens
 * ------------------------------------------------------------------
 * Color:  ink (near-black navy background), two brand gradients
 *         (signal blue → violet), and a warm paper white for
 *         light sections. Named, not generic "primary/secondary".
 * Type:   Space Grotesk (display, geometric/technical) for
 *         headlines, Inter for body copy, IBM Plex Mono for code,
 *         prices, week numbers, and anything that reads as "data".
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#05070D",
          900: "#0B0F1A",
          800: "#111629",
          700: "#171D35",
          600: "#232B4A",
        },
        signal: {
          400: "#5B8CFF",
          500: "#3D6FFF",
          600: "#2951E0",
        },
        violet: {
          400: "#A985FF",
          500: "#8B5CF6",
          600: "#6D3FDB",
        },
        paper: {
          50: "#FBFAFF",
          100: "#F3F1FB",
          200: "#E7E4F6",
        },
        mist: "#8C93B8",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "signal-violet": "linear-gradient(115deg, #3D6FFF 0%, #8B5CF6 55%, #C084FC 100%)",
        "glow-radial": "radial-gradient(circle at 50% 0%, rgba(91,140,255,0.25), transparent 60%)",
        "grid-lines": "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(8,10,20,0.35)",
        "glow-blue": "0 0 60px rgba(61,111,255,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        "fade-up": "fade-up 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;

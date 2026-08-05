import type { Config } from "tailwindcss";

/**
 * ETI Brand Identity System v1.0 — design tokens
 * ------------------------------------------------------------------
 * Token families keep their original names (ink/signal/paper/mist)
 * so existing components restyle automatically, but every value now
 * maps to the brand system: ETI Navy, ETI Royal Blue, ETI Gold,
 * ETI Sky Blue, plus the success/warning/error and neutral scale.
 * Fonts: Sora (display), Inter (body), JetBrains Mono (code/tags).
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
        // ETI Navy scale — headings, nav, footer, dark sections, text-primary
        ink: {
          950: "#020617", // background dark
          900: "#0F172A", // ETI Navy / text-primary
          800: "#16213A",
          700: "#1E293B",
          600: "#334155",
        },
        // ETI Royal Blue — primary buttons, links, active states
        signal: {
          400: "#3B82F6",
          500: "#1D4ED8", // ETI Royal Blue
          600: "#1E40AF",
        },
        // ETI Sky Blue — gradients, hover states, decorative elements
        sky: {
          400: "#38BDF8", // ETI Sky Blue
          500: "#0EA5E9",
        },
        // ETI Gold — highlights, badges, achievements, premium elements
        gold: {
          400: "#FBBF24",
          500: "#F59E0B", // ETI Gold
          600: "#D97706",
        },
        success: { DEFAULT: "#22C55E" },
        warning: { DEFAULT: "#F97316" },
        error: { DEFAULT: "#EF4444" },
        paper: {
          50: "#F8FAFC", // background light
          100: "#FFFFFF", // surface
          200: "#E2E8F0", // card border
        },
        mist: "#94A3B8", // text-muted
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"], // Sora
        body: ["var(--font-body)", "sans-serif"], // Inter
        mono: ["var(--font-mono)", "monospace"], // JetBrains Mono
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(115deg, #0F172A 0%, #1D4ED8 55%, #38BDF8 100%)",
        "glow-radial": "radial-gradient(circle at 50% 0%, rgba(29,78,216,0.25), transparent 60%)",
        "grid-lines": "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      boxShadow: {
        // Brand shadow system — sm: inputs/small cards, md: cards, lg: hero sections
        sm: "0 2px 8px rgba(15,23,42,.06)",
        md: "0 10px 30px rgba(15,23,42,.08)",
        lg: "0 25px 60px rgba(15,23,42,.12)",
        glass: "0 8px 32px rgba(2,6,23,0.35)",
        "glow-blue": "0 0 60px rgba(29,78,216,0.25)",
      },
      borderRadius: {
        xl2: "1.25rem", // 20px — card radius
        hero: "2rem", // 32px — hero sections
      },
      spacing: {
        18: "4.5rem",
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

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bone: "#F2F1EC",
        ink: "#191913",
        "ink-soft": "#41403a",
        // Small print — 10-11px mono captions, eyebrows, placeholder text —
        // on the bone background. #6E6D63 measured 4.59:1, which clears the
        // 4.5:1 AA floor by 0.09 and no more, at the smallest size on the
        // site. #5C5B52 is 6.06:1. Only ever used on bone or on a white
        // card; dark surfaces use their own literal (#8b8a80).
        muted: "#5C5B52",
        card: "#FFFFFF",
        line: "#DEDCD2",
        marigold: "#F5A300",
        // Large display type on the bone background. 3.19:1 — clears the WCAG AA
        // bar for text at/above 24px (or 18.66px bold), which is every place it
        // is used. #D98E00 measured 2.37:1 and failed even that.
        "marigold-deep": "#B87A00",
        // Small text on bone: links, wordmarks, 11px labels. 5.24:1.
        "marigold-ink": "#8A5A00",
        // Non-text only: the pulsing dot and any solid fill. At 3.14:1 it must
        // never carry copy on the bone background.
        live: "#FF3B30",
        // The text-safe red, for error messages and small LIVE labels. 4.84:1.
        "live-ink": "#C92A1E",
      },
      fontFamily: {
        display: ["var(--font-bricolage)", "sans-serif"],
        body: ["var(--font-instrument)", "sans-serif"],
        mono: ["var(--font-space-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      keyframes: {
        pulse2: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".45", transform: "scale(.8)" },
        },
      },
      animation: {
        pulse2: "pulse2 1.6s infinite",
      },
    },
  },
  plugins: [],
};
export default config;

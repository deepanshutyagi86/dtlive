import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bone: "#F2F1EC",
        ink: "#191913",
        "ink-soft": "#41403a",
        muted: "#8b8a80",
        card: "#FFFFFF",
        line: "#DEDCD2",
        marigold: "#F5A300",
        "marigold-deep": "#D98E00",
        live: "#FF3B30",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
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

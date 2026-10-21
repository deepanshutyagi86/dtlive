import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";

// The V4 homepage type system. Scoped to the homepage on purpose: the rest
// of the site still sets Bricolage / Instrument Sans / Space Mono from the
// root layout, so these three only download on "/".
export const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--v4-sans",
  display: "swap",
});

export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--v4-serif",
  display: "swap",
});

// Small caps-style labels only — never the LCP, so no preload race.
export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--v4-mono",
  display: "swap",
  preload: false,
});

export const V4_FONT_VARS = `${interTight.variable} ${instrumentSerif.variable} ${jetbrains.variable}`;

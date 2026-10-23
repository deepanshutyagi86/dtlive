import { V4_FONT_VARS } from "@/components/v4/fonts";
import "./admin.css";

// One wrapper for every admin screen, login included. It puts the admin on
// the homepage's type system (Inter Tight / Instrument Serif / JetBrains
// Mono) by re-pointing the three font variables the Tailwind classes read,
// so every existing `font-display` / `font-mono` in the panel switches
// over without touching a single className.
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className={`adm ${V4_FONT_VARS}`}>{children}</div>;
}

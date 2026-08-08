import Link from "next/link";
import LiveClock from "./LiveClock";

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-bone/85 backdrop-blur-md">
      <Link href="/" className="font-display font-extrabold text-[17px] tracking-tight text-ink">
        DT<span className="text-marigold-deep">.live</span>
      </Link>
      <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-muted tracking-wider">
        <span className="w-[7px] h-[7px] rounded-full bg-live live-dot" />
        <LiveClock />
        <span>· NEW DELHI</span>
      </div>
      <Link
        href="/agency"
        className="inline-flex items-center gap-2 font-semibold text-sm bg-ink text-bone px-[18px] py-[10px] rounded-full border border-ink hover:bg-marigold hover:border-marigold hover:text-ink transition-colors"
      >
        Let&apos;s talk
      </Link>
    </nav>
  );
}

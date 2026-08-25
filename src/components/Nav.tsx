import Link from "next/link";
import LiveClock from "./LiveClock";
import MobileMenu from "./MobileMenu";
import NavDarkWatcher from "./NavDarkWatcher";
import NavLogo from "./NavLogo";
import type { NavSettings } from "@/lib/settings-types";
import { DEFAULT_NAV } from "@/lib/settings-types";

// `nav` is optional so a surface that hasn't been threaded through yet
// still renders the default set rather than an empty bar. Every page that
// can afford the extra settings read should pass it.
export default function Nav({ nav = DEFAULT_NAV }: { nav?: NavSettings }) {
  const links = nav.links.filter((l) => l.show);

  return (
    <nav className="site-nav fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-5 py-3 border-b border-line backdrop-blur-md">
      <NavDarkWatcher />
      <div className="flex items-center gap-6 min-w-0">
        <NavLogo />

        {/* lg:, not md: — at 768px the links and the clock and the CTA all
            fit only by crushing each other. The clock is the thing that
            gives way first, below. */}
        <div className="hidden lg:flex items-center gap-5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-[var(--nav-fg-soft)] hover:text-[var(--nav-fg)] transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-2 font-mono text-[11px] text-[var(--nav-fg-soft)] tracking-wider">
        <span className="w-[7px] h-[7px] rounded-full bg-live live-dot" />
        <LiveClock />
        <span>· NEW DELHI</span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={nav.ctaHref}
          className="inline-flex items-center gap-2 font-semibold text-sm bg-[var(--nav-cta-bg)] text-[var(--nav-cta-fg)] px-[18px] py-[10px] rounded-full border border-[var(--nav-cta-bg)] hover:bg-marigold hover:border-marigold hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
        >
          {nav.ctaLabel}
        </Link>
        <MobileMenu links={links} />
      </div>
    </nav>
  );
}

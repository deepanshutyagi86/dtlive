"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Clicking the logo while already on "/" used to still be a route
// navigation — a hard, instant jump to the top with no transition, on a
// page you're already looking at. If we're already home, scroll there
// instead of asking Next to re-render the same route from scratch.
export default function NavLogo() {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/") return;
    e.preventDefault();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }

  return (
    <Link
      href="/"
      onClick={handleClick}
      className="font-display font-extrabold text-[17px] tracking-tight text-[var(--nav-fg)] shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
    >
      DT<span className="text-[var(--nav-accent)]">.live</span>
    </Link>
  );
}

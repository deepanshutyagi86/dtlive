"use client";
import { useEffect, useRef } from "react";

// Drop this anywhere inside the sticky <nav> — it finds its own ancestor
// via .closest() rather than taking a ref prop, so the same component works
// for both nav markups on the site (Nav.tsx and the item page's own bar).
//
// Watches every [data-nav-dark] section with an IntersectionObserver whose
// root is shrunk to just the nav's own height at the top of the viewport,
// so a section only counts as "under the nav" when it actually overlaps
// the bar. Toggles .nav-dark the instant that changes — no debounce on the
// toggle itself, so a fast scroll flips as fast as the sections pass,
// while the ~200ms colour fade (globals.css, skipped under
// prefers-reduced-motion) is what keeps it from reading as a strobe.
export default function NavDarkWatcher() {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = markerRef.current?.closest("nav");
    if (!nav) return;

    let observer: IntersectionObserver | null = null;
    const intersecting = new Set<Element>();

    function apply() {
      nav!.classList.toggle("nav-dark", intersecting.size > 0);
    }

    function build() {
      observer?.disconnect();
      intersecting.clear();
      const navHeight = nav!.getBoundingClientRect().height;
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) intersecting.add(entry.target);
            else intersecting.delete(entry.target);
          }
          apply();
        },
        { rootMargin: `0px 0px -${Math.max(window.innerHeight - navHeight, 0)}px 0px`, threshold: 0 }
      );
      document.querySelectorAll("[data-nav-dark]").forEach((el) => observer!.observe(el));
    }

    build();

    let resizeId: number;
    function onResize() {
      window.clearTimeout(resizeId);
      resizeId = window.setTimeout(build, 150);
    }
    window.addEventListener("resize", onResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeId);
    };
  }, []);

  return <span ref={markerRef} aria-hidden className="hidden" />;
}

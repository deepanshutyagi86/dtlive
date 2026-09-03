"use client";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { fbTrack } from "@/lib/fbq";

/**
 * App Router client-side navigation never reloads the document, so the
 * inline `fbq('track', 'PageView')` in layout.tsx's init script — which
 * only ever runs once, on that first load — never fires again on a route
 * change. Without this, a visitor who lands on /w/claude-workshop and then
 * navigates client-side (rare on this ad page, which has no nav, but real
 * on the rest of the site) produces one PageView for a session that may
 * cover several pages.
 *
 * useSearchParams needs a Suspense boundary to opt out of the surrounding
 * tree's static render rather than failing the build — see
 * https://nextjs.org/docs/app/api-reference/functions/use-search-params.
 * The boundary is scoped to just this tracker, not the page content, so it
 * does not touch /w/[slug]'s own force-static rendering (see the comment
 * on that route's `dynamic` export for why that matters here specifically).
 */
function RouteChangeTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Skips the very first render: that PageView already came from layout.tsx's
  // init script, and firing it twice on initial load would double-count.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fbTrack("PageView");
  }, [pathname, searchParams]);

  // If you're staring at facebook.com/tr traffic wondering why a cold load
  // shows two PageView-tagged requests: that's Meta's own fbevents.js, not
  // this component. Verified live — a manually fired, single
  // fbq('track','PageView') reproduces the exact same pair (one minimal
  // request with &noscript=1, one full beacon with a Meta-generated
  // `ob3_plugin-set_...` eid, NOT ours), while a second manual call on the
  // SAME url produces zero further requests (Meta dedupes PageView per-URL
  // internally) and a call after a real URL change produces exactly one.
  // This component's isFirstRender guard above was already correct before
  // that check; don't chase this pattern as a re-fire bug again.

  return null;
}

export default function MetaPixelRouteTracker() {
  return (
    <Suspense fallback={null}>
      <RouteChangeTracker />
    </Suspense>
  );
}

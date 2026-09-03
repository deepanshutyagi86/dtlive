// The one place the Meta Pixel ID is read. Every pixel/CAPI call site
// imports from here — never `process.env.*_PIXEL_ID` directly — so there is
// exactly one place that can ever disagree with itself.
//
// Two constants, not one, because the browser pixel and the server-side
// Conversions API call are genuinely different audiences: NEXT_PUBLIC_ vars
// are the ones Next.js is willing to put in front of a browser, and
// META_PIXEL_ID (no prefix) is the one that never leaves the server. If
// they are ever set to different values, Meta cannot match a browser
// Purchase event to its CAPI mirror by event_id, and BOTH get counted —
// every sale doubles in Ads Manager. The warning below exists to catch
// that before it reaches production.
//
// No hardcoded pixel ID lives here, or anywhere else in this codebase, as a
// fallback — a missing env var means tracking silently no-ops, never a
// wrong-but-present ID quietly sending real traffic to someone else's
// dataset.
export const META_PIXEL_ID_CLIENT = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
export const META_PIXEL_ID_SERVER = process.env.META_PIXEL_ID ?? "";

if (
  process.env.NODE_ENV !== "production" &&
  META_PIXEL_ID_CLIENT &&
  META_PIXEL_ID_SERVER &&
  META_PIXEL_ID_CLIENT !== META_PIXEL_ID_SERVER
) {
  console.warn(
    "Meta Pixel ID mismatch — Purchase dedup will fail. " +
      `NEXT_PUBLIC_META_PIXEL_ID=${META_PIXEL_ID_CLIENT} but META_PIXEL_ID=${META_PIXEL_ID_SERVER}. ` +
      "The browser pixel and the server-side Conversions API call must share the same pixel ID."
  );
}

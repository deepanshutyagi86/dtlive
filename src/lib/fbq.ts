// Thin, guarded wrapper around the Meta Pixel's global `fbq`. Every call
// site fires events through this rather than `window.fbq` directly, so the
// "has the pixel loaded" guard and the eventID plumbing live in one place.
//
// fbq itself is injected by the inline init script in layout.tsx, gated on
// META_PIXEL_ID_CLIENT (see meta-config.ts) being configured — when it
// isn't, that script never runs, window.fbq never exists, and every call
// here is a no-op.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a Meta Pixel event. Silently does nothing if fbq hasn't loaded —
 * before the init script runs, on a page where the Pixel isn't configured,
 * or server-side — so no call site needs its own readiness check.
 *
 * `eventID` is Meta's browser/server dedup key: pass the same value to a
 * matching server-side Conversions API call (see meta-capi.ts) and Meta
 * folds the two into one event instead of double-counting.
 */
export function fbTrack(event: string, params?: Record<string, unknown>, eventID?: string): void {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventID) {
    window.fbq("track", event, params ?? {}, { eventID });
  } else {
    window.fbq("track", event, params ?? {});
  }
}

/**
 * A random id for events with no natural stable identifier to dedup on
 * (unlike Purchase/Lead, which already use the order/lead id — see
 * MetaPixelPurchase.tsx and RegisterModal.tsx, and must keep using those,
 * not this, since a server-side CAPI mirror already keys on that same id).
 */
export function genEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older Safari).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

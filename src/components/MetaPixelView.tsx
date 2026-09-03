"use client";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";
import { fbTrack } from "@/lib/fbq";

/**
 * Fires ViewContent, and records where this visitor came from.
 *
 * ViewContent is what lets Meta optimise for people who actually look at a
 * course rather than people who merely load the homepage — without it, a
 * campaign has only PageView to learn from, which every bounce also
 * produces. It is the single cheapest improvement available to an ad
 * account that is already running.
 *
 * The attribution capture rides along here because this component is
 * already mounted on exactly the pages an ad points at, and first touch
 * has to be recorded on arrival — by the time someone opens the checkout,
 * the query string is long gone.
 */
export default function MetaPixelView({
  contentId,
  contentName,
  contentType = "product",
  value,
}: {
  contentId: string;
  contentName: string;
  contentType?: string;
  value?: number;
}) {
  useEffect(() => {
    captureAttribution();

    // Once per item per tab. Next's client-side navigation can remount
    // this on a back-and-forward without a real new view, and a doubled
    // ViewContent quietly corrupts the per-ad numbers it exists to feed.
    const key = `fbq_view_${contentId}`;
    if (typeof window === "undefined" || !window.fbq) return;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage blocked: fire anyway. A possible duplicate is a better
      // failure than no signal at all.
    }

    fbTrack("ViewContent", {
      content_ids: [contentId],
      content_name: contentName,
      content_type: contentType,
      ...(value !== undefined ? { value, currency: "INR" } : {}),
    });
  }, [contentId, contentName, contentType, value]);

  return null;
}

"use client";
import { useEffect } from "react";
import { fbTrack } from "@/lib/fbq";

export default function MetaPixelPurchase({
  orderId,
  value,
  itemId,
  itemName,
}: {
  orderId: string;
  value: number;
  itemId: string;
  itemName: string;
}) {
  useEffect(() => {
    // Hard early return, not a falsy-param that still fires: an
    // absent/empty orderId must make this a no-op, full stop, before
    // touching sessionStorage or fbq at all. This is what stands between
    // "mount this anywhere" and a Purchase with no order behind it — see
    // the dedup key below, which is only meaningful for a real id.
    if (!orderId) return;

    // Guards against re-firing on refresh — this same confirmation page
    // can poll Razorpay and re-render "paid" on every reload.
    const firedKey = `fbq_purchase_${orderId}`;
    if (typeof window === "undefined" || typeof window.fbq !== "function" || sessionStorage.getItem(firedKey)) return;

    // eventID is the order id, not a fresh genEventId() — sendMetaPurchaseEvent
    // in meta-capi.ts uses this same order id as the server-side CAPI
    // event_id, and the two only dedupe into one event if they match.
    fbTrack(
      "Purchase",
      {
        value,
        currency: "INR",
        content_ids: [itemId],
        content_name: itemName,
        content_type: "product",
      },
      orderId
    );
    sessionStorage.setItem(firedKey, "1");
  }, [orderId, value, itemId, itemName]);

  return null;
}

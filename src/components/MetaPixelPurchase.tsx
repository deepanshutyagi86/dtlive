"use client";
import { useEffect } from "react";
import { fbTrack } from "@/lib/fbq";

export default function MetaPixelPurchase({ orderId, value }: { orderId: string; value: number }) {
  useEffect(() => {
    // Guards against re-firing on refresh — this same confirmation page
    // can poll Razorpay and re-render "paid" on every reload.
    const firedKey = `fbq_purchase_${orderId}`;
    if (typeof window === "undefined" || typeof window.fbq !== "function" || sessionStorage.getItem(firedKey)) return;

    // eventID is the order id, not a fresh genEventId() — sendMetaPurchaseEvent
    // in meta-capi.ts uses this same order id as the server-side CAPI
    // event_id, and the two only dedupe into one event if they match.
    fbTrack("Purchase", { value, currency: "INR" }, orderId);
    sessionStorage.setItem(firedKey, "1");
  }, [orderId, value]);

  return null;
}

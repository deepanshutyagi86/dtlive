"use client";
import { useEffect } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function MetaPixelPurchase({ orderId, value }: { orderId: string; value: number }) {
  useEffect(() => {
    // Guards against re-firing on refresh — this same confirmation page
    // polls Cashfree and re-renders "paid" on every reload.
    const firedKey = `fbq_purchase_${orderId}`;
    if (typeof window === "undefined" || !window.fbq || sessionStorage.getItem(firedKey)) return;

    window.fbq(
      "track",
      "Purchase",
      { value, currency: "INR" },
      { eventID: orderId }
    );
    sessionStorage.setItem(firedKey, "1");
  }, [orderId, value]);

  return null;
}

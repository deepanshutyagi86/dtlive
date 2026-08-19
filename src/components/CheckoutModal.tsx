"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ItemImage from "./ItemImage";
import { useModalBehavior } from "@/lib/useModalBehavior";
import type { Category, ImageFocal } from "@/lib/types";
import type { RazorpayHandlerResponse } from "@/types/razorpay";

// Injects the Razorpay checkout script once, lazily — same reasoning as
// the old dynamic import of the Cashfree SDK, the homepage shouldn't pay
// for it. Guarded so reopening the modal doesn't re-inject.
function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load payment gateway. Try again."));
    document.body.appendChild(script);
  });
}

export default function CheckoutModal({
  itemId,
  title,
  slug,
  category,
  thumbnail,
  imageFocal,
  priceLabel,
  triggerClassName,
  triggerLabel,
}: {
  itemId: string;
  title: string;
  slug: string;
  category: Category;
  thumbnail: string | null;
  imageFocal?: ImageFocal | null;
  priceLabel: string;
  triggerClassName: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Portal target (document.body) only exists client-side; without this
  // guard, SSR/hydration would try to render into a nonexistent node.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useModalBehavior({ open, onClose: () => setOpen(false), panelRef, triggerRef });

  // Meta Pixel drops these cookies itself; forwarding them lets the
  // server-side Conversions API call match the same browser/click as the
  // fbq() Purchase event fired on the confirmation page.
  function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  async function pay() {
    setError(null);
    if (!form.name || !form.email || !form.phone) {
      setError("Please fill in all three fields.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          ...form,
          fbc: readCookie("_fbc"),
          fbp: readCookie("_fbp"),
          eventSourceUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      await loadRazorpayScript();

      const razorpay = new window.Razorpay({
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: "INR",
        order_id: data.razorpayOrderId,
        name: "Deepanshu Tyagi",
        description: title,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#F5A300" },
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                orderId: data.orderId,
              }),
            });
            if (!verifyRes.ok) throw new Error();
            window.location.href = `/order/confirmed?order_id=${data.orderId}`;
          } catch {
            // The buyer HAS been charged at this point — the message must
            // never imply the payment itself failed.
            setError(
              "Payment received but confirmation is still pending — check your email, or message me with this order ID."
            );
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            // Buyer closed the popup without paying — not an error, let
            // them retry from the still-open modal.
            setLoading(false);
          },
        },
      });
      razorpay.open();
    } catch (e: any) {
      setError(e.message ?? "Payment could not start. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {/* Portalled to document.body on purpose, and this is load-bearing in
          two separate ways. (1) Position: both triggers sit inside a fixed
          bar — the desktop nav uses backdrop-blur, which makes that nav the
          containing block for any position:fixed descendant, so an inline
          overlay would center itself on a ~50px-tall bar instead of the
          viewport and hang off the top of the screen. (2) Color: the mobile
          bar sets text-bone, and the inputs below inherit their text color,
          so typed text rendered near-white on a bone panel while the
          explicitly-colored placeholder stayed dark. Escaping to <body>
          fixes both; the explicit text-ink on the inputs is belt-and-braces
          so neither can regress if a future trigger lands somewhere dark. */}
      {mounted && open && createPortal(
        <div
          className="fixed inset-0 bg-ink/55 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="bg-bone text-ink rounded-card w-full max-w-[420px] max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="relative flex-none">
              <ItemImage
                thumbnail={thumbnail}
                title={title}
                category={category}
                seed={slug}
                sizes="(min-width: 480px) 420px, 90vw"
                imageFocal={imageFocal}
              />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="absolute top-3 right-3 w-11 h-11 rounded-full bg-ink/60 backdrop-blur-sm text-bone flex items-center justify-center text-2xl leading-none hover:bg-ink transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <h3 className="font-display font-extrabold text-[22px] tracking-tight">{title}</h3>
              <p className="font-mono text-[11px] text-muted mt-1.5 mb-5">{priceLabel}</p>

              {(["name", "email", "phone"] as const).map((field) => (
                <div className="mb-3.5" key={field}>
                  <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
                    {field === "name" ? "Full name" : field}
                  </label>
                  <input
                    type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    placeholder={field === "phone" ? "e.g. 9870600903" : field === "email" ? "e.g. you@example.com" : "e.g. Deepanshu"}
                    className="w-full px-3.5 py-3.5 text-[16px] text-ink bg-card border border-line rounded-[10px] placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
                  />
                </div>
              ))}

              {error && <p className="text-live text-sm mb-3">{error}</p>}

              <button
                onClick={pay}
                disabled={loading}
                className="w-full py-4 rounded-full bg-marigold text-ink font-semibold text-[16px] hover:bg-ink hover:text-bone transition-colors disabled:opacity-60"
              >
                {loading ? "Starting payment…" : `Proceed to pay ${priceLabel} →`}
              </button>
              <div className="flex items-center justify-center gap-2 font-mono text-[10.5px] text-muted mt-3.5">
                🔒 Secured by Razorpay · GST-registered seller
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

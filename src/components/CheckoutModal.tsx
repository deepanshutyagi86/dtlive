"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import ModalShell from "./ModalShell";
import ModalHeroHeader from "./ModalHeroHeader";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { useModalViewport, HERO_COLLAPSE_HEIGHT, scrollFieldIntoView } from "@/lib/useModalViewport";
import { isValidEmail, isValidPhone, stripToPhoneChars } from "@/lib/validate";
import { formatRupees, isValidGstin } from "@/lib/tax";
import { GST_STATES, type TaxSettings } from "@/lib/settings-types";
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

interface Quote {
  discount: number;
  /**
   * The discount expressed in tax-exclusive rupees. Equal to `discount` in
   * exclusive mode; in inclusive mode the coupon came off a tax-inclusive
   * price, so its taxable share is smaller. Rendering `discount` directly
   * made the breakdown fail to add up.
   */
  discountTaxable: number;
  taxableValue: number;
  taxTotal: number;
  ratePercent: number;
  taxApplied: boolean;
  intraState: boolean;
  payable: number;
  listPrice: number;
}

const FIELDS = [
  { key: "name" as const, label: "Full name", type: "text", placeholder: "e.g. Deepanshu", mode: "text" as const },
  { key: "email" as const, label: "Email", type: "email", placeholder: "e.g. you@example.com", mode: "email" as const },
  { key: "phone" as const, label: "Phone", type: "tel", placeholder: "e.g. 98765 43210", mode: "tel" as const },
];

export default function CheckoutModal({
  itemId,
  title,
  slug,
  category,
  thumbnail,
  imageFocal,
  priceLabel,
  tax,
  gstin,
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
  /** Drives the breakdown and whether the GSTIN block is offered at all. */
  tax: TaxSettings;
  /** The seller's own GSTIN, from getBusinessSettings() — never hardcoded. */
  gstin: string;
  triggerClassName: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "email" | "phone", string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coupon state. `applied` holds the server's verified preview; the real
  // discount is recomputed server-side at create-order, so nothing here is
  // trusted for money.
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponChecking, setCouponChecking] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  // The server's own breakdown, fetched on open and re-fetched whenever the
  // coupon or the GSTIN changes. The modal never does its own arithmetic —
  // it renders whatever create-order is going to charge.
  const [quote, setQuote] = useState<Quote | null>(null);
  const [applied, setApplied] = useState<{ code: string; label: string } | null>(null);

  const [gstOpen, setGstOpen] = useState(false);
  const [gst, setGst] = useState({ gstin: "", legalName: "", stateCode: "" });
  const [gstError, setGstError] = useState<string | null>(null);

  // Portal target (document.body) only exists client-side; without this
  // guard, SSR/hydration would try to render into a nonexistent node.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Stable per-instance prefix so every label's htmlFor matches exactly one
  // input, even with several checkout modals mounted on the same page
  // (the item page mounts three).
  const uid = useId();

  useModalBehavior({ open, onClose: () => setOpen(false), panelRef, triggerRef });
  const viewport = useModalViewport(open);
  const showImage = viewport.height >= HERO_COLLAPSE_HEIGHT;

  // Meta Pixel drops these cookies itself; forwarding them lets the
  // server-side Conversions API call match the same browser/click as the
  // fbq() Purchase event fired on the confirmation page.
  function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  const payable = quote ? quote.payable : null;
  const payLabel = payable !== null ? `₹${formatRupees(payable)}` : priceLabel;

  // Fetches the authoritative breakdown. Called on open with no code so the
  // buyer sees the GST line before they type anything, and again on every
  // change that could move the number.
  const refreshQuote = useCallback(
    async (code: string | null, gstDetails: typeof gst | null): Promise<Quote | null> => {
      try {
        const res = await fetch("/api/checkout/apply-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, code: code ?? "", buyerGst: gstDetails }),
        });
        const data = (await res.json()) as Quote & { ok: boolean; reason?: string };
        if (!data.ok && code) return null;
        setQuote(data);
        return data;
      } catch {
        return null;
      }
    },
    [itemId]
  );

  // Open with a fresh quote so the GST line is correct from the first
  // render, rather than appearing only after someone tries a coupon.
  useEffect(() => {
    if (!open) return;
    refreshQuote(applied?.code ?? null, gstOpen ? gst : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function validate(): boolean {
    const next: Partial<Record<"name" | "email" | "phone", string>> = {};
    if (!form.name.trim()) next.name = "Your name, please.";
    if (!form.email.trim()) next.email = "We need this to send your confirmation.";
    else if (!isValidEmail(form.email)) next.email = "That doesn't look right — check for a typo.";
    if (!form.phone.trim()) next.phone = "We need this to reach you.";
    else if (!isValidPhone(form.phone)) next.phone = "10 digits, or include the country code.";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function checkCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponChecking(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/checkout/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, code, buyerGst: gstOpen ? gst : null }),
      });
      const data = await res.json();
      if (data.ok && data.code) {
        setApplied({ code: data.code, label: data.label ?? "" });
        setQuote(data);
        setCouponError(null);
      } else {
        setApplied(null);
        setCouponError(data.reason || "That code isn't valid.");
        // Re-price without the code so the total on the button goes back to
        // the undiscounted one instead of silently keeping a stale figure.
        refreshQuote(null, gstOpen ? gst : null);
      }
    } catch {
      setCouponError("Couldn't check that code. Try again.");
    } finally {
      setCouponChecking(false);
    }
  }

  // A GSTIN can change the tax SPLIT (IGST instead of CGST+SGST) but never
  // the total, so this re-prices rather than just validating locally.
  async function applyGstDetails() {
    const value = gst.gstin.trim().toUpperCase();
    if (value && !isValidGstin(value)) {
      setGstError("That doesn't look like a valid GSTIN — 15 characters, e.g. 09ABCDE1234F1Z5.");
      return;
    }
    setGstError(null);
    // The state code is the first two characters of a GSTIN by definition,
    // so it is derived rather than asked for twice.
    const next = { ...gst, gstin: value, stateCode: value ? value.slice(0, 2) : gst.stateCode };
    setGst(next);
    await refreshQuote(applied?.code ?? null, next);
  }

  async function pay() {
    setError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          ...form,
          couponCode: applied?.code ?? null,
          buyerGst: tax.b2bEnabled && gst.gstin.trim() ? gst : null,
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

      <ModalShell
        open={open}
        mounted={mounted}
        onClose={() => setOpen(false)}
        panelRef={panelRef}
        ariaLabel={title}
        header={
          <ModalHeroHeader
            thumbnail={thumbnail}
            title={title}
            category={category}
            seed={slug}
            imageFocal={imageFocal}
            showImage={showImage}
            onClose={() => setOpen(false)}
          />
        }
        footer={
          <>
            {error && <p className="text-live-ink text-sm mb-3">{error}</p>}
            {/* Above the button on purpose — trust signals need to be seen
                BEFORE the tap that charges a card, not after. */}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted mb-3 text-center">
              <span>
                GST-registered
                {/* The number itself means nothing to a buyer mid-checkout,
                    and at 390px it ate most of the first line. It is on the
                    invoice, which is the surface where it has a job. */}
                <span className="hidden sm:inline"> · {gstin}</span>
              </span>
              <a
                href="/refund-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-ink rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
              >
                Refund policy
              </a>
              <span className="inline-flex items-center gap-1">
                {/* Drawn rather than the 🔒 emoji: emoji render at a
                    different size, weight and colour on every platform, and
                    sat visibly wrong beside 10px mono. */}
                <svg width="9" height="11" viewBox="0 0 10 12" aria-hidden focusable="false">
                  <path d="M2.6 5.2V3.4a2.4 2.4 0 0 1 4.8 0v1.8" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <rect x="1" y="5.2" width="8" height="6" rx="1.4" fill="currentColor" />
                </svg>
                Secured by Razorpay
              </span>
            </div>
            <button
              onClick={pay}
              disabled={loading}
              className="w-full py-4 rounded-full bg-marigold text-ink font-semibold text-[16px] hover:bg-ink hover:text-bone transition-colors disabled:opacity-60"
            >
              {loading ? "Starting payment…" : `Proceed to pay ${payLabel} →`}
            </button>
          </>
        }
      >
              <h3 className="font-display font-extrabold text-[22px] tracking-tight">{title}</h3>
              <p className="font-mono text-[11px] text-muted mt-1.5 mb-5">
                {applied ? (
                  <span className="text-marigold-ink">{applied.code} applied · {applied.label}</span>
                ) : (
                  priceLabel
                )}
              </p>

              {FIELDS.map((field) => {
                const id = `${uid}-${field.key}`;
                const errId = `${id}-error`;
                const err = fieldErrors[field.key];
                return (
                  <div className="mb-3.5" key={field.key}>
                    <label
                      htmlFor={id}
                      className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5"
                    >
                      {field.label}
                    </label>
                    <input
                      id={id}
                      name={field.key}
                      type={field.type}
                      // Pulls up the numeric keypad on a phone and, together
                      // with the strip below, makes it impossible to type a
                      // letter into the number field at all.
                      inputMode={field.key === "phone" ? "tel" : undefined}
                      autoComplete={field.key === "name" ? "name" : field.key === "email" ? "email" : "tel"}
                      value={form[field.key]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        // Digits, spaces, hyphens and one leading + only.
                        // A country code is allowed and never forced.
                        const next = field.key === "phone" ? stripToPhoneChars(raw) : raw;
                        setForm({ ...form, [field.key]: next });
                        if (err) setFieldErrors({ ...fieldErrors, [field.key]: undefined });
                      }}
                      placeholder={field.placeholder}
                      onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                      aria-invalid={err ? true : undefined}
                      aria-describedby={err ? errId : undefined}
                      className={`w-full px-3.5 py-3.5 text-[16px] text-ink bg-card border rounded-[10px] placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-marigold ${
                        err ? "border-live-ink" : "border-line focus:border-marigold"
                      }`}
                    />
                    {err && (
                      <p id={errId} className="text-live-ink text-[13px] mt-1.5">
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Collapsed by default. An open, empty coupon box on every
                  checkout tells a buyer with no code that they are paying
                  too much, and sends them off to hunt for one. */}
              <div className="mb-4">
                {!couponOpen && !applied ? (
                  <button
                    type="button"
                    onClick={() => setCouponOpen(true)}
                    className="font-mono text-[11px] uppercase tracking-wider text-marigold-ink hover:underline"
                  >
                    Have a code?
                  </button>
                ) : applied ? (
                  <div className="flex items-center justify-between gap-3 bg-card border border-line rounded-[10px] px-3.5 py-2.5">
                    <span className="font-mono text-[11px]">
                      <b>{applied.code}</b> applied{quote && quote.discount > 0 ? ` · ₹${formatRupees(quote.discount)} off` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setApplied(null);
                        setCouponInput("");
                        setCouponOpen(false);
                        // MUST re-quote. Without this the breakdown and the
                        // pay button kept showing the discounted total while
                        // pay() sent no code at all, so the buyer was shown
                        // one number and charged another.
                        refreshQuote(null, gstOpen ? gst : null);
                      }}
                      className="font-mono text-[11px] text-muted hover:text-ink"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <label
                      htmlFor={`${uid}-coupon`}
                      className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5"
                    >
                      Discount code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id={`${uid}-coupon`}
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            checkCoupon();
                          }
                        }}
                        placeholder="EARLYBIRD"
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        className="flex-1 min-w-0 px-3.5 py-3 text-[16px] text-ink bg-card border border-line rounded-[10px] uppercase placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
                      />
                      <button
                        type="button"
                        onClick={checkCoupon}
                        disabled={couponChecking || !couponInput.trim()}
                        className="px-4 rounded-[10px] border border-ink font-semibold text-sm whitespace-nowrap hover:bg-ink hover:text-bone transition-colors disabled:opacity-50"
                      >
                        {couponChecking ? "…" : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-live-ink text-[13px] mt-1.5">{couponError}</p>}
                  </>
                )}
              </div>

              {/* Business invoice. Collapsed and entirely optional: most
                  buyers are individuals, and an always-visible GSTIN field
                  reads as "this isn't for you" to a student. Hidden
                  altogether unless B2B is switched on in the admin panel. */}
              {tax.b2bEnabled && (
                <div className="mb-4">
                  {!gstOpen ? (
                    <button
                      type="button"
                      onClick={() => setGstOpen(true)}
                      className="font-mono text-[11px] uppercase tracking-wider text-marigold-ink hover:underline"
                    >
                      Buying for a business?
                    </button>
                  ) : (
                    <div className="bg-card border border-line rounded-[10px] p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <p className="text-[13px] leading-relaxed text-ink-soft">{tax.b2bPrompt}</p>
                        <button
                          type="button"
                          onClick={() => {
                            setGstOpen(false);
                            setGst({ gstin: "", legalName: "", stateCode: "" });
                            setGstError(null);
                            refreshQuote(applied?.code ?? null, null);
                          }}
                          aria-label="Remove GST details"
                          className="font-mono text-[11px] text-muted hover:text-ink shrink-0"
                        >
                          Skip
                        </button>
                      </div>

                      <label
                        htmlFor={`${uid}-gstin`}
                        className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5"
                      >
                        GSTIN
                      </label>
                      <input
                        id={`${uid}-gstin`}
                        value={gst.gstin}
                        onChange={(e) => {
                          // Uppercase and strip anything a GSTIN can't
                          // contain, so a pasted value with spaces still works.
                          setGst({ ...gst, gstin: e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15) });
                          if (gstError) setGstError(null);
                        }}
                        onBlur={applyGstDetails}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        placeholder="09ABCDE1234F1Z5"
                        aria-invalid={gstError ? true : undefined}
                        className={`w-full px-3.5 py-3 text-[16px] text-ink bg-bone border rounded-[10px] font-mono tracking-wider placeholder-ink-soft focus:outline-none focus:ring-2 focus:ring-marigold ${
                          gstError ? "border-live-ink" : "border-line focus:border-marigold"
                        }`}
                      />
                      {gstError && <p className="text-live-ink text-[13px] mt-1.5">{gstError}</p>}

                      <label
                        htmlFor={`${uid}-legal-name`}
                        className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5 mt-3"
                      >
                        Registered business name
                      </label>
                      <input
                        id={`${uid}-legal-name`}
                        value={gst.legalName}
                        onChange={(e) => setGst({ ...gst, legalName: e.target.value })}
                        onBlur={applyGstDetails}
                        onFocus={(e) => scrollFieldIntoView(e.currentTarget)}
                        placeholder="As it appears on your GST certificate"
                        className="w-full px-3.5 py-3 text-[16px] text-ink bg-bone border border-line rounded-[10px] placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
                      />

                      {gst.stateCode && (
                        <p className="font-mono text-[11px] text-muted mt-2.5">
                          State:{" "}
                          {GST_STATES.find((st) => st.code === gst.stateCode)?.name ?? gst.stateCode}
                          {quote && !quote.intraState ? " · taxed as IGST" : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* The authoritative breakdown, straight from the server. It
                  renders even before a coupon is tried, because in
                  "+ GST" mode the total is the first genuinely new number a
                  buyer sees and burying it until checkout is exactly the
                  surprise this section exists to prevent. */}
              {quote && (
                <div className="bg-card border border-line rounded-[10px] px-4 py-3 mb-4 text-[13px]">
                  {/* Every line here is tax-EXCLUSIVE so the column adds up
                      to the total printed below it. In inclusive mode the
                      listed price already contains the tax, so showing it
                      raw next to a separate GST line produced a bill whose
                      own arithmetic was wrong. */}
                  <div className="flex justify-between py-1">
                    <span className="text-ink-soft">{title.length > 24 ? "Price" : title}</span>
                    <span>₹{formatRupees(quote.taxableValue + quote.discountTaxable)}</span>
                  </div>
                  {quote.discountTaxable > 0 && (
                    <div className="flex justify-between py-1 text-marigold-ink">
                      <span>Discount{applied ? ` (${applied.code})` : ""}</span>
                      <span>−₹{formatRupees(quote.discountTaxable)}</span>
                    </div>
                  )}
                  {quote.taxApplied && quote.taxTotal > 0 && (
                    <div className="flex justify-between py-1">
                      <span className="text-ink-soft">
                        {quote.intraState
                          ? `CGST + SGST (${quote.ratePercent}%)`
                          : `IGST (${quote.ratePercent}%)`}
                      </span>
                      <span>₹{formatRupees(quote.taxTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 mt-1 border-t border-line font-semibold text-[15px]">
                    <span>Total</span>
                    <span>₹{formatRupees(quote.payable)}</span>
                  </div>
                </div>
              )}
      </ModalShell>
    </>
  );
}

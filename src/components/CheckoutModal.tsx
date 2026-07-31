"use client";
import { useEffect, useState } from "react";

export default function CheckoutModal({
  itemId,
  title,
  priceLabel,
  triggerClassName,
  triggerLabel,
}: {
  itemId: string;
  title: string;
  priceLabel: string;
  triggerClassName: string;
  triggerLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
        body: JSON.stringify({ itemId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      // Cashfree JS SDK redirect — loaded lazily so the homepage/list
      // pages never pay the bundle cost for it.
      const { load } = await import("@cashfreepayments/cashfree-js");
      const cashfree = await load({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION" ? "production" : "sandbox",
      });
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: "_self",
      });
    } catch (e: any) {
      setError(e.message ?? "Payment could not start. Try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-ink/55 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-bone rounded-[18px] w-full max-w-[420px] p-7">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="float-right text-2xl leading-none text-muted hover:text-ink"
            >
              ×
            </button>
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
                  placeholder={field === "phone" ? "+91" : field === "email" ? "you@example.com" : "Your name"}
                  className="w-full px-3.5 py-3 text-[15px] bg-card border border-line rounded-[10px] focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
                />
              </div>
            ))}

            {error && <p className="text-live text-sm mb-3">{error}</p>}

            <button
              onClick={pay}
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-marigold text-ink font-semibold text-[15px] hover:bg-ink hover:text-bone transition-colors disabled:opacity-60"
            >
              {loading ? "Starting payment…" : `Proceed to pay ${priceLabel} →`}
            </button>
            <div className="flex items-center justify-center gap-2 font-mono text-[10.5px] text-muted mt-3.5">
              🔒 Secured by Cashfree · GST invoice · instant receipt
            </div>
          </div>
        </div>
      )}
    </>
  );
}

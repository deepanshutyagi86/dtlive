"use client";
import { useState } from "react";

/**
 * Send one real email and see exactly what the provider said.
 *
 * The failure this was built for is invisible by design: a payment
 * succeeds, sendEmail's error goes to a serverless console, and the admin
 * panel shows nothing at all. This makes that failure something you can
 * produce on demand, in five seconds, before an order depends on it.
 */
export default function EmailCheck({
  configured,
  from,
  notifyEmail,
}: {
  configured: boolean;
  from: string | null;
  notifyEmail: string | null;
}) {
  const [to, setTo] = useState(notifyEmail ?? "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string; to?: string } | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim() || undefined }),
      });
      setResult(await res.json());
    } catch {
      setResult({ ok: false, error: "Could not reach the server. Check your connection." });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="border border-line rounded-card bg-card p-5 mb-8">
      <h2 className="font-display font-bold text-lg mb-1">Email</h2>
      <p className="text-sm text-muted mb-4">
        Order confirmations, registration emails and your own alerts all go through here. If this fails,
        buyers pay and hear nothing — and nothing else on the site will tell you.
      </p>

      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
        <span className="font-mono text-[11px]">
          <span className="text-muted">KEYS </span>
          {configured ? (
            <span className="text-marigold-ink font-bold">SET</span>
          ) : (
            <span className="text-live-ink font-bold">MISSING</span>
          )}
        </span>
        <span className="font-mono text-[11px] text-muted">
          FROM {from ? <span className="text-ink">{from}</span> : <span className="text-live-ink">not set</span>}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="flex-1 min-w-[220px] px-3.5 py-2.5 text-sm bg-bone border border-line rounded-[10px] placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
          placeholder={notifyEmail ?? "you@example.com"}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          type="email"
        />
        <button
          onClick={send}
          disabled={sending}
          className="bg-ink text-bone px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-marigold hover:text-ink transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send a test email"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-lg px-4 py-3 text-sm ${
            result.ok
              ? "border border-marigold bg-marigold/10"
              : "border border-live bg-live/5 text-live-ink"
          }`}
        >
          {result.ok ? (
            <>
              <strong>Sent to {result.to}.</strong> If it doesn&apos;t arrive within a minute, check spam — and
              if it&apos;s in spam, your sending domain needs SPF and DKIM records.
            </>
          ) : (
            <>
              <strong>Failed.</strong> {result.error}
              {/* The most common cause by a wide margin, said plainly so it
                  doesn't need to be looked up. */}
              <span className="block mt-2 text-[13px]">
                Most often this means the sending domain isn&apos;t verified with Resend. Resend → Domains →
                add the domain in your FROM address, then add the DNS records it gives you.
              </span>
            </>
          )}
        </div>
      )}
    </section>
  );
}

"use client";
import { useEffect, useState } from "react";
import { DEFAULT_REGISTRATION_FIELDS, type RegistrationField } from "@/lib/types";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function RegisterModal({
  itemId,
  title,
  workshopDate,
  registrationFields,
  triggerClassName,
  triggerLabel,
}: {
  itemId: string;
  title: string;
  workshopDate: string; // ISO datetime
  registrationFields?: RegistrationField[];
  triggerClassName: string;
  triggerLabel: string;
}) {
  const fields =
    registrationFields && registrationFields.length > 0 ? registrationFields : DEFAULT_REGISTRATION_FIELDS;

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  // Meta Pixel drops these cookies itself; forwarding them lets the
  // server-side Conversions API call match the same browser/click as the
  // fbq() Lead event fired below, so Meta dedupes the two into one event.
  function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function register() {
    setError(null);
    for (const f of fields) {
      if (f.required && !form[f.key]?.trim()) {
        setError("Please fill in all required fields.");
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          answers: form,
          fbc: readCookie("_fbc"),
          fbp: readCookie("_fbp"),
          eventSourceUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

      // Same event_id the server used for its CAPI Lead call, so Meta
      // dedupes browser + CAPI into one event.
      window.fbq?.("track", "Lead", { content_name: title }, { eventID: data.id });

      setRegistered(true);
    } catch (e: any) {
      setError(e.message ?? "Could not register. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const dateObj = new Date(workshopDate);
  const dateLabel = dateObj.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  // No explicit end time on the workshop — 90 minutes is a reasonable
  // default for a calendar hold and isn't shown to the registrant anywhere.
  const calendarStart = dateObj;
  const calendarEnd = new Date(dateObj.getTime() + 90 * 60 * 1000);
  const toCalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${toCalStamp(calendarStart)}/${toCalStamp(calendarEnd)}&details=${encodeURIComponent(
    `${title} — live on Zoom. Link will be shared by email/WhatsApp before the session.`
  )}`;

  function close() {
    setOpen(false);
    // Reset for next open, after the close animation-less unmount.
    setForm({});
    setError(null);
    setRegistered(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-ink/55 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="bg-bone rounded-[18px] w-full max-w-[420px] p-7">
            <button
              onClick={close}
              aria-label="Close"
              className="float-right text-2xl leading-none text-muted hover:text-ink"
            >
              ×
            </button>

            {registered ? (
              <>
                <h3 className="font-display font-extrabold text-[22px] tracking-tight">You&apos;re in 🎉</h3>
                <p className="text-[16px] leading-relaxed text-ink-soft mt-3">
                  Your free seat for <b>{title}</b> is reserved.
                </p>
                <div className="mt-4 p-4 bg-card border border-line rounded-[10px]">
                  <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1">When</p>
                  <p className="font-semibold text-[16px]">{dateLabel} · Live on Zoom</p>
                </div>
                <p className="text-[15px] leading-relaxed text-ink-soft mt-4">
                  We&apos;ll email and WhatsApp the Zoom link before the session starts.
                </p>
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener"
                  className="block text-center w-full mt-5 py-3.5 rounded-full bg-marigold text-ink font-semibold text-[15px] hover:bg-ink hover:text-bone transition-colors"
                >
                  Add to calendar →
                </a>
              </>
            ) : (
              <>
                <h3 className="font-display font-extrabold text-[22px] tracking-tight">{title}</h3>
                <p className="font-mono text-[11px] text-muted mt-1.5 mb-5">Free · reserve your seat</p>

                {fields.map((f) => (
                  <div className="mb-3.5" key={f.key}>
                    <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">
                      {f.label}
                    </label>
                    <input
                      type={f.type}
                      value={form[f.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={
                        f.key === "name" ? "Your name" : f.type === "tel" ? "+91" : f.type === "email" ? "you@example.com" : ""
                      }
                      className="w-full px-3.5 py-3 text-[16px] bg-card border border-line rounded-[10px] focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
                    />
                  </div>
                ))}

                {error && <p className="text-live text-sm mb-3">{error}</p>}

                <button
                  onClick={register}
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-marigold text-ink font-semibold text-[15px] hover:bg-ink hover:text-bone transition-colors disabled:opacity-60"
                >
                  {loading ? "Reserving…" : "Reserve my free seat →"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

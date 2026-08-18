"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ItemImage from "./ItemImage";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { DEFAULT_REGISTRATION_FIELDS, type Category, type ImageFocal, type RegistrationField } from "@/lib/types";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function RegisterModal({
  itemId,
  title,
  slug,
  category,
  thumbnail,
  imageFocal,
  workshopDate,
  registrationFields,
  triggerClassName,
  triggerLabel,
}: {
  itemId: string;
  title: string;
  slug: string;
  category: Category;
  thumbnail: string | null;
  imageFocal?: ImageFocal | null;
  // ISO datetime. Omit for non-workshop inquiries (e.g. agency "get a
  // quote") — the date/calendar block below is skipped entirely when unset.
  workshopDate?: string;
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
  // Portal target (document.body) only exists client-side; without this
  // guard, SSR/hydration would try to render into a nonexistent node.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Meta Pixel drops these cookies itself; forwarding them lets the
  // server-side Conversions API call match the same browser/click as the
  // fbq() Lead event fired below, so Meta dedupes the two into one event.
  function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function close() {
    setOpen(false);
    // Reset for next open, after the close animation-less unmount.
    setForm({});
    setError(null);
    setRegistered(false);
  }

  useModalBehavior({ open, onClose: close, panelRef, triggerRef });

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

  const dateObj = workshopDate ? new Date(workshopDate) : null;
  const dateLabel = dateObj
    ? dateObj.toLocaleString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  // No explicit end time on the workshop — 90 minutes is a reasonable
  // default for a calendar hold and isn't shown to the registrant anywhere.
  const toCalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const calendarUrl = dateObj
    ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
        title
      )}&dates=${toCalStamp(dateObj)}/${toCalStamp(new Date(dateObj.getTime() + 90 * 60 * 1000))}&details=${encodeURIComponent(
        `${title} — live on Zoom. Link will be shared by email/WhatsApp before the session.`
      )}`
    : null;

  return (
    <>
      <button ref={triggerRef} onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 bg-ink/55 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="bg-bone rounded-card w-full max-w-[420px] max-h-[90dvh] flex flex-col overflow-hidden"
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
                onClick={close}
                aria-label="Close"
                className="absolute top-3 right-3 w-11 h-11 rounded-full bg-ink/60 backdrop-blur-sm text-bone flex items-center justify-center text-2xl leading-none hover:bg-ink transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {registered ? (
                <>
                  <h3 className="font-display font-extrabold text-[22px] tracking-tight">
                    {dateObj ? "You're in 🎉" : "Got it 🎉"}
                  </h3>
                  {dateObj ? (
                    <>
                      <p className="text-[16px] leading-relaxed text-ink-soft mt-3">
                        Your free seat for <b>{title}</b> is reserved.
                      </p>
                      <div className="mt-4 p-4 bg-card border border-line rounded-[10px]">
                        <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1">When</p>
                        <p className="font-semibold text-[16px]">{dateLabel} · Live on Zoom</p>
                      </div>
                      <p className="text-[16px] leading-relaxed text-ink-soft mt-4">
                        Check your email for confirmation — I&apos;ll follow up directly with the Zoom link
                        before the session starts.
                      </p>
                      <a
                        href={calendarUrl!}
                        target="_blank"
                        rel="noopener"
                        className="block text-center w-full mt-5 py-4 rounded-full bg-marigold text-ink font-semibold text-[16px] hover:bg-ink hover:text-bone transition-colors"
                      >
                        Add to calendar →
                      </a>
                    </>
                  ) : (
                    <p className="text-[16px] leading-relaxed text-ink-soft mt-3">
                      Got your details for <b>{title}</b> — check your email for confirmation, and I&apos;ll
                      follow up directly shortly.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="font-display font-extrabold text-[22px] tracking-tight">{title}</h3>
                  <p className="font-mono text-[11px] text-muted mt-1.5 mb-5">
                    {dateObj ? "Free · reserve your seat" : "Tell us about your project"}
                  </p>

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
                          f.key === "name"
                            ? "e.g. Deepanshu"
                            : f.type === "tel"
                              ? "e.g. 9870600903"
                              : f.type === "email"
                                ? "e.g. you@example.com"
                                : ""
                        }
                        className="w-full px-3.5 py-3.5 text-[16px] bg-card border border-line rounded-[10px] placeholder-ink-soft focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
                      />
                    </div>
                  ))}

                  {error && <p className="text-live text-sm mb-3">{error}</p>}

                  <button
                    onClick={register}
                    disabled={loading}
                    className="w-full py-4 rounded-full bg-marigold text-ink font-semibold text-[16px] hover:bg-ink hover:text-bone transition-colors disabled:opacity-60"
                  >
                    {loading ? (dateObj ? "Reserving…" : "Sending…") : dateObj ? "Reserve my free seat →" : "Send inquiry →"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

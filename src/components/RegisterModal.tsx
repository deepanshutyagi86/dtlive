"use client";
import { useEffect, useId, useRef, useState } from "react";
import ModalShell from "./ModalShell";
import ModalHeroHeader from "./ModalHeroHeader";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { useModalViewport, HERO_COLLAPSE_HEIGHT, scrollFieldIntoView } from "@/lib/useModalViewport";
import { DEFAULT_REGISTRATION_FIELDS, type Category, type ImageFocal, type RegistrationField } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";
import { isValidEmail, isValidPhone, stripToPhoneChars } from "@/lib/validate";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState(false);
  // Portal target (document.body) only exists client-side; without this
  // guard, SSR/hydration would try to render into a nonexistent node.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Stable per-instance prefix so htmlFor points at exactly one input even
  // with several register modals mounted on the same page.
  const uid = useId();

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
    setFieldErrors({});
    setRegistered(false);
  }

  useModalBehavior({ open, onClose: close, panelRef, triggerRef });
  const viewport = useModalViewport(open);
  const showImage = viewport.height >= HERO_COLLAPSE_HEIGHT;

  async function register() {
    setError(null);

    // Per-field, not one blanket message: "please fill in all required
    // fields" makes someone re-read the whole form to find the one that is
    // wrong. Format is checked here AND server-side in /api/leads — this
    // copy is the fast feedback, that one is the rule.
    const nextErrors: Record<string, string> = {};
    for (const f of fields) {
      const value = (form[f.key] ?? "").trim();
      if (f.required && !value) {
        nextErrors[f.key] = `${f.label} is required.`;
        continue;
      }
      if (!value) continue;
      if (f.type === "email" && !isValidEmail(value)) {
        nextErrors[f.key] = "That doesn't look right — check for a typo.";
      }
      if (f.type === "tel" && !isValidPhone(value)) {
        nextErrors[f.key] = "10 digits, or include the country code.";
      }
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

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
        timeZone: SITE_TZ,
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

      <ModalShell
        open={open}
        mounted={mounted}
        onClose={close}
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
            onClose={close}
          />
        }
        footer={
          !registered ? (
            <>
              {error && <p className="text-live-ink text-sm mb-3">{error}</p>}
              <button
                onClick={register}
                disabled={loading}
                className="w-full py-4 rounded-full bg-marigold text-ink font-semibold text-[16px] hover:bg-ink hover:text-bone transition-colors disabled:opacity-60"
              >
                {loading ? (dateObj ? "Reserving…" : "Sending…") : dateObj ? "Reserve my free seat →" : "Send inquiry →"}
              </button>
            </>
          ) : dateObj ? (
            <a
              href={calendarUrl!}
              target="_blank"
              rel="noopener"
              className="block text-center w-full py-4 rounded-full bg-marigold text-ink font-semibold text-[16px] hover:bg-ink hover:text-bone transition-colors"
            >
              Add to calendar →
            </a>
          ) : null
        }
      >
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

                  {fields.map((f) => {
                    const id = `${uid}-${f.key}`;
                    const errId = `${id}-error`;
                    const err = fieldErrors[f.key];
                    return (
                      <div className="mb-3.5" key={f.key}>
                        <label
                          htmlFor={id}
                          className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5"
                        >
                          {f.label}
                          {!f.required && <span className="text-muted/70 normal-case"> (optional)</span>}
                        </label>
                        <input
                          id={id}
                          name={f.key}
                          type={f.type}
                          inputMode={f.type === "tel" ? "tel" : undefined}
                          autoComplete={
                            f.key === "name" ? "name" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined
                          }
                          value={form[f.key] ?? ""}
                          onChange={(e) => {
                            // A phone field accepts digits, spaces, hyphens
                            // and one leading + — nothing else can be typed
                            // into it at all.
                            const next = f.type === "tel" ? stripToPhoneChars(e.target.value) : e.target.value;
                            setForm({ ...form, [f.key]: next });
                            if (err) setFieldErrors({ ...fieldErrors, [f.key]: "" });
                          }}
                          placeholder={
                            f.key === "name"
                              ? "e.g. Deepanshu"
                              : f.type === "tel"
                                ? "e.g. 98765 43210"
                                : f.type === "email"
                                  ? "e.g. you@example.com"
                                  : ""
                          }
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
                </>
              )}
      </ModalShell>
    </>
  );
}

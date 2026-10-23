"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useModalBehavior } from "@/lib/useModalBehavior";
import type { RegistrationField } from "@/lib/types";
import Link from "next/link";
import CheckoutModal from "@/components/CheckoutModal";
import { readAttribution } from "@/lib/attribution";
import { isValidEmail, isValidPhone, stripToPhoneChars } from "@/lib/validate";
import type { HomeSettings } from "@/lib/home-settings";
import { Arrow, Pic } from "./parts";
import type { V4NextLive, V4PastLive } from "./types";

// The "02 · Live" ticket. Three layers, left to right:
//   stub  — the workshop's own cover, tinted gold at the bottom so the
//           date stays readable on any photo
//   body  — what it is and the one action
//   host  — your photo. Floats right on a phone so the text wraps round
//           it; a full-height column that melts into the ink on desktop.
//
// No upcoming date no longer sends people off to WhatsApp: the body turns
// into a two-field waitlist that lands in Admin → Leads (source
// "waitlist:live"), and the stub shows the last session as proof it runs.

type Status = "idle" | "sending" | "done" | "error";

/* ------------------------------------------------------------------ */
/* Countdown to the workshop's own start time                          */
/* ------------------------------------------------------------------ */

// Rendered after mount only: a clock computed on the server is already
// wrong when it arrives and would mismatch on hydration. Counts to the
// same timestamp /api/leads uses to close registration, so the moment it
// hits zero is the moment the form genuinely stops working.
function Countdown({ iso, onDone }: { iso: string; onDone: () => void }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const target = new Date(iso).getTime();
    if (Number.isNaN(target)) return;
    const tick = () => {
      const ms = target - Date.now();
      setLeft(Math.max(0, ms));
      if (ms <= 0) onDone();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso, onDone]);

  const total = Math.floor((left ?? 0) / 1000);
  const parts = [
    { v: Math.floor(total / 86400), u: "Days" },
    { v: Math.floor((total % 86400) / 3600), u: "Hrs" },
    { v: Math.floor((total % 3600) / 60), u: "Min" },
    { v: total % 60, u: "Sec" },
  ];
  return (
    <div className="v4-cd" role="timer" aria-live="off" aria-label="Time until the workshop starts">
      {parts.map((p) => (
        <span key={p.u} className="v4-cd-cell">
          <b className="v4-d">{left === null ? "––" : String(p.v).padStart(2, "0")}</b>
          <i className="v4-m">{p.u}</i>
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Free workshop: the registration form, right on the ticket           */
/* ------------------------------------------------------------------ */

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function calendarLink(title: string, iso: string): string {
  const start = new Date(iso);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const end = new Date(start.getTime() + 90 * 60 * 1000);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${stamp(
    start
  )}/${stamp(end)}&details=${encodeURIComponent(`${title}, live on Zoom. The link comes on WhatsApp and email.`)}`;
}

const WA_ICON =
  "M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z";

function GroupButton({ group }: { group: { url: string; label: string } }) {
  return (
    <a href={group.url} target="_blank" rel="noopener noreferrer" className="v4-btn v4-b-wa v4-w-full">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={WA_ICON} />
      </svg>
      {group.label}
    </a>
  );
}

const WAITLIST_FIELDS: RegistrationField[] = [
  { key: "name", label: "Your name", type: "text", required: true },
  { key: "phone", label: "WhatsApp number", type: "tel", required: true },
];

/**
 * The ticket shows ONE button. The form only appears after a tap, in a
 * sheet: up from the bottom on a phone (thumb reach, keyboard-safe), from
 * the side on desktop — the same sheet the course "Details" use.
 *
 *   mode "register" — a free workshop: the workshop's own fields → Leads,
 *                     then the WhatsApp group button
 *   mode "waitlist" — nothing scheduled, or full: name + WhatsApp → Leads
 */
function LiveForm({ mode, nl, fontVars }: { mode: "register" | "waitlist"; nl: V4NextLive | null; fontVars: string }) {
  const fields = mode === "register" && nl ? nl.fields : WAITLIST_FIELDS;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [group, setGroup] = useState<{ url: string; label: string } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => setMounted(true), []);
  useModalBehavior({ open, onClose: close, panelRef, triggerRef });

  const first = (form.name ?? "").trim().split(" ")[0];
  const when = nl ? `${nl.bigDate}, ${nl.smallDate.replace(" · ", " ")}` : "";
  const isReg = mode === "register" && !!nl;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    // Same per-field checks as the server, so a typo is caught here first.
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = (form[f.key] ?? "").trim();
      if (f.required && !v) next[f.key] = `${f.label} is required.`;
      else if (v && f.type === "email" && !isValidEmail(v)) next[f.key] = "Check this email for a typo.";
      else if (v && f.type === "tel" && !isValidPhone(v)) next[f.key] = "10 digits, or add the country code.";
    }
    setErrs(next);
    if (Object.keys(next).length) return;

    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isReg
            ? {
                itemId: nl!.id,
                answers: form,
                attribution: readAttribution(),
                fbc: readCookie("_fbc"),
                fbp: readCookie("_fbp"),
                eventSourceUrl: window.location.href,
              }
            : { waitlist: "live", answers: form, eventSourceUrl: window.location.href }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "That didn’t go through. Try once more.");
      if (isReg) {
        // Same event id the server used for its Conversions API call, so Meta counts one lead.
        window.fbq?.("track", "Lead", { content_name: nl!.title }, { eventID: data.id });
      }
      setGroup(data.group ?? null);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn’t go through. Try once more.");
      setStatus("error");
    }
  }

  const done = status === "done";
  const doneTitle = isReg ? `You’re in${first ? `, ${first}` : ""}.` : "You’re on the list.";

  return (
    <>
      {done ? (
        // Back on the ticket after closing the sheet, the outcome stays visible.
        <div className="v4-reg-mini" role="status">
          <span className="v4-wl-tick" aria-hidden="true">
            ✓
          </span>
          <span>{doneTitle}</span>
          {group && (
            <a href={group.url} target="_blank" rel="noopener noreferrer" className="v4-reg-mini-wa">
              Join the group →
            </a>
          )}
        </div>
      ) : (
        <button ref={triggerRef} type="button" className="v4-btn v4-b-gold v4-reg-open" onClick={() => setOpen(true)}>
          {isReg ? "Reserve my seat" : "Notify me"} <Arrow />
        </button>
      )}

      {mounted &&
        open &&
        createPortal(
          <div className={`v4 ${fontVars}`}>
            <div className="v4-scrim" onClick={close} aria-hidden="true" />
            <div
              ref={panelRef}
              className="v4-sheet v4-regsheet"
              role="dialog"
              aria-modal="true"
              aria-label={isReg ? `Register for ${nl!.title}` : "Join the waitlist"}
            >
              <div className="v4-grab" aria-hidden="true" />
              <div className="v4-sheet-head">
                <div>
                  <span className="v4-m v4-gold-ink">{isReg ? `Free · ${when}` : "Waitlist · free"}</span>
                  <h3 className="v4-d v4-sheet-title">
                    {done ? doneTitle : isReg ? nl!.title : "Get the next date first."}
                  </h3>
                </div>
                <button type="button" className="v4-x" aria-label="Close" onClick={close}>
                  ×
                </button>
              </div>

              {done ? (
                <div className="v4-regsheet-done">
                  {isReg ? (
                    <>
                      <p className="v4-sheet-lede">
                        Your seat is reserved for <b>{when}</b>.{" "}
                        {group
                          ? "Join the group now — the Zoom link is shared there."
                          : "The Zoom link comes to you on WhatsApp and email before it starts."}
                      </p>
                      {group && <GroupButton group={group} />}
                      <a
                        href={calendarLink(nl!.title, nl!.dateIso)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="v4-btn v4-b-line v4-w-full"
                      >
                        Add to calendar
                      </a>
                    </>
                  ) : (
                    <p className="v4-sheet-lede">You hear the next date first, on WhatsApp, before it goes public.</p>
                  )}
                </div>
              ) : (
                <form className="v4-regsheet-form" onSubmit={submit} noValidate>
                  <p className="v4-sheet-lede">
                    {isReg
                      ? "Takes ten seconds. You get the WhatsApp group link the moment you’re in."
                      : "Leave your number and you hear the date first."}
                  </p>
                  {fields.map((f) => {
                    const id = `v4-reg-${mode}-${f.key}`;
                    const err = errs[f.key];
                    return (
                      <div key={f.key} className="v4-reg-f">
                        <label className="v4-m v4-muted" htmlFor={id}>
                          {f.label}
                          {!f.required && " (optional)"}
                        </label>
                        <input
                          id={id}
                          className={`v4-in ${err ? "is-bad" : ""}`}
                          type={f.type}
                          inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
                          autoComplete={
                            f.key === "name" ? "name" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined
                          }
                          placeholder={f.type === "tel" ? "98765 43210" : f.type === "email" ? "you@example.com" : "Your full name"}
                          value={form[f.key] ?? ""}
                          aria-invalid={err ? true : undefined}
                          aria-describedby={err ? `${id}-e` : undefined}
                          onChange={(e) => {
                            const v = f.type === "tel" ? stripToPhoneChars(e.target.value) : e.target.value;
                            setForm({ ...form, [f.key]: v });
                            if (err) setErrs({ ...errs, [f.key]: "" });
                          }}
                        />
                        {err && (
                          <span id={`${id}-e`} className="v4-in-err">
                            {err}
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <div className="v4-sheet-buy">
                    {status === "error" && (
                      <p className="v4-in-err" role="alert">
                        {error}
                      </p>
                    )}
                    <button type="submit" className="v4-btn v4-b-ink v4-w-full" disabled={status === "sending"}>
                      {status === "sending"
                        ? isReg
                          ? "Reserving…"
                          : "Adding you…"
                        : isReg
                          ? "Reserve my free seat →"
                          : "Notify me →"}
                    </button>
                    <span className="v4-m v4-muted v4-center">Free · your number is only used for this</span>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default function LiveTicket({
  nextLive,
  pastLive,
  live,
  hostFallback,
  bioName,
  gstin,
  fontVars,
}: {
  nextLive: V4NextLive | null;
  pastLive: V4PastLive | null;
  live: HomeSettings["live"];
  hostFallback: string | null;
  bioName: string;
  gstin: string;
  fontVars: string;
}) {
  // Flips when the countdown reaches zero — registration is closed from
  // that second on (the API refuses it too), so the form must go with it.
  // The page is rendered fresh per request and only ever passes a workshop
  // that hasn't started, so false is the true starting value on both server
  // and client (no hydration mismatch); the countdown flips it.
  const [started, setStarted] = useState(false);
  const markStarted = useCallback(() => setStarted(true), []);
  const cover = nextLive?.thumbnail || live.cover.url || pastLive?.thumbnail || null;
  const coverFocal = nextLive?.thumbnail
    ? nextLive.imageFocal
    : live.cover.url
      ? live.cover.focal ?? null
      : pastLive?.imageFocal ?? null;
  const host = live.host.url || hostFallback;
  const hostFocal = live.host.url ? live.host.focal ?? null : null;

  return (
    <div className="v4-ticket">
      <div className={`v4-stub ${cover ? "has-photo" : ""}`}>
        {cover && (
          <>
            <Pic src={cover} alt="" sizes="(min-width: 861px) 340px, 100vw" focal={coverFocal} />
            <span className="v4-stub-fade" aria-hidden="true" />
          </>
        )}
        <div className="v4-stub-copy">
          {nextLive ? (
            <>
              <span className="v4-m">{started ? "Happening now" : "Starts in"}</span>
              {started ? (
                <span className="v4-d v4-stub-big">
                  <span className="v4-dot v4-dot-live" /> Live.
                </span>
              ) : (
                <Countdown iso={nextLive.dateIso} onDone={markStarted} />
              )}
              <span className="v4-d v4-stub-mid">
                {nextLive.bigDate} · {nextLive.smallDate}
              </span>
              <span className="v4-m">
                {nextLive.isFull ? "All seats taken" : nextLive.seatsLabel || `${nextLive.priceLabel} · on Zoom`}
              </span>
            </>
          ) : (
            <>
              <span className="v4-m">Next live session</span>
              <span className="v4-d v4-stub-big">Soon.</span>
              <span className="v4-m">Waitlist open · free to join</span>
            </>
          )}
        </div>
      </div>

      <div className={`v4-tbody ${host ? "has-host" : ""}`}>
        {host && (
          <figure className="v4-host">
            <Pic src={host} alt={bioName} sizes="(min-width: 861px) 300px, 132px" focal={hostFocal} />
            <span className="v4-host-fade" aria-hidden="true" />
            <figcaption className="v4-m v4-host-cap">{live.hostCaption}</figcaption>
          </figure>
        )}
        <div className="v4-tmain">
          {nextLive ? (
            <>
              <span className="v4-m v4-gold">
                Workshop · live on Zoom · {nextLive.price > 0 ? nextLive.priceLabel : "Free"}
              </span>
              <h3 className="v4-d v4-t-title">{nextLive.title}</h3>
              <p className="v4-t-p v4-t-clamp">{nextLive.description || live.pitch}</p>
              {started ? (
                <p className="v4-t-p">
                  It&rsquo;s running right now, so registration is closed.{" "}
                  <Link href={`/items/${nextLive.slug}`} className="v4-inline-link">
                    See what it covers →
                  </Link>
                </p>
              ) : nextLive.isFull ? (
                <>
                  <p className="v4-t-p">This one filled up. Leave your number for the next date.</p>
                  <LiveForm mode="waitlist" nl={null} fontVars={fontVars} />
                </>
              ) : nextLive.price > 0 ? (
                <div className="v4-row">
                  <CheckoutModal
                    itemId={nextLive.id}
                    title={nextLive.title}
                    slug={nextLive.slug}
                    category="workshop"
                    thumbnail={nextLive.thumbnail}
                    imageFocal={nextLive.imageFocal}
                    priceLabel={nextLive.priceLabel}
                    price={nextLive.price}
                    tax={nextLive.tax}
                    gstin={gstin}
                    triggerLabel="Reserve my seat →"
                    triggerClassName="v4-btn v4-b-gold"
                  />
                  <Link href={`/items/${nextLive.slug}`} className="v4-m v4-muted-dark v4-inline-link">
                    Full details
                  </Link>
                </div>
              ) : (
                <div className="v4-row">
                  <LiveForm mode="register" nl={nextLive} fontVars={fontVars} />
                  <Link href={`/items/${nextLive.slug}`} className="v4-m v4-muted-dark v4-inline-link">
                    Full details
                  </Link>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="v4-m v4-gold">Waitlist · free</span>
              <h3 className="v4-d v4-t-title">
                Get the next date <span className="v4-sf v4-gold">first.</span>
              </h3>
              <p className="v4-t-p">{live.waitlistPitch}</p>
              <LiveForm mode="waitlist" nl={null} fontVars={fontVars} />
            </>
          )}
          {pastLive && (
            <Link href={`/items/${pastLive.slug}`} className="v4-m v4-muted-dark v4-prev">
              Previously · {pastLive.title} · {pastLive.dateLabel} · ran ✓
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

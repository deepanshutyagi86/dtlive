"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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

function Register({ nl }: { nl: V4NextLive }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [group, setGroup] = useState<{ url: string; label: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    // Same per-field checks as the server, so a typo is caught here first.
    const next: Record<string, string> = {};
    for (const f of nl.fields) {
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
        body: JSON.stringify({
          itemId: nl.id,
          answers: form,
          attribution: readAttribution(),
          fbc: readCookie("_fbc"),
          fbp: readCookie("_fbp"),
          eventSourceUrl: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "That didn’t go through. Try once more.");
      // Same event id the server used for its Conversions API call, so Meta counts one lead.
      window.fbq?.("track", "Lead", { content_name: nl.title }, { eventID: data.id });
      setGroup(data.group ?? null);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn’t go through. Try once more.");
      setStatus("error");
    }
  }

  if (status === "done") {
    const first = (form.name ?? "").trim().split(" ")[0];
    return (
      <div className="v4-reg-done" role="status">
        <p className="v4-reg-done-t">
          <span className="v4-wl-tick" aria-hidden="true">
            ✓
          </span>
          <span>
            You&rsquo;re in{first ? `, ${first}` : ""}. Seat reserved for{" "}
            <b>
              {nl.bigDate}, {nl.smallDate.replace(" · ", " ")}
            </b>
            .
          </span>
        </p>
        {group ? (
          <>
            <a href={group.url} target="_blank" rel="noopener noreferrer" className="v4-btn v4-b-wa v4-w-full">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3Z" />
              </svg>
              {group.label}
            </a>
            <p className="v4-m v4-muted-dark">Join now — the Zoom link is shared in the group.</p>
          </>
        ) : (
          <p className="v4-t-p">The Zoom link comes to you on WhatsApp and email before it starts.</p>
        )}
        <a href={calendarLink(nl.title, nl.dateIso)} target="_blank" rel="noopener noreferrer" className="v4-m v4-reg-cal">
          + Add to calendar
        </a>
      </div>
    );
  }

  return (
    <form className="v4-reg" onSubmit={submit} noValidate>
      {nl.fields.map((f) => {
        const id = `v4-reg-${f.key}`;
        const err = errs[f.key];
        return (
          <div key={f.key} className={`v4-reg-f ${f.type === "text" && f.key === "name" ? "is-wide" : ""}`}>
            <label className="v4-sr" htmlFor={id}>
              {f.label}
            </label>
            <input
              id={id}
              className={`v4-wl-in ${err ? "is-bad" : ""}`}
              type={f.type}
              inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
              autoComplete={f.key === "name" ? "name" : f.type === "email" ? "email" : f.type === "tel" ? "tel" : undefined}
              placeholder={`${f.label.charAt(0).toUpperCase()}${f.label.slice(1)}${f.required ? "" : " (optional)"}`}
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
              <span id={`${id}-e`} className="v4-wl-err">
                {err}
              </span>
            )}
          </div>
        );
      })}
      <button type="submit" className="v4-btn v4-b-gold v4-reg-btn" disabled={status === "sending"}>
        {status === "sending" ? "Reserving…" : "Reserve my free seat"} <Arrow />
      </button>
      {status === "error" && (
        <p className="v4-wl-err" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

function Waitlist() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waitlist: "live",
          answers: { name: name.trim(), phone: phone.trim() },
          eventSourceUrl: window.location.href,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "That didn’t go through. Try once more.");
      }
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn’t go through. Try once more.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="v4-wl-done" role="status">
        <span className="v4-wl-tick" aria-hidden="true">
          ✓
        </span>
        You&rsquo;re on the list, {name.trim().split(" ")[0] || "friend"}. You hear the date first, on WhatsApp.
      </p>
    );
  }

  return (
    <form className="v4-wl" onSubmit={submit} noValidate>
      <label className="v4-sr" htmlFor="v4-wl-name">
        Your name
      </label>
      <input
        id="v4-wl-name"
        className="v4-wl-in"
        placeholder="Your name"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="v4-sr" htmlFor="v4-wl-phone">
        WhatsApp number
      </label>
      <input
        id="v4-wl-phone"
        className="v4-wl-in"
        placeholder="WhatsApp number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button type="submit" className="v4-btn v4-b-gold v4-wl-btn" disabled={status === "sending"}>
        {status === "sending" ? "Adding you…" : "Notify me"} <Arrow />
      </button>
      {status === "error" && (
        <p className="v4-wl-err" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function LiveTicket({
  nextLive,
  pastLive,
  live,
  hostFallback,
  bioName,
  gstin,
}: {
  nextLive: V4NextLive | null;
  pastLive: V4PastLive | null;
  live: HomeSettings["live"];
  hostFallback: string | null;
  bioName: string;
  gstin: string;
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
                  <Waitlist />
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
                <Register nl={nextLive} />
              )}
            </>
          ) : (
            <>
              <span className="v4-m v4-gold">Waitlist · free</span>
              <h3 className="v4-d v4-t-title">
                Get the next date <span className="v4-sf v4-gold">first.</span>
              </h3>
              <p className="v4-t-p">{live.waitlistPitch}</p>
              <Waitlist />
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

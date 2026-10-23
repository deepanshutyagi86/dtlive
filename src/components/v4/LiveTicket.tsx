"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
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
}: {
  nextLive: V4NextLive | null;
  pastLive: V4PastLive | null;
  live: HomeSettings["live"];
  hostFallback: string | null;
  bioName: string;
}) {
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
          <span className="v4-m">Next live session</span>
          <span className="v4-d v4-stub-big">{nextLive ? nextLive.bigDate : "Soon."}</span>
          {nextLive && <span className="v4-d v4-stub-mid">{nextLive.smallDate}</span>}
          <span className="v4-m">
            {nextLive ? nextLive.seatsLabel || `${nextLive.priceLabel} · on Zoom` : "Waitlist open · free to join"}
          </span>
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
              <span className="v4-m v4-gold">Workshop · live on Zoom</span>
              <h3 className="v4-d v4-t-title">{nextLive.title}</h3>
              <p className="v4-t-p">{nextLive.description || live.pitch}</p>
              <div className="v4-row">
                <Link href={`/items/${nextLive.slug}`} className="v4-btn v4-b-gold">
                  Reserve my seat <Arrow />
                </Link>
                <span className="v4-m v4-muted-dark">{nextLive.priceLabel}</span>
              </div>
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

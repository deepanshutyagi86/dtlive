"use client";

import { useEffect, useState } from "react";
import type { HomeShowcase } from "@/lib/home-settings";
import { Pic } from "./parts";

// The Studio section's moving picture: a real build, played as the 14 days
// it actually takes.
//
//   Day 1  · Brief — the WhatsApp-style chat a project starts with
//   Day 7  · Build — the real screenshot drawn in as a wireframe
//   Day 14 · Live  — full colour, the page scrolls itself, a phone slides
//                    in and the "what you get" checks pop up
//
// Then the next project in the showcase takes over. Showcase entries come
// from Admin → Homepage → Studio; with none set, the shipped tiles'
// photos are used so the section is never the grey placeholder again.

const STEPS = ["Day 1 · Brief", "Day 7 · Build", "Day 14 · Live"];
// The live step holds longest — it is the payoff and the scroll needs time.
const DURATION = [3600, 3600, 7000];
const TOASTS = ["Payments wired", "Fast on every phone", "Yours to own"];

export interface DemoProject extends HomeShowcase {
  /** Where it came from — showcase entries are true screenshots; fallbacks are tile photos. */
  screenshot: boolean;
}

function host(name: string, url: string): string {
  const raw = (name || url || "").trim();
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname.replace(/^www\./, "") || raw;
  } catch {
    return raw;
  }
}

/** A brand name as typed; a bare URL is shortened to its domain. */
function label(x: { name: string; url: string }): string {
  const n = x.name.trim();
  if (n && !/^https?:\/\//i.test(n)) return n;
  return host(n, x.url) || "Project";
}

export default function StudioDemo({ projects }: { projects: DemoProject[] }) {
  const [step, setStep] = useState(0);
  const [proj, setProj] = useState(0);
  const [auto, setAuto] = useState(true);
  const count = projects.length;
  const p = count ? projects[proj % count] : null;

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => {
      if (step === STEPS.length - 1) {
        setStep(0);
        if (count > 1) setProj((i) => (i + 1) % count);
      } else {
        setStep(step + 1);
      }
    }, DURATION[step]);
    return () => clearTimeout(t);
  }, [step, auto, count]);

  // The bar shows the real domain when there is one; the chips and the chat use the brand name.
  const domain = p ? (p.url ? host("", p.url) : host(p.name, "")) || "yourbrand.in" : "yourbrand.in";
  const desk = p?.desktop.url || p?.mobile.url || null;
  const phone = p?.mobile.url || p?.desktop.url || null;
  const brand = p?.name ? label(p).replace(/\.(com|in|co|store|shop|live)$/i, "") : "your business";

  return (
    <div className="v4-demo">
      <div className="v4-tabs" role="tablist" aria-label="How a studio project runs">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === step}
            className={`v4-tab ${i === step ? "is-on" : i < step ? "is-done" : ""}`}
            style={{ ["--fill" as string]: `${DURATION[i]}ms` }}
            onClick={() => {
              setAuto(false);
              setStep(i);
            }}
          >
            <i>
              <b key={`${i}-${step}-${proj}-${auto}`} className={auto ? "" : "is-held"} />
            </i>
            {label}
          </button>
        ))}
      </div>

      <div className="v4-stage">
        <div className="v4-browser" aria-hidden="true">
          <div className="v4-bar">
            <span />
            <span />
            <span />
            <div className="v4-url v4-m">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {domain}
            </div>
          </div>

          {/* Keyed by project only: the screenshot stays mounted from day 7 to day 14, so it
              never blinks empty while it reloads — the step classes drive the change. */}
          <div key={proj} className={`v4-canvas v4-st${step} ${desk ? "has-shot" : ""}`}>
            {step === 0 && (
              <div className="v4-chat">
                <p className="v4-msg v4-in" style={{ animationDelay: "0.1s" }}>
                  Hi! Need a proper website for {brand}. Can you do it?
                </p>
                <p className="v4-msg v4-out" style={{ animationDelay: "0.9s" }}>
                  Yes. Send your logo, 5 photos and what you sell. Live in 14 days.
                </p>
                <p className="v4-msg v4-in" style={{ animationDelay: "1.8s" }}>
                  Sending now 🙌
                </p>
                <p className="v4-msg v4-file" style={{ animationDelay: "2.5s" }}>
                  <span className="v4-m">brief.pdf · logo.png · 5 photos</span>
                </p>
              </div>
            )}

            {desk && (
              <div className="v4-shot">
                <Pic
                  src={desk}
                  alt=""
                  sizes="(min-width: 861px) 640px, 92vw"
                  focal={p?.desktop.url ? p.desktop.focal : p?.mobile.focal}
                  className={step === 2 && p?.screenshot ? "v4-scrolling" : ""}
                />
              </div>
            )}
            {!desk && (
              <div className="v4-blocks">
                <div className="v4-blk v4-b1" />
                <div className="v4-blk v4-b2" />
                <div className="v4-blk-row">
                  <div className="v4-blk v4-b3" />
                  <div className="v4-blk v4-b4" />
                  <div className="v4-blk v4-b5" />
                </div>
              </div>
            )}

            {step === 1 && (
              <>
                <div className="v4-wire" />
                <div className="v4-scanline" />
                <span className="v4-building v4-m">
                  <i />
                  Designing {brand}
                </span>
              </>
            )}

            {step === 2 && (
              <>
                <div className="v4-toasts">
                  {TOASTS.map((t, i) => (
                    <span key={t} className="v4-toast" style={{ animationDelay: `${0.8 + i * 0.7}s` }}>
                      <b>✓</b> {t}
                    </span>
                  ))}
                </div>
                <span className="v4-livebadge v4-m">
                  <span className="v4-dot" />
                  Live · day 14
                </span>
              </>
            )}
          </div>
        </div>

        {/* The phone lands on day 14 — the moment a client actually opens it on theirs. */}
        <div className={`v4-phone ${step === 2 ? "is-in" : ""}`} aria-hidden="true">
          <span className="v4-notch" />
          <div className="v4-phone-screen">
            {phone ? (
              <Pic src={phone} alt="" sizes="140px" focal={p?.mobile.url ? p.mobile.focal : p?.desktop.focal} />
            ) : (
              <div className="v4-pic-empty" />
            )}
          </div>
        </div>
      </div>

      {count > 1 ? (
        <div className="v4-projs" role="group" aria-label="Recent builds">
          {projects.map((x, i) => (
            <button
              key={`${x.name}-${i}`}
              type="button"
              className={`v4-proj ${i === proj % count ? "is-on" : ""}`}
              onClick={() => {
                setProj(i);
                setStep(2);
                setAuto(true);
              }}
            >
              <span className="v4-proj-pic">
                <Pic src={x.mobile.url || x.desktop.url} alt="" sizes="40px" />
              </span>
              <span className="v4-proj-t">
                <b>{label(x)}</b>
                {x.tag && <span className="v4-m v4-muted">{x.tag}</span>}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="v4-m v4-muted">{p ? `Recent build · ${domain}` : "Concept preview"}</p>
      )}
      {p?.url && (
        <a href={p.url} target="_blank" rel="noopener noreferrer" className="v4-m v4-see-live">
          See {domain} live ↗
        </a>
      )}
    </div>
  );
}

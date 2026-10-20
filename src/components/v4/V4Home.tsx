"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import CheckoutModal from "@/components/CheckoutModal";
import { useModalBehavior } from "@/lib/useModalBehavior";
import { isOptimisableImage } from "@/lib/image-hosts";
import type { ImageFocal } from "@/lib/types";
import type { V4Course, V4HomeProps } from "./types";
import "./v4.css";

/* ------------------------------------------------------------------ */
/* Static persona content — Deepanshu's own lines, not marketing copy  */
/* ------------------------------------------------------------------ */

// The hero's spiral is literally how he describes his thinking: "When I
// talk, I spiral." The headline is that spiral run through a compressor.
const SPIRAL_TEXT =
  "AI is where I’m putting everything · I meditate · I dance · thoughts are things · attention has weight · we’re thinking that learned to be meat · when a group locks onto one thing, physics gets strange · death is the most interesting unsolved problem · clarity is the new scarce resource · build for humans or don’t bother · execution is the only proof · I don’t have an answer for this one · I sat with it for a week · ";

const CREDOS = [
  "Execution is the only proof",
  "Clarity over speed",
  "Built, broke, fixed",
  "Build for humans",
  "Calm intensity",
  "Shipped, not learned",
];

const BOOKS = [
  "The Book · Alan Watts",
  "Bhagavad Gita, Ch. 2",
  "The Beginning of Infinity",
  "The War of Art",
  "Finite and Infinite Games",
];

const STEPS = ["Day 1 · Brief", "Day 7 · Build", "Day 14 · Live"];

function spiralPath(): string {
  let d = "";
  for (let t = 0; t <= Math.PI * 11; t += 0.06) {
    const r = 14 + 5.6 * t;
    const x = 200 + r * Math.cos(t);
    const y = 200 + r * Math.sin(t);
    d += `${t === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  return d;
}
const SPIRAL_D = spiralPath();

type SectionId = "home" | "learn" | "live" | "studio" | "shipped";

const TABS: { id: SectionId; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" },
  { id: "learn", label: "Learn", icon: "M4 5h11a4 4 0 0 1 4 4v10H8a4 4 0 0 1-4-4z M8 9h7" },
  {
    id: "live",
    label: "Live",
    icon: "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M5 5a10 10 0 0 0 0 14 M19 5a10 10 0 0 1 0 14",
  },
  { id: "studio", label: "Studio", icon: "M3 4h18v16H3z M3 9h18" },
  { id: "shipped", label: "Shipped", icon: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5" },
];

/* ------------------------------------------------------------------ */

function Pic({
  src,
  alt,
  sizes,
  focal,
  priority = false,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  focal?: ImageFocal | null;
  priority?: boolean;
}) {
  if (!src) return <div className="v4-pic-empty" aria-hidden="true" />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimisableImage(src)}
      className="v4-pic"
      style={focal ? { objectPosition: `${focal.x}% ${focal.y}%` } : undefined}
      draggable={false}
    />
  );
}

function Arrow() {
  return (
    <span className="v4-arr" aria-hidden="true">
      →
    </span>
  );
}

function Icon({ d, size = 22 }: { d: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

function Band({ items, variant }: { items: string[]; variant: "a" | "b" }) {
  const row = (hidden: boolean) => (
    <div className="v4-trk" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <span key={i} className="v4-trk-item">
          <span>{t}</span>
          <i>{variant === "a" ? "✳" : "●"}</i>
        </span>
      ))}
    </div>
  );
  return (
    <div className={`v4-band v4-band-${variant}`}>
      {row(false)}
      {row(true)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Course detail sheet — bottom sheet on a phone, side panel on desktop */
/* ------------------------------------------------------------------ */

function CourseSheet({
  course,
  fontVars,
  gstin,
  onClose,
  triggerRef,
}: {
  course: V4Course;
  fontVars: string;
  gstin: string;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useModalBehavior({ open: true, onClose, panelRef, triggerRef });

  // Portalled: an ancestor with backdrop-filter or transform would become
  // the containing block for position:fixed and trap the sheet inside it.
  return createPortal(
    <div className={`v4 ${fontVars}`}>
      <div className="v4-scrim" onClick={onClose} aria-hidden="true" />
      <div ref={panelRef} className="v4-sheet" role="dialog" aria-modal="true" aria-label={course.title}>
        <div className="v4-grab" aria-hidden="true" />
        <div className="v4-sheet-head">
          <div>
            <span className="v4-m v4-gold-ink">{course.bestFor || course.level || "Course · self-paced"}</span>
            <h3 className="v4-d v4-sheet-title">{course.title}</h3>
          </div>
          <button type="button" className="v4-x" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="v4-sheet-lede">{course.description}</p>

        {course.outcomes.length > 0 && (
          <div className="v4-sheet-block">
            <p className="v4-m v4-muted">You leave with</p>
            <ul className="v4-list">
              {course.outcomes.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {course.forWho.length > 0 && (
          <div className="v4-sheet-block">
            <p className="v4-m v4-muted">For you if</p>
            <ul className="v4-list">
              {course.forWho.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {course.notForWho.length > 0 && (
          <div className="v4-sheet-block">
            <p className="v4-m v4-muted">Not for you if</p>
            <ul className="v4-list v4-list-no">
              {course.notForWho.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {course.modules.length > 0 && (
          <div className="v4-sheet-block">
            <p className="v4-m v4-muted">{course.modules.length} modules</p>
            {course.modules.map((m, i) => (
              <div key={i} className="v4-mrow">
                <span className="v4-m v4-gold-ink">{String(i + 1).padStart(2, "0")}</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
        )}

        <div className="v4-sheet-buy">
          <div className="v4-price-row">
            <span className="v4-price">{course.priceLabel}</span>
            {course.priceNote && <span className="v4-m v4-muted">{course.priceNote}</span>}
          </div>
          <CheckoutModal
            itemId={course.id}
            title={course.title}
            slug={course.slug}
            category={course.category}
            thumbnail={course.thumbnail}
            imageFocal={course.imageFocal}
            priceLabel={course.priceLabel}
            price={course.price}
            tax={course.tax}
            gstin={gstin}
            triggerLabel="Enroll · instant access →"
            triggerClassName="v4-btn v4-b-ink v4-w-full"
          />
          <Link href={`/items/${course.slug}`} className="v4-sheet-link">
            {course.hasFreeLesson ? "Watch the free lesson first" : "See the full course page"}
          </Link>
          <span className="v4-m v4-muted v4-center">Yours to keep · UPI, cards, netbanking</span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */

function Section({ id, className = "", children }: { id: SectionId | string; className?: string; children: ReactNode }) {
  return (
    <section id={id} data-v4-section={id} className={`v4-sec ${className}`}>
      {children}
    </section>
  );
}

export default function V4Home(props: V4HomeProps) {
  const { fontVars, courses, nextLive, pastLive, studio, shipped, credentials, links, waitlistHref, bioName, bioAvatar, gstin } =
    props;

  const [replay, setReplay] = useState(0);
  const [active, setActive] = useState<SectionId>("home");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [autoStep, setAutoStep] = useState(true);
  const [inhale, setInhale] = useState(true);
  const [mounted, setMounted] = useState(false);
  const sheetTrigger = useRef<HTMLElement>(null);

  useEffect(() => setMounted(true), []);

  // Studio demo: Brief → Build → Live, until someone picks a step.
  useEffect(() => {
    if (!autoStep) return;
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 3200);
    return () => clearInterval(t);
  }, [autoStep]);

  useEffect(() => {
    const t = setInterval(() => setInhale((v) => !v), 4000);
    return () => clearInterval(t);
  }, []);

  // Scroll-spy for the phone tab bar.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-v4-section]"));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute("data-v4-section") as SectionId | null;
        if (id && TABS.some((t) => t.id === id)) setActive(id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const go = (id: SectionId) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sheetCourse = courses.find((c) => c.id === sheetId) ?? null;
  const tabs = TABS.filter((t) => t.id !== "studio" || studio).filter((t) => t.id !== "shipped" || shipped.length);
  const year = new Date().getFullYear();

  return (
    <div className={`v4 ${fontVars}`}>
      {/* ---------- top bar ---------- */}
      <header className="v4-top">
        <a href="#home" className="v4-logo v4-d">
          deepanshu<span>.live</span>
        </a>
        <nav className="v4-top-links" aria-label="Main">
          <a href="#learn">Learn</a>
          <a href="#live">Live</a>
          {studio && <a href="#studio">Studio</a>}
          {shipped.length > 0 && <a href="#shipped">Shipped</a>}
          <a href="#seeker">Off the build</a>
          <Link href="/guide">Free guides</Link>
        </nav>
        <a href="#learn" className="v4-btn v4-b-ink v4-btn-sm">
          Start learning
        </a>
      </header>

      {/* ---------- hero ---------- */}
      <Section id="home" className="v4-hero">
        <div key={replay} className="v4-hero-anim">
          <div className="v4-spiral" aria-hidden="true">
            <svg viewBox="0 0 400 400">
              <defs>
                <path id="v4-spi" d={SPIRAL_D} />
              </defs>
              <text className="v4-spiral-text">
                <textPath href="#v4-spi">{SPIRAL_TEXT + SPIRAL_TEXT + SPIRAL_TEXT}</textPath>
              </text>
            </svg>
          </div>
          <div className="v4-wrap v4-hero-copy">
            <p className="v4-m v4-muted">{bioName || "Deepanshu Tyagi"} · Builder / Seeker</p>
            <h1 className="v4-h1 v4-d">
              I ship things.
              <br />
              <span className="v4-sf v4-gold-ink">Then I teach how.</span>
            </h1>
            <div className="v4-after">
              <p className="v4-lede">
                AI courses, live workshops, a studio that builds your site in 14 days, and the brands I run.
              </p>
              <div className="v4-row">
                <a href="#learn" className="v4-btn v4-b-ink">
                  Start learning <Arrow />
                </a>
                {studio && (
                  <a href="#studio" className="v4-btn v4-b-line">
                    Build my website
                  </a>
                )}
              </div>
              <div className="v4-row v4-row-tight">
                {nextLive ? (
                  <Link href={`/items/${nextLive.slug}`} className="v4-pill">
                    <span className="v4-dot" />
                    Next live · {nextLive.dateLabel} <Arrow />
                  </Link>
                ) : (
                  <a href="#live" className="v4-pill">
                    <span className="v4-dot" />
                    Next live session · waitlist open <Arrow />
                  </a>
                )}
                <button type="button" className="v4-replay" onClick={() => setReplay((r) => r + 1)}>
                  ↺ how I think
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- shortcuts ---------- */}
      <div className="v4-wrap" aria-label="Start here" role="navigation">
        <div className="v4-cuts">
          <a href="#learn" className="v4-cut">
            <span className="v4-go" aria-hidden="true">↗</span>
            <Icon d={TABS[1].icon} size={26} />
            <span>
              <b className="v4-d v4-cut-t">Learn</b>
              <span className="v4-m v4-muted">
                {String(courses.length).padStart(2, "0")} {courses.length === 1 ? "course" : "courses"} · self-paced
              </span>
            </span>
          </a>
          <a href="#live" className="v4-cut v4-cut-dark">
            <span className="v4-go" aria-hidden="true">↗</span>
            <span className="v4-dot v4-dot-lg" />
            <span>
              <b className="v4-d v4-cut-t">Live</b>
              <span className="v4-m v4-muted-dark">{nextLive ? nextLive.dateLabel : "Workshops · waitlist open"}</span>
            </span>
          </a>
          {studio && (
            <a href="#studio" className="v4-cut v4-cut-gold">
              <span className="v4-go" aria-hidden="true">↗</span>
              <Icon d={TABS[3].icon} size={26} />
              <span>
                <b className="v4-d v4-cut-t">Studio</b>
                <span className="v4-m">{studio.priceLabel}</span>
              </span>
            </a>
          )}
          {shipped.length > 0 && (
            <a href="#shipped" className="v4-cut">
              <span className="v4-go" aria-hidden="true">↗</span>
              <Icon d={TABS[4].icon} size={26} />
              <span>
                <b className="v4-d v4-cut-t">Shipped</b>
                <span className="v4-m v4-muted">Brands · ventures</span>
              </span>
            </a>
          )}
        </div>
      </div>

      <div className="v4-bands" aria-hidden="true">
        <Band items={CREDOS} variant="a" />
        <Band items={credentials} variant="b" />
      </div>

      {/* ---------- learn ---------- */}
      <Section id="learn" className="v4-learn">
        <div className="v4-wrap">
          <div className="v4-kick">
            <span className="v4-m v4-gold-ink">01 · Learn</span>
            <Link href="/courses" className="v4-m">
              All courses →
            </Link>
          </div>
          <h2 className="v4-h2 v4-d">
            Pick what you <span className="v4-sf">need.</span>
          </h2>
          <div className="v4-shelf">
            {courses.map((c, i) => (
              <article key={c.id} className="v4-card">
                <div className="v4-cov">
                  <Pic src={c.thumbnail} alt={`${c.title} course cover`} sizes="(min-width: 861px) 33vw, 82vw" focal={c.imageFocal} priority={i === 0} />
                  {(c.bestFor || c.level) && <span className="v4-tag v4-m">{c.bestFor || c.level}</span>}
                </div>
                <div className="v4-cbody">
                  <h3 className="v4-d v4-card-t">{c.title}</h3>
                  <p className="v4-card-p">{c.description}</p>
                  <div className="v4-price-row">
                    <span className="v4-price">{c.priceLabel}</span>
                    {c.priceNote && <span className="v4-m v4-muted">{c.priceNote}</span>}
                  </div>
                  <div className="v4-card-btns">
                    <button
                      type="button"
                      className="v4-btn v4-b-line v4-btn-card"
                      onClick={(e) => {
                        (sheetTrigger as React.MutableRefObject<HTMLElement | null>).current = e.currentTarget;
                        setSheetId(c.id);
                      }}
                    >
                      Details
                    </button>
                    <CheckoutModal
                      itemId={c.id}
                      title={c.title}
                      slug={c.slug}
                      category={c.category}
                      thumbnail={c.thumbnail}
                      imageFocal={c.imageFocal}
                      priceLabel={c.priceLabel}
                      price={c.price}
                      tax={c.tax}
                      gstin={gstin}
                      triggerLabel="Enroll"
                      triggerClassName="v4-btn v4-b-ink v4-btn-card"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="v4-m v4-muted v4-note-line">Pay once · yours to keep · UPI accepted · GST invoice</p>
        </div>
      </Section>

      {/* ---------- live ---------- */}
      <Section id="live" className="v4-live">
        <div className="v4-wrap">
          <div className="v4-kick">
            <span className="v4-m v4-gold-ink">02 · Live</span>
            <span className="v4-m v4-muted">On Zoom</span>
          </div>
          <h2 className="v4-h2 v4-d">
            Learn it <span className="v4-sf">with me.</span>
          </h2>
          <div className="v4-ticket">
            <div className="v4-stub">
              <span className="v4-m">Next live session</span>
              <span className="v4-d v4-stub-big">{nextLive ? nextLive.dateLabel : "TBA"}</span>
              <span className="v4-m">
                {nextLive ? nextLive.seatsLabel || nextLive.priceLabel : "Seats go to the waitlist first"}
              </span>
            </div>
            <div className="v4-tbody">
              {nextLive ? (
                <>
                  <p className="v4-t-p">{nextLive.title}. A few focused hours, live. You build it with me and ask as you go.</p>
                  <Link href={`/items/${nextLive.slug}`} className="v4-btn v4-b-gold">
                    Reserve my seat <Arrow />
                  </Link>
                </>
              ) : (
                <>
                  <p className="v4-t-p">A few focused hours, live. You build the workflow with me and ask questions as you go.</p>
                  <a
                    href={waitlistHref}
                    className="v4-btn v4-b-gold"
                    {...(waitlistHref.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    Get the date on WhatsApp <Arrow />
                  </a>
                </>
              )}
              {pastLive && (
                <p className="v4-m v4-muted-dark">
                  Previously · {pastLive.title} · {pastLive.dateLabel} · ran ✓
                </p>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* ---------- studio ---------- */}
      {studio && (
        <Section id="studio" className="v4-studio">
          <div className="v4-wrap v4-studio-grid">
            <div className="v4-studio-copy">
              <span className="v4-m v4-gold-ink">03 · Studio</span>
              <h2 className="v4-h2 v4-d">
                I build it <span className="v4-sf">for you.</span>
              </h2>
              <p className="v4-lede">{studio.description}</p>
              <div className="v4-row">
                <Link href={`/agency`} className="v4-btn v4-b-ink">
                  Get a quote <Arrow />
                </Link>
                <b className="v4-d v4-studio-price">{studio.priceLabel}</b>
              </div>
            </div>
            <div className="v4-demo">
              <div className="v4-tabs" role="tablist" aria-label="How a studio project runs">
                {STEPS.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    role="tab"
                    aria-selected={i === step}
                    className={`v4-tab ${i === step ? "is-on" : i < step ? "is-done" : ""}`}
                    onClick={() => {
                      setAutoStep(false);
                      setStep(i);
                    }}
                  >
                    <i>
                      <b key={`${i}-${step}`} />
                    </i>
                    {label}
                  </button>
                ))}
              </div>
              <div className="v4-browser" aria-hidden="true">
                <div className="v4-bar">
                  <span />
                  <span />
                  <span />
                  <div className="v4-url v4-m">yourbrand.in</div>
                </div>
                <div className={`v4-canvas v4-st${step}`}>
                  {step === 0 ? (
                    <p className="v4-typing">
                      &gt; brief.txt
                      <br />
                      brand: your business
                      <br />
                      goal: more enquiries
                      <br />
                      pages: home, menu, book
                      <span className="v4-caret" />
                    </p>
                  ) : (
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
                  {step === 1 && <div className="v4-scanline" />}
                  {step === 2 && (
                    <span className="v4-livebadge v4-m">
                      <span className="v4-dot" />
                      Live · day 14
                    </span>
                  )}
                </div>
              </div>
              <p className="v4-m v4-muted">Concept preview</p>
            </div>
          </div>
        </Section>
      )}

      {/* ---------- shipped ---------- */}
      {shipped.length > 0 && (
        <Section id="shipped" className="v4-shipped">
          <div className="v4-wrap">
            <div className="v4-kick">
              <span className="v4-m v4-gold-ink">{studio ? "04" : "03"} · Shipped</span>
              <span className="v4-m v4-muted">Execution is the only proof</span>
            </div>
            <h2 className="v4-h2 v4-d">
              Things I <span className="v4-sf">built.</span>
            </h2>
            <div className="v4-wall">
              {shipped.map((s) => (
                <a
                  key={s.id}
                  href={s.href}
                  className="v4-tile"
                  {...(s.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <Pic src={s.thumbnail} alt="" sizes="(min-width: 861px) 33vw, 50vw" focal={s.imageFocal} />
                  <span className="v4-tt">
                    <span className="v4-m v4-gold">{s.label}</span>
                    <b className="v4-d v4-tile-t">
                      {s.title}
                      {s.external ? " ↗" : ""}
                    </b>
                  </span>
                </a>
              ))}
              {credentials.slice(0, 2).map((c, i) => (
                <div key={c} className={`v4-tile v4-stat ${i === 1 ? "v4-stat-dark" : ""}`}>
                  <span className="v4-m">Proof</span>
                  <b className="v4-d v4-stat-t">{c}</b>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ---------- seeker ---------- */}
      <section id="seeker" className="v4-seek">
        <div className="v4-wrap v4-center">
          <p className="v4-m v4-gold">Off the build</p>
          <div className="v4-breath" aria-hidden="true">
            <span className="v4-ring" />
            <span className="v4-ring v4-r2" />
            <span className="v4-core" />
            <span className="v4-m v4-breath-w">{inhale ? "Breathe in" : "Breathe out"}</span>
          </div>
          <p className="v4-d v4-seek-t">
            I meditate. I dance.{" "}
            <span className="v4-sf v4-gold">I think about death more than most people think about lunch.</span>
          </p>
          <p className="v4-seek-p">Those aren&rsquo;t the opposite of building. They&rsquo;re the same engine.</p>
          <p className="v4-m v4-muted-dark">On my desk</p>
          <div className="v4-books">
            {BOOKS.map((b) => (
              <span key={b} className="v4-book">
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- note ---------- */}
      <section className="v4-sec">
        <div className="v4-wrap">
          <div className="v4-note">
            <span className="v4-m v4-gold-ink">A note from me</span>
            <p className="v4-d v4-note-t">
              Learning without shipping is a very comfortable way to hide. I did it for years. Not anymore.
            </p>
            <p className="v4-note-p">Everything here, I built, broke and fixed first. Take what helps.</p>
            <div className="v4-sign">
              {bioAvatar && (
                <span className="v4-avatar">
                  <Pic src={bioAvatar} alt={bioName} sizes="48px" />
                </span>
              )}
              <span className="v4-sf v4-sign-name">{(bioName || "Deepanshu").split(" ")[0]}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="v4-foot">
        <div className="v4-wrap">
          <p className="v4-d v4-foot-t">
            Build for humans, <span className="v4-sf v4-gold">or don&rsquo;t bother.</span>
          </p>
          <div className="v4-row">
            <Link href="/contact" className="v4-btn v4-b-gold">
              Talk to me <Arrow />
            </Link>
            {links.whatsapp && (
              <a href={links.whatsapp} className="v4-btn v4-b-line" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            )}
            {links.instagram && (
              <a href={links.instagram} className="v4-btn v4-b-line" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            )}
            {links.youtube && (
              <a href={links.youtube} className="v4-btn v4-b-line" target="_blank" rel="noopener noreferrer">
                YouTube
              </a>
            )}
          </div>
          <div className="v4-fgrid">
            <div>
              <p className="v4-m v4-muted-dark">Learn</p>
              <Link href="/courses">Courses</Link>
              <Link href="/workshops">Workshops</Link>
              <Link href="/guide">Free guides</Link>
            </div>
            <div>
              <p className="v4-m v4-muted-dark">Work</p>
              <Link href="/agency">Studio</Link>
              <Link href="/shop">Shop</Link>
              <Link href="/ventures">Ventures</Link>
              <Link href="/portfolio">Portfolio ↗</Link>
            </div>
            <div>
              <p className="v4-m v4-muted-dark">Legal</p>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/refund-policy">Refunds</Link>
              <Link href="/shipping-policy">Shipping</Link>
            </div>
            <div>
              <p className="v4-m v4-muted-dark">Contact</p>
              {links.email && <a href={`mailto:${links.email}`}>{links.email}</a>}
              {links.linkedin && (
                <a href={links.linkedin} target="_blank" rel="noopener noreferrer">
                  LinkedIn
                </a>
              )}
              <p className="v4-foot-small">© {year} Deepanshu Tyagi · Meerut, UP</p>
            </div>
          </div>
        </div>
      </footer>

      {/* ---------- phone tab bar ---------- */}
      <nav className="v4-tabbar" aria-label="Sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`v4-tb ${active === t.id ? "is-on" : ""}`}
            aria-current={active === t.id ? "true" : undefined}
            onClick={() => go(t.id)}
          >
            <Icon d={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </nav>

      {mounted && sheetCourse && (
        <CourseSheet
          course={sheetCourse}
          fontVars={fontVars}
          gstin={gstin}
          onClose={() => setSheetId(null)}
          triggerRef={sheetTrigger}
        />
      )}
    </div>
  );
}

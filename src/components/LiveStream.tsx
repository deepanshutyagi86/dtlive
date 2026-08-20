"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import ItemImage from "./ItemImage";
import { CATEGORY_CTA, CATEGORY_LABELS, CHIP_CLASS, Category, ImageFocal } from "@/lib/types";

export interface StreamItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  meta: string; // short line, e.g. "₹999 · self-paced" or "Sat 9 Aug · 14 seats left"
  external?: string | null; // if set, card links out instead of to /items/[slug]
  thumbnail: string | null;
  imageFocal?: ImageFocal | null;
}

// Cards sit flat and level. Three classes made up the old "scattered" look
// and all are gone deliberately: the alternating tilt (odd:-rotate-[1.6deg] /
// even:rotate-[1.3deg]), its hover:!rotate-0 straightener, and the
// even:translate-y-2 that dropped every second card 8px. Keep them aligned.
const CARD_CLASS =
  "flex-none w-[270px] md:w-[290px] bg-card border border-line rounded-card overflow-hidden flex flex-col shadow-[0_14px_34px_-18px_rgba(25,25,19,0.28)] transition-transform duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_26px_50px_-20px_rgba(25,25,19,0.4)] hover:z-10 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone";

// Past this many pixels of pointer travel, the gesture was a drag and the
// click that the browser fires on release must be swallowed. Below it, the
// user meant to tap the card. 6px is roughly the wobble of a deliberate
// click on a trackpad — low enough that a real click never gets eaten.
const DRAG_CLICK_THRESHOLD = 6;

// course/workshop have a real detail page; agency has no per-item page (it
// links to the /agency listing instead — see CategoryGrid for the actual
// "get a quote" flow on that listing); shop/venture with no externalUrl set
// have nowhere safe to send a click at all, so the card renders unlinked.
function hrefFor(item: StreamItem): { href: string; external: boolean } | null {
  if (item.external) return { href: item.external, external: true };
  if (item.category === "course" || item.category === "workshop") return { href: `/items/${item.slug}`, external: false };
  if (item.category === "agency") return { href: "/agency", external: false };
  return null;
}

function Card({ item, clone }: { item: StreamItem; clone?: boolean }) {
  const link = hrefFor(item);
  const inner = (
    <>
      <ItemImage
        thumbnail={item.thumbnail}
        title={item.title}
        category={item.category}
        seed={item.slug}
        sizes="(min-width: 768px) 290px, 270px"
        imageFocal={item.imageFocal}
      />
      <div className="flex flex-col gap-3 p-[18px] pt-3 pb-4 flex-1">
        <div className="flex items-center justify-between">
          <span className={`font-mono text-[10px] font-bold tracking-wider uppercase px-[9px] py-1 rounded-full border ${CHIP_CLASS[item.category]}`}>
            {CATEGORY_LABELS[item.category]}
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] text-live-ink font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-live live-dot" />
            LIVE
          </span>
        </div>
        <div className="font-display font-bold text-[21px] tracking-tight leading-tight">{item.title}</div>
        <div className="text-[16px] leading-relaxed text-ink-soft flex-1">{item.description}</div>
        <div className="font-mono text-[11px] text-muted">{item.meta}</div>
        {link && (
          <div className="flex items-center justify-between font-semibold text-sm border-t border-line pt-3 mt-0.5 group-hover:text-marigold-ink">
            <span>{CATEGORY_CTA[item.category]}</span>
            <span className="transition-transform group-hover:translate-x-1.5">→</span>
          </div>
        )}
      </div>
    </>
  );

  if (!link) {
    return <div className={CARD_CLASS}>{inner}</div>;
  }

  return (
    <Link
      href={link.href}
      target={link.external ? "_blank" : undefined}
      rel={link.external ? "noopener" : undefined}
      // The track renders every item twice so the loop can wrap seamlessly.
      // The second copy is decorative: without these two attributes a
      // screen reader announces the whole catalogue twice and a keyboard
      // user has to Tab through it twice to get past the carousel.
      aria-hidden={clone ? true : undefined}
      tabIndex={clone ? -1 : undefined}
      className={CARD_CLASS}
    >
      {inner}
    </Link>
  );
}

export default function LiveStream({ items }: { items: StreamItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const state = useRef({
    x: 0, vx: -0.55, dragging: false, lastPX: 0, half: 0,
    paused: false, wheeling: false, travel: 0, suppressClick: false,
  });

  useEffect(() => {
    const stream = streamRef.current;
    const wrap = wrapRef.current;
    if (!stream || !wrap || items.length === 0) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = state.current;

    const measure = () => (s.half = stream.scrollWidth / 2);
    measure();
    window.addEventListener("resize", measure);

    let raf = 0;
    const frame = () => {
      if (!s.dragging) {
        // Autoplay decay is suppressed both on hover (s.paused) and while
        // actively wheeling (s.wheeling) — otherwise the ambient drift
        // would be constantly fighting the velocity the wheel handler
        // just injected.
        if (!s.paused && !s.wheeling && !reduceMotion) s.vx += (-0.55 - s.vx) * 0.02;
        s.x += s.vx;
      }
      if (s.half > 0) {
        if (s.x <= -s.half) s.x += s.half;
        if (s.x > 0) s.x -= s.half;
      }
      stream.style.transform = `translateX(${s.x}px)`;
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    start();

    // The old version ran requestAnimationFrame for the life of the page,
    // repainting a transform on an element scrolled far off screen — real
    // battery cost on a phone for zero visible effect. The observer parks
    // the loop entirely whenever the carousel isn't on screen.
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) start();
          else stop();
        },
        { rootMargin: "200px" }
      );
      observer.observe(wrap);
    }

    const px = (e: MouseEvent | TouchEvent) => ("touches" in e ? e.touches[0].clientX : e.clientX);
    const down = (e: MouseEvent | TouchEvent) => {
      s.dragging = true;
      s.travel = 0;
      wrap.classList.add("cursor-grabbing");
      s.lastPX = px(e);
      s.vx = 0;
    };
    const move = (e: MouseEvent | TouchEvent) => {
      if (!s.dragging) return;
      const p = px(e);
      const dx = p - s.lastPX;
      s.lastPX = p;
      s.x += dx;
      s.vx = dx;
      s.travel += Math.abs(dx);
    };
    const up = () => {
      if (!s.dragging) return;
      s.dragging = false;
      // The browser fires a click on release regardless of how far the
      // pointer travelled, so a drag that ends over a card used to
      // navigate away mid-scroll — on a surface whose own label says
      // "drag to scroll". Arm the suppression here and disarm it in the
      // capture-phase click handler below.
      s.suppressClick = s.travel > DRAG_CLICK_THRESHOLD;
      wrap.classList.remove("cursor-grabbing");
    };

    // Capture phase, so this runs before the anchor's own default and
    // before React's synthetic handlers. stopPropagation alone wouldn't
    // stop navigation — the anchor's default has to be prevented too.
    const clickGuard = (e: MouseEvent) => {
      if (!s.suppressClick) return;
      s.suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    let wheelIdleTimer: ReturnType<typeof setTimeout>;
    // Claim horizontal intent only. A trackpad two-finger swipe (or a
    // mouse's horizontal tilt-wheel) reports a larger |deltaX| than
    // |deltaY|; shift+wheel is the standard way to go horizontal with a
    // plain vertical mouse wheel. Anything else — normal vertical
    // scrolling — must fall through untouched: no preventDefault, no
    // effect on vx. Getting this wrong breaks page scroll over the
    // carousel, which is worse than the problem this fixes.
    const wheel = (e: WheelEvent) => {
      const horizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (!horizontalSwipe && !e.shiftKey) return;
      e.preventDefault();
      // Not every browser remaps shift+wheel onto deltaX before dispatch —
      // Chrome does, but Firefox and Safari on macOS leave it on deltaY.
      // Falling back to deltaY only inside the shift branch (never
      // otherwise) covers both without changing the non-shift read.
      const delta = e.shiftKey ? e.deltaX || e.deltaY : e.deltaX;
      // Sign matches drag: dragging left moves the pointer to a smaller x
      // (negative dx) and shifts the track left. A trackpad "swipe left"
      // reports a positive deltaX (the native convention behind
      // `scrollLeft += deltaX`), so it has to be negated here to produce
      // the same leftward shift — feeding delta in unsigned would run
      // the carousel backwards relative to drag.
      s.vx = -delta;
      s.wheeling = true;
      clearTimeout(wheelIdleTimer);
      wheelIdleTimer = setTimeout(() => {
        s.wheeling = false;
      }, 150);
    };

    const onEnter = () => (s.paused = true);
    const onLeave = () => (s.paused = false);

    wrap.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    wrap.addEventListener("click", clickGuard, true);
    wrap.addEventListener("touchstart", down, { passive: true });
    wrap.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    wrap.addEventListener("mouseenter", onEnter);
    wrap.addEventListener("mouseleave", onLeave);
    wrap.addEventListener("wheel", wheel, { passive: false });

    return () => {
      stop();
      observer?.disconnect();
      clearTimeout(wheelIdleTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
      wrap.removeEventListener("mousedown", down);
      // touchstart/touchmove were added and never removed. The effect
      // re-runs whenever `items` changes identity, against the SAME
      // persistent wrap node and with fresh closures, so the handlers
      // stacked: after one re-run every touchmove applied its delta twice
      // and dragging on a phone ran at double speed.
      wrap.removeEventListener("touchstart", down);
      wrap.removeEventListener("touchmove", move);
      wrap.removeEventListener("click", clickGuard, true);
      wrap.removeEventListener("mouseenter", onEnter);
      wrap.removeEventListener("mouseleave", onLeave);
      wrap.removeEventListener("wheel", wheel);
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-10 text-muted font-mono text-sm">
        Nothing live right now — check back soon.
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden py-6 pb-10 cursor-grab select-none touch-pan-y"
      aria-roledescription="carousel"
      aria-label="What's live right now"
    >
      <div ref={streamRef} className="flex gap-[22px] w-max px-5 will-change-transform">
        {items.map((item) => (
          <Card key={`a-${item.id}`} item={item} />
        ))}
        {items.map((item) => (
          <Card key={`b-${item.id}`} item={item} clone />
        ))}
      </div>
    </div>
  );
}

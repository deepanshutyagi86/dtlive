"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { CATEGORY_CTA, CATEGORY_LABELS, Category } from "@/lib/types";

export interface StreamItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  meta: string; // short line, e.g. "₹999 · self-paced" or "Sat 9 Aug · 14 seats left"
  external?: string | null; // if set, card links out instead of to /items/[slug]
}

const CHIP_CLASS: Record<Category, string> = {
  course: "bg-marigold border-marigold",
  workshop: "bg-ink text-bone border-ink",
  venture: "bg-transparent border-ink",
  shop: "bg-transparent border-ink border-dashed",
  agency: "bg-bone border-ink",
};

const CARD_CLASS =
  "flex-none w-[270px] md:w-[290px] bg-card border border-line rounded-card p-[18px] pb-4 flex flex-col gap-3 shadow-[0_14px_34px_-18px_rgba(25,25,19,0.28)] transition-transform duration-300 hover:!rotate-0 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_26px_50px_-20px_rgba(25,25,19,0.4)] hover:z-10 odd:-rotate-[1.6deg] even:rotate-[1.3deg] even:translate-y-2 group";

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

function Card({ item }: { item: StreamItem }) {
  const link = hrefFor(item);
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className={`font-mono text-[10px] font-bold tracking-wider uppercase px-[9px] py-1 rounded-full border ${CHIP_CLASS[item.category]}`}>
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-live font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-live live-dot" />
          LIVE
        </span>
      </div>
      <div className="font-display font-bold text-[21px] tracking-tight leading-tight">{item.title}</div>
      <div className="text-[16px] leading-relaxed text-ink-soft flex-1">{item.description}</div>
      <div className="font-mono text-[11px] text-muted">{item.meta}</div>
      {link && (
        <div className="flex items-center justify-between font-semibold text-sm border-t border-line pt-3 mt-0.5 group-hover:text-marigold-deep">
          <span>{CATEGORY_CTA[item.category]}</span>
          <span className="transition-transform group-hover:translate-x-1.5">→</span>
        </div>
      )}
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
      className={CARD_CLASS}
    >
      {inner}
    </Link>
  );
}

export default function LiveStream({ items }: { items: StreamItem[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const state = useRef({ x: 0, vx: -0.55, dragging: false, lastPX: 0, half: 0, paused: false });

  useEffect(() => {
    const stream = streamRef.current;
    const wrap = wrapRef.current;
    if (!stream || !wrap || items.length === 0) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const s = state.current;

    const measure = () => (s.half = stream.scrollWidth / 2);
    measure();
    window.addEventListener("resize", measure);

    let raf: number;
    const frame = () => {
      if (!s.dragging) {
        if (!s.paused && !reduceMotion) s.vx += (-0.55 - s.vx) * 0.02;
        s.x += s.vx;
      }
      if (s.half > 0) {
        if (s.x <= -s.half) s.x += s.half;
        if (s.x > 0) s.x -= s.half;
      }
      stream.style.transform = `translateX(${s.x}px)`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const px = (e: MouseEvent | TouchEvent) => ("touches" in e ? e.touches[0].clientX : e.clientX);
    const down = (e: MouseEvent | TouchEvent) => {
      s.dragging = true;
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
    };
    const up = () => {
      s.dragging = false;
      wrap.classList.remove("cursor-grabbing");
    };

    wrap.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    wrap.addEventListener("touchstart", down, { passive: true });
    wrap.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    wrap.addEventListener("mouseenter", () => (s.paused = true));
    wrap.addEventListener("mouseleave", () => (s.paused = false));

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
    };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="max-w-[1200px] mx-auto px-5 py-10 text-muted font-mono text-sm">
        Nothing live right now — check back soon.
      </div>
    );
  }

  const doubled = [...items, ...items];

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden py-6 pb-10 cursor-grab select-none touch-pan-y">
      <div ref={streamRef} className="flex gap-[22px] w-max px-5 will-change-transform">
        {doubled.map((item, i) => (
          <Card key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

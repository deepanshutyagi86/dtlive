"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ItemImage from "./ItemImage";
import type { Category, ImageFocal } from "@/lib/types";

export interface SpotlightData {
  slug: string;
  title: string;
  description: string;
  chips: string[]; // e.g. ["Sat 9 Aug · 11:00 IST", "Live on Zoom", "14 seats left", "₹499 early bird"]
  deadlineISO: string;
  ctaLabel: string;
  showCountdown?: boolean;
  // The featured item's own artwork. Carried here so the spotlight is
  // image-led like every other surface; falls back to the same generated
  // placeholder as the cards when the item has no photo yet.
  category: Category;
  thumbnail: string | null;
  imageFocal?: ImageFocal | null;
}

function useCountdown(deadlineISO: string) {
  const [parts, setParts] = useState({ d: "--", h: "--", m: "--", s: "--" });
  useEffect(() => {
    const deadline = new Date(deadlineISO).getTime();
    // A featured course passes "" — there is no real deadline to count to.
    // Bail before starting an interval that would tick "NaN" once a second.
    if (Number.isNaN(deadline)) return;
    const tick = () => {
      const ms = Math.max(0, deadline - Date.now());
      const d = Math.floor(ms / 864e5);
      const h = Math.floor(ms / 36e5) % 24;
      const m = Math.floor(ms / 6e4) % 60;
      const s = Math.floor(ms / 1e3) % 60;
      const pad = (n: number) => String(n).padStart(2, "0");
      setParts({ d: pad(d), h: pad(h), m: pad(m), s: pad(s) });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadlineISO]);
  return parts;
}

export default function Spotlight({ data }: { data: SpotlightData }) {
  const cd = useCountdown(data.deadlineISO);
  const hot = data.chips[data.chips.length - 1] ?? "";
  const showCountdown = data.showCountdown !== false;

  return (
    <section className="max-w-[1200px] mx-auto px-5 mt-10 md:mt-14">
      <div className="relative overflow-hidden bg-ink text-bone rounded-card p-7 md:p-[54px] grid md:grid-cols-[1.4fr_1fr] gap-8 items-center">
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase px-[9px] py-1 rounded-full border border-marigold text-marigold">
              Featured
            </span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-live-ink font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-live live-dot" />
              LIVE
            </span>
          </div>
          <h2 className="font-display font-extrabold text-[28px] md:text-[52px] tracking-tight leading-[1.05]">
            {data.title}
          </h2>
          <p className="mt-3.5 text-[15.5px] leading-relaxed text-[#b9b8ae] max-w-[480px]">
            {data.description}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {data.chips.map((c, i) => (
              <span
                key={i}
                className={`font-mono text-[11px] px-3 py-1.5 rounded-full border ${
                  c === hot ? "border-marigold text-marigold" : "border-[#3c3b33] text-bone"
                }`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-5 items-start">
          {/* Capped rather than full-bleed: at the container's 1fr this
              column can run 400px+ wide on a large screen, and a hero-sized
              photo would out-shout the headline it is supposed to support. */}
          <div className="w-full max-w-[320px] rounded-card overflow-hidden border border-[#3c3b33]">
            <ItemImage
              thumbnail={data.thumbnail}
              title={data.title}
              category={data.category}
              seed={data.slug}
              sizes="(min-width: 768px) 320px, 100vw"
              imageFocal={data.imageFocal}
            />
          </div>
          {showCountdown && (
            <div className="flex gap-2.5">
              {(["d", "h", "m", "s"] as const).map((k, i) => (
                <div key={k} className="flex items-center gap-2.5">
                  <div className="text-center">
                    <b className="block font-display font-extrabold text-[26px] md:text-[44px] tracking-tight min-w-[2ch]">
                      {cd[k]}
                    </b>
                    <small className="block font-mono text-[10px] tracking-wider uppercase text-[#8b8a80]">
                      {{ d: "days", h: "hrs", m: "min", s: "sec" }[k]}
                    </small>
                  </div>
                  {i < 3 && <span className="font-display font-extrabold text-[26px] md:text-[44px] text-[#3c3b33]">:</span>}
                </div>
              ))}
            </div>
          )}
          <Link
            href={`/items/${data.slug}`}
            className="text-[16px] px-[26px] py-3.5 rounded-full bg-marigold border border-marigold text-ink font-semibold hover:bg-bone hover:border-bone transition-colors"
          >
            {data.ctaLabel} →
          </Link>
          <span className="font-mono text-[11px] text-[#8b8a80]">Secured by Razorpay · instant confirmation</span>
        </div>
      </div>
    </section>
  );
}

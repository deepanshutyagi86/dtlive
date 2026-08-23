import Link from "next/link";
import type { GuideCtaSettings } from "@/lib/settings-types";

// The last thing on a course/workshop page before the footer. Someone who
// read the whole sales page and didn't buy is exactly who a free guide
// converts later — entirely admin-editable, including whether it shows.
export default function GuideCta({ data }: { data: GuideCtaSettings }) {
  if (!data.enabled) return null;

  return (
    <section className="mt-14 bg-card border border-line rounded-card p-8 text-center">
      <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">{data.eyebrow}</p>
      <h2 className="font-display font-extrabold text-[24px] md:text-[28px] tracking-tight mb-2">{data.title}</h2>
      <p className="text-[15px] leading-relaxed text-ink-soft max-w-[440px] mx-auto mb-5">{data.subtitle}</p>
      <Link
        href="/guide"
        className="inline-flex items-center gap-2 bg-ink text-bone font-semibold text-sm px-6 py-3 rounded-full hover:bg-marigold hover:text-ink transition-colors"
      >
        {data.buttonLabel} <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

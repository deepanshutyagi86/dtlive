import { taxFor, taxModeFor } from "@/lib/settings-types";
import Link from "next/link";
import type { CardItem } from "./ItemCard";
import type { CourseDetails } from "@/lib/types";
import { priceLabel } from "@/lib/tax";
import { DEFAULT_TAX, type TaxSettings } from "@/lib/settings-types";

// Three courses at the same price with one sentence each is a decision
// people avoid by leaving. This strip answers "which one is mine?" in a
// single scan — who it's for, what you build, how long, what level.
//
// Every column is admin-editable per item (details.bestFor,
// details.buildOutcome, details.level, details.duration) and the whole
// block hides itself when fewer than two courses are live or when nobody
// has filled anything in — an empty comparison table is worse than none.
export default function CourseCompare({ items, tax = DEFAULT_TAX }: { items: CardItem[]; tax?: TaxSettings }) {
  const courses = items.filter((i) => i.category === "course");
  if (courses.length < 2) return null;

  const rows = courses.map((c) => {
    const d = (c.details ?? {}) as CourseDetails & {
      bestFor?: string;
      buildOutcome?: string;
      level?: string;
    };
    return {
      slug: c.slug,
      title: c.title,
      bestFor: (d.bestFor ?? "").trim(),
      buildOutcome: (d.buildOutcome ?? "").trim(),
      level: (d.level ?? "").trim(),
      duration: (d.duration ?? "").trim(),
      price: d.price,
      // Each row carries its OWN resolved GST — this strip lists several
      // courses side by side, and one of them may have tax switched off.
      // A single shared `tax` would print the wrong suffix on that row.
      tax: taxFor(tax, taxModeFor(c.details)),
    };
  });

  const hasContent = rows.some((r) => r.bestFor || r.buildOutcome || r.level);
  if (!hasContent) return null;

  return (
    <section className="mt-20">
      <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">Side by side</p>
      <h2 className="font-display font-extrabold text-[28px] md:text-[38px] tracking-tight leading-tight mb-7">
        Which one is yours?
      </h2>

      {/* Its own horizontal scroller so a four-column table on a phone
          scrolls inside this box instead of making the whole page scroll
          sideways. */}
      <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-ink">
              <th scope="col" className="font-mono text-[10.5px] uppercase tracking-wider text-muted font-normal pb-3 pr-4 w-[26%]">
                Course
              </th>
              <th scope="col" className="font-mono text-[10.5px] uppercase tracking-wider text-muted font-normal pb-3 pr-4">
                Best for
              </th>
              <th scope="col" className="font-mono text-[10.5px] uppercase tracking-wider text-muted font-normal pb-3 pr-4">
                You leave with
              </th>
              <th scope="col" className="font-mono text-[10.5px] uppercase tracking-wider text-muted font-normal pb-3 whitespace-nowrap">
                Level &amp; length
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b border-line align-top">
                <th scope="row" className="py-5 pr-4 font-normal">
                  <Link
                    href={`/items/${r.slug}`}
                    className="font-display font-bold text-[17px] tracking-tight hover:text-marigold-ink transition-colors"
                  >
                    {r.title}
                  </Link>
                  {Number.isFinite(r.price) && (
                    <span className="block font-mono text-[11px] text-muted mt-1">{priceLabel(r.price, r.tax)}</span>
                  )}
                </th>
                <td className="py-5 pr-4 text-[15px] leading-relaxed text-ink-soft">{r.bestFor || "—"}</td>
                <td className="py-5 pr-4 text-[15px] leading-relaxed text-ink-soft">{r.buildOutcome || "—"}</td>
                <td className="py-5 text-[15px] leading-relaxed text-ink-soft">
                  {[r.level, r.duration].filter(Boolean).join(" · ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

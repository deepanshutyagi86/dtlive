import Link from "next/link";
import type { StarterSettings } from "@/lib/settings-types";

// Three doors are five doors too many for a first-time visitor deciding
// what this site even is. This block routes on intent ("I want to learn" /
// "I want it built" / "I want something free") rather than on category
// name, and sits above the full Doors list for exactly that reason.
// Entirely admin-editable, including whether it shows at all.
export default function StarterRouter({ data }: { data: StarterSettings }) {
  if (!data.enabled || data.options.length === 0) return null;

  return (
    <section className="max-w-[1200px] mx-auto px-5 pt-16 pb-2">
      <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">{data.eyebrow}</p>
      <h2 className="font-display font-extrabold text-[26px] md:text-[38px] tracking-tight leading-tight mb-7">
        {data.title}
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {data.options.map((o) => (
          <Link
            key={`${o.href}-${o.label}`}
            href={o.href}
            className="group bg-card border border-line rounded-card p-5 sm:p-6 flex flex-col gap-2 hover:border-ink hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(25,25,19,0.35)] transition-all"
          >
            <span className="font-display font-bold text-[19px] sm:text-[21px] tracking-tight">{o.label}</span>
            <span className="text-[15px] leading-relaxed text-ink-soft flex-1">{o.sub}</span>
            <span className="flex items-center justify-between font-semibold text-sm pt-2 group-hover:text-marigold-ink transition-colors">
              <span>Take me there</span>
              <span className="transition-transform group-hover:translate-x-1.5">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

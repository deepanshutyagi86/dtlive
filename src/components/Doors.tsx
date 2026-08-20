import Link from "next/link";
import ItemCard, { type CardItem } from "./ItemCard";

// Each door now says what it actually is before showing what's in it. The
// old version was five names and a hover-revealed line — a visitor had to
// click through to find out whether "Ventures" was something they could buy.
const DOORS: {
  name: string;
  href: string;
  key: string;
  eyebrow: string;
  sub: string;
  empty: string;
}[] = [
  {
    name: "Courses",
    href: "/courses",
    key: "course",
    eyebrow: "Learn at your own pace",
    sub: "Recorded video courses you buy once and keep forever. Start the minute you pay, finish whenever you like.",
    empty: "No course is open right now.",
  },
  {
    name: "Workshops",
    href: "/workshops",
    key: "workshop",
    eyebrow: "Live, on a fixed date",
    sub: "Hands-on sessions run live on Zoom with me. A real date, a real seat, and you leave having built something.",
    empty: "No workshop is scheduled right now.",
  },
  {
    name: "Agency",
    href: "/agency",
    key: "agency",
    eyebrow: "I build it for you",
    sub: "Websites, apps and growth work delivered for your business — you tell me the goal, I ship the thing.",
    empty: "Not taking new work at the moment.",
  },
  {
    name: "Shop",
    href: "/shop",
    key: "shop",
    eyebrow: "Products my brands sell",
    sub: "Physical products from the brands I run. Each one opens the real marketplace listing — Amazon, Flipkart, Meesho or our own store.",
    empty: "Nothing listed yet.",
  },
  {
    name: "Ventures",
    href: "/ventures",
    key: "venture",
    eyebrow: "Businesses I own a piece of",
    sub: "The companies I hold equity in and work on every day. Nothing to buy here — this is what I do when I'm not teaching.",
    empty: "Nothing to show yet.",
  },
];

// Two columns of a 1160px content box, minus the gap. Two-up from the
// smallest phone width up now, so this is 50vw all the way down.
const SECTION_IMAGE_SIZES = "(min-width: 1200px) 570px, 50vw";

export default function Doors({
  counts,
  items,
}: {
  counts: Record<string, number>;
  items: CardItem[];
}) {
  return (
    <section className="max-w-[1200px] mx-auto px-5 pt-20 pb-10">
      <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-8">Everything, in one place</p>

      {DOORS.map((d) => {
        const list = items.filter((i) => i.category === d.key);
        const n = counts[d.key] ?? list.length;

        return (
          <div key={d.key} className="border-t border-ink pt-7 pb-14 last:pb-0">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div>
                <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">{d.eyebrow}</p>
                <h2 className="font-display font-extrabold text-[34px] md:text-[56px] tracking-tight leading-none">
                  <Link href={d.href} className="hover:text-marigold-deep transition-colors">
                    {d.name}
                  </Link>
                </h2>
              </div>
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5 font-mono text-xs text-muted">
                  {n > 0 && <span className="w-1.5 h-1.5 rounded-full bg-live live-dot" />}
                  {n ? `${String(n).padStart(2, "0")} live` : "soon"}
                </span>
                <Link
                  href={d.href}
                  className="font-semibold text-sm hover:text-marigold-ink transition-colors whitespace-nowrap"
                >
                  See all →
                </Link>
              </div>
            </div>

            <p className="mt-3.5 max-w-[620px] text-[15px] md:text-[16px] leading-relaxed text-ink-soft">{d.sub}</p>

            {list.length === 0 ? (
              <div className="mt-7 border border-dashed border-line rounded-card p-8 text-center">
                <p className="font-display font-bold text-lg">{d.empty}</p>
                <p className="text-muted mt-1.5 text-[15px]">Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-5 mt-7">
                {list.map((item) => (
                  <ItemCard key={item.slug} item={item} sizes={SECTION_IMAGE_SIZES} compact />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

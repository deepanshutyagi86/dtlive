import Link from "next/link";
import Nav from "./Nav";
import Footer, { FooterLinks } from "./Footer";
import { CATEGORY_CTA, CATEGORY_LABELS, Category } from "@/lib/types";
import type { AgencyDetails, CourseDetails, WorkshopDetails } from "@/lib/types";

export interface GridItem {
  slug: string;
  title: string;
  description: string;
  category: Category;
  details: any;
}

const COPY: Record<string, { title: string; blurb: string }> = {
  course: { title: "Courses", blurb: "Self-paced business & tech courses. Pay once, learn forever." },
  workshop: { title: "Workshops", blurb: "Live, hands-on sessions. Real dates, limited seats." },
  agency: { title: "Agency", blurb: "Websites, apps and growth — done for your business." },
};

function metaLine(item: GridItem): string {
  const d = item.details;
  if (item.category === "course") return `₹${(d as CourseDetails).price} · ${(d as CourseDetails).duration ?? "self-paced"}`;
  if (item.category === "workshop") {
    const w = d as WorkshopDetails;
    const date = new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `${date} · ${w.seatsLeft} seats left`;
  }
  if (item.category === "agency") {
    const a = d as AgencyDetails;
    return a.priceType === "quote" ? "Custom quote" : `from ₹${a.priceValue}`;
  }
  return "";
}

export default function CategoryGrid({
  category,
  items,
  footerLinks,
}: {
  category: "course" | "workshop" | "agency";
  items: GridItem[];
  footerLinks: FooterLinks;
}) {
  const copy = COPY[category];
  return (
    <>
      <Nav />
      <main className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted mb-2">{CATEGORY_LABELS[category]}s</p>
        <h1 className="font-display font-semibold text-[34px] md:text-[56px] tracking-[-0.02em] leading-[1]">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[560px] text-[15px] md:text-[16px] leading-7 text-ink-soft">{copy.blurb}</p>

        {items.length === 0 ? (
          <div className="mt-16 border border-dashed border-line rounded-card p-10 text-center">
            <p className="font-display font-semibold text-[22px]">Nothing live right now</p>
            <p className="text-muted mt-2 text-[15px] leading-6">Check back soon, or ping me on WhatsApp to ask what&apos;s next.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {items.map((item) => (
              <Link
                key={item.slug}
                href={`/items/${item.slug}`}
                className="group bg-card border border-line rounded-card p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(25,25,19,0.35)] transition-all"
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] w-fit px-2.5 py-1 rounded-full border border-ink bg-bone">
                  {CATEGORY_LABELS[item.category]}
                </span>
                <div className="font-display font-semibold text-[20px] tracking-[-0.01em]">{item.title}</div>
                <div className="text-[15px] leading-6 text-ink-soft flex-1">{item.description}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{metaLine(item)}</div>
                <div className="flex items-center justify-between font-medium text-[14px] border-t border-line pt-3 group-hover:text-marigold-deep">
                  <span>{CATEGORY_CTA[item.category]}</span>
                  <span className="group-hover:translate-x-1.5 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer links={footerLinks} />
    </>
  );
}

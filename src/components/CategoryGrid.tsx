import Link from "next/link";
import Nav from "./Nav";
import Footer, { FooterLinks } from "./Footer";
import RegisterModal from "./RegisterModal";
import ItemImage from "./ItemImage";
import { CATEGORY_CTA, CATEGORY_LABELS, CHIP_CLASS, Category, ImageFocal } from "@/lib/types";
import type { AgencyDetails, CourseDetails, WorkshopDetails } from "@/lib/types";

export interface GridItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  details: any;
  thumbnail: string | null;
  imageFocal?: ImageFocal | null;
}

const COPY: Record<string, { title: string; blurb: string }> = {
  course: { title: "Courses", blurb: "Self-paced business & tech courses. Pay once, learn forever." },
  workshop: { title: "Workshops", blurb: "Live, hands-on sessions. Real dates, limited seats." },
  agency: { title: "Agency", blurb: "Websites, apps and growth — done for your business." },
};

// Grid cards get roughly a third of the row on desktop, full width stacked
// on mobile — a wider box than the carousel's fixed 270-290px cards, so the
// same source image is requested at a different size.
const GRID_IMAGE_SIZES = "(min-width: 768px) 33vw, 100vw";

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
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">{CATEGORY_LABELS[category]}s</p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[64px] tracking-tight leading-none">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[520px] text-ink-soft">{copy.blurb}</p>

        {items.length === 0 ? (
          <div className="mt-16 border border-dashed border-line rounded-card p-10 text-center">
            <p className="font-display font-bold text-xl">Nothing live right now</p>
            <p className="text-muted mt-2 text-[16px]">Check back soon, or ping me on WhatsApp to ask what&apos;s next.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {items.map((item) => {
              const image = (
                <ItemImage
                  thumbnail={item.thumbnail}
                  title={item.title}
                  category={item.category}
                  seed={item.slug}
                  sizes={GRID_IMAGE_SIZES}
                  imageFocal={item.imageFocal}
                />
              );
              const cardInner = (
                <>
                  <span className={`font-mono text-[10px] font-bold tracking-wider uppercase w-fit px-2.5 py-1 rounded-full border ${CHIP_CLASS[item.category]}`}>
                    {CATEGORY_LABELS[item.category]}
                  </span>
                  <div className="font-display font-bold text-xl tracking-tight">{item.title}</div>
                  <div className="text-[16px] leading-relaxed text-ink-soft flex-1">{item.description}</div>
                  <div className="font-mono text-[11px] text-muted">{metaLine(item)}</div>
                </>
              );

              // Agency items have no detail page (they're a quote request, not
              // a checkout) — open the lead-capture flow instead of linking
              // to /items/[slug], which 404s for this category.
              if (item.category === "agency") {
                return (
                  <div key={item.slug} className="bg-card border border-line rounded-card overflow-hidden flex flex-col">
                    {image}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      {cardInner}
                      <div className="flex items-center justify-between border-t border-line pt-3">
                        <RegisterModal
                          itemId={item.id}
                          title={item.title}
                          slug={item.slug}
                          category={item.category}
                          thumbnail={item.thumbnail}
                          imageFocal={item.imageFocal}
                          triggerLabel={`${CATEGORY_CTA[item.category]} →`}
                          triggerClassName="font-semibold text-sm hover:text-marigold-deep transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <Link
                  key={item.slug}
                  href={`/items/${item.slug}`}
                  className="group bg-card border border-line rounded-card overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(25,25,19,0.35)] transition-all"
                >
                  {image}
                  <div className="p-5 flex flex-col gap-3 flex-1">
                    {cardInner}
                    <div className="flex items-center justify-between font-semibold text-sm border-t border-line pt-3 group-hover:text-marigold-deep">
                      <span>{CATEGORY_CTA[item.category]}</span>
                      <span className="group-hover:translate-x-1.5 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer links={footerLinks} />
    </>
  );
}

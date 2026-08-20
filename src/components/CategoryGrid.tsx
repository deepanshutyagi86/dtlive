import Nav from "./Nav";
import Footer, { FooterLinks } from "./Footer";
import ItemCard, { type CardItem } from "./ItemCard";
import CourseCompare from "./CourseCompare";
import { CATEGORY_LABELS } from "@/lib/types";
import { getBio, getNav } from "@/lib/site-settings";

// The card shape is shared with the directories and the homepage sections.
// Re-exported under the old name so the three category pages keep importing
// what they always did.
export type GridItem = CardItem;

const COPY: Record<string, { title: string; blurb: string }> = {
  course: { title: "Courses", blurb: "Self-paced business & tech courses. Pay once, learn forever." },
  workshop: { title: "Workshops", blurb: "Live, hands-on sessions. Real dates, limited seats." },
  agency: { title: "Agency", blurb: "Websites, apps and growth — done for your business." },
};

// Grid cards get roughly a third of the row on desktop, full width stacked
// on mobile — a wider box than the carousel's fixed 270-290px cards, so the
// same source image is requested at a different size.
const GRID_IMAGE_SIZES = "(min-width: 768px) 33vw, 100vw";

// Reads nav/bio itself rather than taking them as props: this component is
// a server component and every page that renders it would otherwise have to
// thread the same two settings through unchanged.
export default async function CategoryGrid({
  category,
  items,
  footerLinks,
}: {
  category: "course" | "workshop" | "agency";
  items: GridItem[];
  footerLinks: FooterLinks;
}) {
  const [nav, bio] = await Promise.all([getNav(), getBio()]);
  const copy = COPY[category];

  return (
    <>
      <Nav nav={nav} />
      <main className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-24">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">{CATEGORY_LABELS[category]}s</p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[64px] tracking-tight leading-none">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-[520px] text-ink-soft">{copy.blurb}</p>

        {items.length === 0 ? (
          <div className="mt-16 border border-dashed border-line rounded-card p-10 text-center">
            <p className="font-display font-bold text-xl">Nothing live right now</p>
            <p className="text-muted mt-2 text-[16px]">Check back soon, or get in touch to ask what&apos;s next.</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-5 mt-12">
              {items.map((item) => (
                <ItemCard key={item.slug} item={item} sizes={GRID_IMAGE_SIZES} />
              ))}
            </div>
            {category === "course" && <CourseCompare items={items} />}
          </>
        )}
      </main>
      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

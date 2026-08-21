import Nav from "./Nav";
import Footer, { FooterLinks } from "./Footer";
import ItemCard, { type CardItem } from "./ItemCard";
import { getBio, getNav, getTaxSettingsForDisplay } from "@/lib/site-settings";

// Same card as the category pages and the homepage sections; the shop and
// venture variations (which storefront, how much equity, external link
// instead of a detail page) live inside ItemCard itself.
export type DirectoryItem = CardItem;

// Same rationale as CategoryGrid: a grid column is wider than a fixed-width
// carousel card, so it gets its own sizes hint rather than reusing the
// carousel's.
const GRID_IMAGE_SIZES = "(min-width: 768px) 33vw, 100vw";

export default async function DirectoryGrid({
  kind,
  title,
  blurb,
  items,
  footerLinks,
}: {
  kind: "shop" | "venture";
  title: string;
  blurb: string;
  items: DirectoryItem[];
  footerLinks: FooterLinks;
}) {
  const [nav, bio, tax] = await Promise.all([getNav(), getBio(), getTaxSettingsForDisplay()]);

  return (
    <>
      <Nav nav={nav} />
      <main className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-24">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">
          {kind === "shop" ? "Directory" : "Equity"}
        </p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[64px] tracking-tight leading-none">
          {title}
        </h1>
        <p className="mt-3 max-w-[560px] text-ink-soft">{blurb}</p>

        {items.length === 0 ? (
          <div className="mt-16 border border-dashed border-line rounded-card p-10 text-center">
            <p className="font-display font-bold text-xl">Nothing listed yet</p>
            <p className="text-muted mt-2 text-[16px]">Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {items.map((item) => (
              <ItemCard key={item.slug} item={item} sizes={GRID_IMAGE_SIZES} tax={tax} />
            ))}
          </div>
        )}
      </main>
      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

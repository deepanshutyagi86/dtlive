import Nav from "./Nav";
import Footer, { FooterLinks } from "./Footer";
import type { ShopDetails, VentureDetails } from "@/lib/types";

export interface DirectoryItem {
  slug: string;
  title: string;
  description: string;
  category: "shop" | "venture";
  details: ShopDetails | VentureDetails;
}

export default function DirectoryGrid({
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
  return (
    <>
      <Nav />
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
            <p className="text-muted mt-2 text-sm">Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {items.map((item) => {
              const d = item.details as any;
              const externalUrl = kind === "shop" ? (d as ShopDetails).externalUrl : (d as VentureDetails).externalUrl;
              const tag =
                kind === "shop"
                  ? `${(d as ShopDetails).platform} · ${(d as ShopDetails).brand}`
                  : (d as VentureDetails).status === "coming-soon"
                    ? "Coming soon"
                    : `${(d as VentureDetails).equityPercent ?? 0}% equity`;
              return (
                <a
                  key={item.slug}
                  href={externalUrl || "#"}
                  target="_blank"
                  rel="noopener"
                  className="group bg-card border border-line rounded-card p-5 flex flex-col gap-3 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(25,25,19,0.35)] transition-all"
                >
                  <span className="font-mono text-[10px] font-bold tracking-wider uppercase w-fit px-2.5 py-1 rounded-full border border-ink bg-bone">
                    {tag}
                  </span>
                  <div className="font-display font-bold text-xl tracking-tight">{item.title}</div>
                  <div className="text-sm text-ink-soft flex-1">{item.description}</div>
                  <div className="flex items-center justify-between font-semibold text-sm border-t border-line pt-3 group-hover:text-marigold-deep">
                    <span>Visit {kind === "shop" ? "store" : "site"}</span>
                    <span className="group-hover:translate-x-1.5 transition-transform">↗</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
      <Footer links={footerLinks} />
    </>
  );
}

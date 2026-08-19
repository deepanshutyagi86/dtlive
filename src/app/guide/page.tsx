import Link from "next/link";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import GuideCover from "@/components/GuideCover";
import { getSetting } from "@/lib/items";
import { getLiveGuides, formatBytes } from "@/lib/guides";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free guides — Deepanshu Tyagi",
  description: "Free PDF guides and playbooks. Download them, no signup needed.",
  openGraph: {
    title: "Free guides — Deepanshu Tyagi",
    description: "Free PDF guides and playbooks. Download them, no signup needed.",
  },
};

const GRID_IMAGE_SIZES = "(min-width: 768px) 33vw, 100vw";

export default async function GuidesPage() {
  const [guides, footerLinks] = await Promise.all([
    getLiveGuides(),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);

  return (
    <>
      <Nav />
      <main className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-24">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">Free downloads</p>
        <h1 className="font-display font-extrabold text-[40px] md:text-[64px] tracking-tight leading-none">Guides</h1>
        <p className="mt-3 max-w-[520px] text-ink-soft">
          Playbooks and breakdowns I&apos;ve written, as PDFs. Free, no email required — just download.
        </p>

        {guides.length === 0 ? (
          <div className="mt-16 border border-dashed border-line rounded-card p-10 text-center">
            <p className="font-display font-bold text-xl">Nothing here yet</p>
            <p className="text-muted mt-2 text-[16px]">The first guide is on its way. Check back shortly.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {guides.map((guide) => (
              <article
                key={guide.id}
                className="bg-card border border-line rounded-card overflow-hidden flex flex-col"
              >
                <Link href={`/guide/${guide.slug}`} className="block">
                  <GuideCover cover={guide.cover} title={guide.title} focal={guide.coverFocal} sizes={GRID_IMAGE_SIZES} />
                </Link>
                <div className="p-5 flex flex-col flex-1">
                  <h2 className="font-display font-bold text-[20px] leading-tight tracking-tight">
                    <Link href={`/guide/${guide.slug}`} className="hover:text-marigold-deep transition-colors">
                      {guide.title}
                    </Link>
                  </h2>
                  {guide.description && (
                    <p className="text-ink-soft text-[15px] mt-2 line-clamp-3">{guide.description}</p>
                  )}
                  <p className="font-mono text-[10.5px] tracking-wider uppercase text-muted mt-3">
                    PDF{guide.fileSize ? ` · ${formatBytes(guide.fileSize)}` : ""}
                  </p>
                  <div className="mt-auto pt-5 flex items-center gap-3">
                    <a
                      href={`/guide/${guide.slug}/download`}
                      className="inline-flex items-center gap-2 font-semibold text-sm bg-ink text-bone px-[18px] py-[10px] rounded-full border border-ink hover:bg-marigold hover:border-marigold hover:text-ink transition-colors"
                    >
                      Download ↓
                    </a>
                    <Link href={`/guide/${guide.slug}`} className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink transition-colors">
                      Details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer links={footerLinks} />
    </>
  );
}

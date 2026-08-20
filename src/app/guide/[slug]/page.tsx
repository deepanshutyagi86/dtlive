import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import GuideCover from "@/components/GuideCover";
import { getSetting } from "@/lib/items";
import { getBio, getNav } from "@/lib/site-settings";
import { getLiveGuideBySlug, formatBytes } from "@/lib/guides";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const guide = await getLiveGuideBySlug(params.slug);
  if (!guide) return {};
  return {
    title: `${guide.title} — Free guide by Deepanshu Tyagi`,
    description: guide.description || "A free PDF guide. Download it, no signup needed.",
    openGraph: {
      title: guide.title,
      description: guide.description,
      images: guide.cover ? [guide.cover] : [],
    },
  };
}

export default async function GuideDetailPage({ params }: { params: { slug: string } }) {
  const [guide, footerLinks, nav, bio] = await Promise.all([
    getLiveGuideBySlug(params.slug),
    getSetting<FooterLinks>("footerLinks", {}),
    getNav(),
    getBio(),
  ]);

  if (!guide) notFound();

  return (
    <>
      <Nav nav={nav} />
      <main className="max-w-[900px] mx-auto px-5 pt-[118px] pb-24">
        <Link href="/guide" className="font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink transition-colors">
          ← All guides
        </Link>

        <div className="mt-6 rounded-card overflow-hidden border border-line">
          <GuideCover
            cover={guide!.cover}
            title={guide!.title}
            focal={guide!.coverFocal}
            sizes="(min-width: 900px) 900px, 100vw"
            aspectClassName="aspect-[16/9]"
          />
        </div>

        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mt-8">
          Free PDF{guide!.fileSize ? ` · ${formatBytes(guide!.fileSize)}` : ""}
        </p>
        <h1 className="font-display font-extrabold text-[34px] md:text-[52px] tracking-tight leading-[1.05] mt-2">
          {guide!.title}
        </h1>
        {guide!.description && (
          <p className="mt-4 max-w-[640px] text-ink-soft text-[17px] whitespace-pre-line">{guide!.description}</p>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href={`/guide/${guide!.slug}/download`}
            className="inline-flex items-center gap-2 font-semibold text-[15px] bg-ink text-bone px-6 py-3.5 rounded-full border border-ink hover:bg-marigold hover:border-marigold hover:text-ink transition-colors"
          >
            Download the PDF ↓
          </a>
          <a
            href={guide!.fileUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 font-semibold text-[15px] px-6 py-3.5 rounded-full border border-line hover:border-ink transition-colors"
          >
            Read in browser
          </a>
        </div>
      </main>
      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

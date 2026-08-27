import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import { getItemBySlug, getSetting } from "@/lib/items";
import { getBio, getNav, getSyllabusSettings, syllabusFor, SITE_URL } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

// Vercel Blob serves inline by default; this query param is what turns the
// same URL into a save-to-disk. One file, two behaviours, no second upload.
function downloadUrl(url: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=1`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const [item, settings] = await Promise.all([getItemBySlug(params.slug), getSyllabusSettings()]);
  if (!item || !syllabusFor(item.details, settings)) return {};
  const title = `${item.title} — ${settings.heading}`;
  return {
    title,
    description: settings.blurb,
    alternates: { canonical: `/items/${item.slug}/syllabus` },
    openGraph: {
      type: "article",
      title,
      description: settings.blurb,
      url: `${SITE_URL}/items/${item.slug}/syllabus`,
      images: item.thumbnail ? [item.thumbnail] : [],
    },
  };
}

export default async function SyllabusPage({ params }: { params: { slug: string } }) {
  const [item, settings, footerLinks, nav, bio] = await Promise.all([
    getItemBySlug(params.slug),
    getSyllabusSettings(),
    getSetting<FooterLinks>("footerLinks", {}),
    getNav(),
    getBio(),
  ]);

  // The same three questions the link asked before rendering itself: is the
  // item real and live, is its category one that has a detail page, and do
  // both syllabus switches agree. A link must never reach a page that then
  // decides it disagrees.
  if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
    notFound();
  }
  const syllabus = syllabusFor(item!.details, settings);
  if (!syllabus) notFound();

  return (
    <>
      <Nav nav={nav} />

      <main className="max-w-[1100px] mx-auto px-5 pt-[120px] pb-24">
        <Link
          href={`/items/${item!.slug}`}
          className="inline-flex items-center gap-2 min-h-[44px] font-mono text-[11px] uppercase tracking-wider text-muted hover:text-ink transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
        >
          <span aria-hidden>←</span> Back to {item!.title}
        </Link>

        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mt-2 mb-2">{item!.title}</p>
        <h1 className="font-display font-extrabold text-[38px] md:text-[56px] tracking-tight leading-[1.02]">
          {settings.heading}
        </h1>
        <p className="mt-3 max-w-[560px] text-[17px] leading-relaxed text-ink-soft">{settings.blurb}</p>

        <div className="flex flex-wrap gap-3 mt-7">
          <a
            href={downloadUrl(syllabus.url)}
            className="inline-flex items-center gap-2 bg-ink text-bone font-semibold text-sm px-6 py-3.5 rounded-full border border-ink hover:bg-marigold hover:border-marigold hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
          >
            {settings.downloadLabel}
          </a>
          <a
            href={syllabus.url}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 border border-ink font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-ink hover:text-bone transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-bone"
          >
            Open in a new tab ↗
          </a>
        </div>

        {/* <object> rather than <iframe>: its children are the fallback the
            browser renders when it cannot display the type itself, which is
            exactly the iOS Safari case. An iframe renders an empty grey box
            there instead, with no way to say what happened. */}
        <div className="mt-9 rounded-card overflow-hidden border border-line bg-card">
          <object
            data={syllabus.url}
            type="application/pdf"
            aria-label={`${item!.title} — ${settings.heading}`}
            className="w-full h-[78vh] min-h-[520px] block"
          >
            <div className="px-6 py-16 text-center">
              <p className="font-display font-bold text-xl">This browser won&apos;t show the PDF inline.</p>
              <p className="text-ink-soft mt-2 max-w-[380px] mx-auto leading-relaxed">
                Phones usually don&apos;t. Open it in a tab or save it — it&apos;s the same file either way.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <a
                  href={syllabus.url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 bg-ink text-bone font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-marigold hover:text-ink transition-colors"
                >
                  Open the PDF ↗
                </a>
                <a
                  href={downloadUrl(syllabus.url)}
                  className="inline-flex items-center gap-2 border border-ink font-semibold text-sm px-6 py-3.5 rounded-full hover:bg-ink hover:text-bone transition-colors"
                >
                  {settings.downloadLabel}
                </a>
              </div>
            </div>
          </object>
        </div>
      </main>

      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

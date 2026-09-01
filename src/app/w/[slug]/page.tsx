import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import CheckoutModal from "@/components/CheckoutModal";
import RegisterModal from "@/components/RegisterModal";
import MetaPixelView from "@/components/MetaPixelView";
import { ItemVideoOverlay } from "@/components/ItemVideo";
import { getItemById } from "@/lib/items";
import { adPageFor, getBusinessSettings, getTaxSettingsForDisplay, SITE_URL } from "@/lib/site-settings";
import { isDeadlinePassed } from "@/lib/settings-types";
import { formatRupees, priceLabel as taxPriceLabel } from "@/lib/tax";
import { DEFAULT_REGISTRATION_FIELDS, type RegistrationField } from "@/lib/types";
import type { Metadata } from "next";

// A page paid for by the click. Nothing here may be stale, and nothing
// here may be slow.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await adPageFor(params.slug);
  if (!page) return {};
  return {
    title: page.headline,
    description: page.subheadline,
    alternates: { canonical: `/w/${page.slug}` },
    // noindex: an ad page carries a price that exists for one campaign.
    // Left in the index it outlives the campaign and shows a stranger a
    // number you are no longer offering. `follow` so link previews still
    // resolve — this URL is pasted into WhatsApp far more than it is
    // searched for.
    robots: { index: false, follow: true },
    openGraph: {
      type: "website",
      title: page.headline,
      description: page.subheadline,
      url: `${SITE_URL}/w/${page.slug}`,
      images: page.heroImageUrl ? [page.heroImageUrl] : [],
    },
  };
}

export default async function AdLandingPage({ params }: { params: { slug: string } }) {
  const page = await adPageFor(params.slug);
  // Covers unknown slug and switched-off page alike: there is no page here.
  if (!page) notFound();

  const [item, tax, business] = await Promise.all([
    getItemById(page.itemId),
    getTaxSettingsForDisplay(),
    getBusinessSettings(),
  ]);

  // A page whose item was deleted or unpublished would render a button
  // that 404s on click. Better to 404 the page itself.
  if (!item || !item.live) notFound();

  const closed = isDeadlinePassed(page.deadlineIso);
  const price = page.price !== undefined ? page.price : (item.details as { price?: number }).price ?? 0;
  const priceLabel = page.kind === "paid" ? taxPriceLabel(price, tax) : null;
  const strikeLabel = page.strikePrice && page.strikePrice > price ? formatRupees(page.strikePrice) : null;

  const registrationFields: RegistrationField[] =
    (item.details as { registrationFields?: RegistrationField[] }).registrationFields?.length
      ? (item.details as { registrationFields: RegistrationField[] }).registrationFields
      : DEFAULT_REGISTRATION_FIELDS;

  const ctaClass =
    "block w-full text-center bg-marigold border border-marigold text-ink font-semibold text-[17px] px-6 py-4 rounded-full hover:bg-ink hover:text-bone hover:border-ink transition-colors";

  const cta = closed ? (
    <p className="text-center font-semibold text-[15px] text-ink-soft border border-line rounded-full px-6 py-4">
      This one has closed.
    </p>
  ) : page.kind === "paid" ? (
    <CheckoutModal
      itemId={item.id}
      title={page.headline || item.title}
      slug={item.slug}
      category={item.category}
      thumbnail={item.thumbnail}
      imageFocal={(item.details as any)?.imageFocal ?? null}
      priceLabel={priceLabel ?? ""}
      tax={tax}
      gstin={business.gstin}
      triggerClassName={ctaClass}
      triggerLabel={page.ctaLabel || "Get instant access"}
      // A slug, not a price. The server re-reads what this page charges.
      adPage={page.slug}
    />
  ) : (
    <RegisterModal
      itemId={item.id}
      title={page.headline || item.title}
      slug={item.slug}
      category={item.category}
      thumbnail={item.thumbnail}
      imageFocal={(item.details as any)?.imageFocal ?? null}
      registrationFields={registrationFields}
      triggerClassName={ctaClass}
      triggerLabel={page.ctaLabel || "Save my seat"}
      adPage={page.slug}
    />
  );

  return (
    <>
      <MetaPixelView
        contentId={`ad:${page.slug}`}
        contentName={page.headline || item.title}
        value={page.kind === "paid" ? price : undefined}
      />

      {/* No nav, no menu, no links out. Every exit from this page is a
          click you already paid for and did not get. The wordmark is not
          a link for the same reason. */}
      <header className="border-b border-ink">
        <div className="max-w-[720px] mx-auto px-5 h-[60px] flex items-center justify-between">
          <span className="font-display font-extrabold text-[17px]">
            DT<span className="text-marigold-ink">.live</span>
          </span>
          {page.badge && !closed && (
            <span className="font-mono text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full bg-ink text-bone">
              {page.badge}
            </span>
          )}
        </div>
      </header>

      {/* One narrow column. A landing page that reads like a document
          converts better than one that reads like a website. */}
      <main className="max-w-[720px] mx-auto px-5 py-10 md:py-14">
        <h1 className="font-display font-extrabold text-[34px] md:text-[52px] tracking-tight leading-[1.05]">
          {page.headline}
        </h1>
        {page.subheadline && (
          <p className="text-[18px] md:text-[19px] leading-relaxed text-ink-soft mt-4">{page.subheadline}</p>
        )}

        {(page.heroImageUrl || page.videoUrl) && (
          <div className="relative w-full aspect-video rounded-card overflow-hidden border border-ink mt-8">
            {page.heroImageUrl ? (
              <Image
                src={page.heroImageUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 720px) 100vw, 720px"
                className="object-cover"
                style={
                  page.imageFocal
                    ? { objectPosition: `${page.imageFocal.x}% ${page.imageFocal.y}%` }
                    : undefined
                }
              />
            ) : (
              <div className="absolute inset-0 bg-ink" />
            )}
            {page.videoUrl && (
              <ItemVideoOverlay video={{ url: page.videoUrl }} title={page.headline || item.title} />
            )}
          </div>
        )}

        {/* The offer, above the fold on a phone wherever possible. Cold
            traffic decides in seconds, and a price they have to scroll for
            reads as a price you are hiding. */}
        <div className="border border-ink rounded-card p-6 mt-9 bg-card">
          {priceLabel && (
            <p className="flex items-baseline gap-3 mb-1">
              <span className="font-display font-extrabold text-[38px] tracking-tight">{priceLabel}</span>
              {strikeLabel && (
                <span className="font-mono text-[17px] text-muted line-through">{strikeLabel}</span>
              )}
            </p>
          )}
          {page.scarcity && !closed && (
            <p className="font-mono text-[12px] text-live-ink mb-4">{page.scarcity}</p>
          )}
          <div className={priceLabel ? "mt-5" : ""}>{cta}</div>
          {page.trustLine && !closed && (
            <p className="text-center font-mono text-[11px] text-muted mt-3">{page.trustLine}</p>
          )}
        </div>

        {page.bullets.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display font-bold text-2xl tracking-tight mb-5">What you get</h2>
            <ul className="flex flex-col gap-3">
              {page.bullets.map((line, i) => (
                <li key={i} className="flex gap-3 text-[17px] leading-relaxed">
                  <span aria-hidden className="text-marigold-deep font-bold shrink-0">
                    →
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {page.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display font-bold text-2xl tracking-tight mb-4">Questions</h2>
            <div className="border-t border-ink">
              {page.faq.map((entry, i) => (
                <details key={i} className="border-b border-ink group">
                  <summary className="flex items-center justify-between gap-3 py-4 px-1 cursor-pointer list-none font-display font-bold text-[16px]">
                    {entry.q}
                    <span
                      aria-hidden
                      className="font-display font-bold text-xl text-marigold-deep transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pb-4 px-1 text-[16px] leading-relaxed text-ink-soft whitespace-pre-line">
                    {entry.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Repeated CTA. Someone who read to the bottom has decided, and
            should not have to scroll back up to act on it. */}
        {!closed && <div className="mt-12">{cta}</div>}

        {/* The only links off the page, and only the ones a payment page
            is obliged to carry. */}
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] text-muted mt-12">
          <Link href="/terms" className="hover:text-ink transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink transition-colors">
            Privacy
          </Link>
          <Link href="/refund-policy" className="hover:text-ink transition-colors">
            Refunds
          </Link>
          <span>{business.tradeName}</span>
        </p>
      </main>
    </>
  );
}

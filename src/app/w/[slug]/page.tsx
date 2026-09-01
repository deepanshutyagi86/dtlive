import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import CheckoutModal from "@/components/CheckoutModal";
import RegisterModal from "@/components/RegisterModal";
import MetaPixelView from "@/components/MetaPixelView";
import AdCountdown from "@/components/ads/AdCountdown";
import { ItemVideoOverlay } from "@/components/ItemVideo";
import { getItemById } from "@/lib/items";
import { adPageFor, getBusinessSettings, getTaxSettingsForDisplay, SITE_URL } from "@/lib/site-settings";
import { isDeadlinePassed } from "@/lib/settings-types";
import { formatRupees, priceLabel as taxPriceLabel } from "@/lib/tax";
import { DEFAULT_REGISTRATION_FIELDS, type RegistrationField, type WorkshopDetails } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";
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
    // noindex: an ad price exists for one campaign. Left in the index it
    // outlives the campaign and shows a stranger a number you no longer
    // offer. `follow` so link previews still resolve — this URL is pasted
    // into WhatsApp far more than it is searched for.
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: SITE_TZ,
    }) + " IST"
  );
}

export default async function AdLandingPage({ params }: { params: { slug: string } }) {
  const page = await adPageFor(params.slug);
  // Unknown slug and switched-off page alike: there is no page here.
  if (!page) notFound();

  const [item, tax, business] = await Promise.all([
    getItemById(page.itemId),
    getTaxSettingsForDisplay(),
    getBusinessSettings(),
  ]);
  // A page whose item was deleted or unpublished would render a button
  // that fails on click. Better to 404 the page itself.
  if (!item || !item.live) notFound();

  const dark = page.theme !== "light";
  const closed = isDeadlinePassed(page.deadlineIso);

  const details = item.details as Partial<WorkshopDetails> & { imageFocal?: { x: number; y: number } };
  const price = page.price !== undefined ? page.price : details.price ?? 0;
  const priceLabel = page.kind === "paid" ? taxPriceLabel(price, tax) : null;
  const strikeLabel = page.strikePrice && page.strikePrice > price ? formatRupees(page.strikePrice) : null;

  // Facts that already live on the item auto-fill, so the same date is
  // never typed in two places and cannot drift between them.
  const dateLabel = page.dateLabel || (details.date ? formatDate(details.date) : "");
  const locationLabel = page.locationLabel || details.joining?.location || "";
  const priceChip = page.priceChipLabel || (priceLabel ? `${priceLabel} early bird` : "");

  // Real remaining seats, falling as people actually buy. The only kind of
  // scarcity worth printing — a typed number stops being true the moment
  // someone pays, and buyers notice.
  //
  // seatsOverride only ever fills in for an item with NO seat tracking of
  // its own (unlimitedSeats). A tracked workshop's real seatsLeft always
  // wins regardless of what an ad page sets — otherwise a stale or
  // mistaken override could make a sold-out workshop look available.
  const seatsLeft = details.unlimitedSeats ? page.seatsOverride ?? null : details.seatsLeft ?? null;
  const seatsTotal = details.unlimitedSeats ? null : details.seatsTotal ?? null;
  const showSeats = page.showSeats !== false && seatsLeft !== null && seatsLeft > 0 && !closed;
  const soldOut = page.showSeats !== false && seatsLeft !== null && seatsLeft <= 0;

  const registrationFields: RegistrationField[] = details.registrationFields?.length
    ? details.registrationFields
    : DEFAULT_REGISTRATION_FIELDS;

  // Two palettes, expressed as class strings rather than CSS variables:
  // Tailwind compiles the classes it can see in the source, so a colour
  // chosen at runtime has to be one of a fixed set of real classes.
  // Plain `marigold` reads well on the dark surface, but at 1.85:1 against
  // bone it fails contrast outright for small text — `marigold-ink` is
  // this codebase's existing safe variant for that (see tailwind.config).
  // Any marigold text sitting on the theme-dependent background (not the
  // always-dark sticky bar) has to switch with the theme.
  const t = dark
    ? {
        page: "bg-ink text-bone",
        sub: "text-[#c9c8bd]",
        muted: "text-[#8b8a80]",
        panel: "bg-[#232219] border-[#3c3b33]",
        line: "border-[#3c3b33]",
        chip: "border-[#3c3b33]",
        accent: "text-marigold",
        accentBorder: "border-marigold",
        // A full literal token, not `hover:${accent}` — Tailwind's scanner
        // needs the whole class name to appear verbatim in the source, and
        // a runtime-built compound like that never does.
        accentHover: "hover:text-marigold",
      }
    : {
        page: "bg-bone text-ink",
        sub: "text-ink-soft",
        muted: "text-muted",
        panel: "bg-card border-ink",
        line: "border-ink",
        chip: "border-ink",
        accent: "text-marigold-ink",
        accentBorder: "border-marigold-ink",
        accentHover: "hover:text-marigold-ink",
      };

  const ctaClass =
    "block w-full text-center bg-marigold border border-marigold text-ink font-semibold text-[17px] px-6 py-4 rounded-full hover:bg-marigold-deep hover:border-marigold-deep transition-colors";

  const ctaLabel = page.ctaLabel || (page.kind === "paid" ? "Reserve my seat →" : "Save my seat →");

  const cta =
    closed || soldOut ? (
      <p className={`text-center font-semibold text-[15px] border rounded-full px-6 py-4 ${t.line} ${t.muted}`}>
        {soldOut ? "All seats are taken." : "Registration has closed."}
      </p>
    ) : page.kind === "paid" ? (
      <CheckoutModal
        itemId={item.id}
        title={page.headline || item.title}
        slug={item.slug}
        category={item.category}
        thumbnail={item.thumbnail}
        imageFocal={details.imageFocal ?? null}
        priceLabel={priceLabel ?? ""}
        tax={tax}
        gstin={business.gstin}
        triggerClassName={ctaClass}
        triggerLabel={ctaLabel}
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
        imageFocal={details.imageFocal ?? null}
        registrationFields={registrationFields}
        triggerClassName={ctaClass}
        triggerLabel={ctaLabel}
        adPage={page.slug}
      />
    );

  return (
    <div className={`min-h-screen ${t.page}`}>
      <MetaPixelView
        contentId={`ad:${page.slug}`}
        contentName={page.headline || item.title}
        value={page.kind === "paid" ? price : undefined}
      />

      {/* No nav, no menu, no links out. Every exit from this page is a
          click you already paid for and did not get — so the wordmark is
          not a link either. */}
      <header className={`border-b ${t.line}`}>
        <div className="max-w-[760px] mx-auto px-5 h-[62px] flex items-center justify-between gap-3">
          <span className="font-display font-extrabold text-[17px]">
            DT<span className={t.accent}>.live</span>
          </span>
          {dateLabel && (
            <span
              className={`font-mono text-[11px] px-3.5 py-1.5 rounded-full ${
                dark ? "bg-bone text-ink" : "bg-ink text-bone"
              }`}
            >
              {dateLabel}
            </span>
          )}
        </div>
      </header>

      {/* One narrow column. A landing page that reads like a document
          converts better than one that reads like a website. pb-28 leaves
          room for the sticky bar so the last CTA is never underneath it. */}
      <main className="max-w-[760px] mx-auto px-5 py-9 md:py-14 pb-28 md:pb-14">
        {(page.eyebrow || !closed) && (
          <div className="flex items-center justify-between gap-3 mb-5">
            {page.eyebrow ? (
              <span className={`font-mono text-[11px] font-bold tracking-wider border rounded-full px-3.5 py-1.5 ${t.accent} ${t.accentBorder}`}>
                {page.eyebrow}
              </span>
            ) : (
              <span />
            )}
            {!closed && (
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-live">
                <span className="w-2 h-2 rounded-full bg-live live-dot" />
                LIVE
              </span>
            )}
          </div>
        )}

        <h1 className="font-display font-extrabold text-[36px] md:text-[54px] tracking-tight leading-[1.04]">
          {page.headline}
        </h1>
        {page.subheadline && (
          <p className={`text-[18px] md:text-[20px] leading-relaxed mt-4 ${t.sub}`}>{page.subheadline}</p>
        )}

        {(dateLabel || locationLabel || priceChip) && (
          <div className="flex flex-wrap gap-2 mt-6">
            {dateLabel && (
              <span className={`font-mono text-[12px] px-4 py-2 border rounded-full ${t.chip}`}>{dateLabel}</span>
            )}
            {locationLabel && (
              <span className={`font-mono text-[12px] px-4 py-2 border rounded-full ${t.chip}`}>{locationLabel}</span>
            )}
            {priceChip && (
              <span className={`font-mono text-[12px] px-4 py-2 border rounded-full ${t.accent} ${t.accentBorder}`}>
                {priceChip}
              </span>
            )}
          </div>
        )}

        {(page.heroImageUrl || page.videoUrl) && (
          // 16:9, which is the shape video is actually cut in — so the
          // frame does not letterbox the moment someone presses play.
          <div className={`relative w-full aspect-video rounded-card overflow-hidden border mt-8 ${t.line}`}>
            {page.heroImageUrl ? (
              <Image
                src={page.heroImageUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 760px) 100vw, 760px"
                className="object-cover"
                style={
                  page.imageFocal ? { objectPosition: `${page.imageFocal.x}% ${page.imageFocal.y}%` } : undefined
                }
              />
            ) : (
              <div className="absolute inset-0 bg-black" />
            )}
            {page.videoUrl && (
              <ItemVideoOverlay video={{ url: page.videoUrl }} title={page.headline || item.title} />
            )}
          </div>
        )}

        {/* The clock, at full size. It counts to the same timestamp that
            stops this page selling, so what it shows is literally true. */}
        {page.deadlineIso && !closed && (
          <div className="mt-10">
            <AdCountdown
              deadlineIso={page.deadlineIso}
              label={page.kind === "paid" ? "THIS PRICE ENDS IN" : "REGISTRATION CLOSES IN"}
              dark={dark}
            />
          </div>
        )}

        {/* The offer. */}
        <div className={`border rounded-card p-6 md:p-7 mt-9 ${t.panel}`}>
          {priceLabel && !closed && (
            <p className="flex items-baseline gap-3 flex-wrap">
              <span className="font-display font-extrabold text-[42px] leading-none tracking-tight">
                {priceLabel}
              </span>
              {strikeLabel && (
                <span className={`font-mono text-[18px] line-through ${t.muted}`}>{strikeLabel}</span>
              )}
            </p>
          )}

          {showSeats && (
            <p className="font-mono text-[12px] text-live mt-3">
              {seatsTotal ? `${seatsLeft} of ${seatsTotal} seats left` : `${seatsLeft} seats left`}
            </p>
          )}
          {page.scarcity && !closed && !soldOut && (
            <p className={`font-mono text-[12px] mt-1.5 ${t.muted}`}>{page.scarcity}</p>
          )}

          <div className="mt-6">{cta}</div>

          {page.trustLine && !closed && !soldOut && (
            <p className={`text-center font-mono text-[11px] mt-3.5 ${t.muted}`}>{page.trustLine}</p>
          )}
        </div>

        {page.bullets.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5">What you get</h2>
            <ul className="flex flex-col gap-3.5">
              {page.bullets.map((line, i) => (
                <li key={i} className="flex gap-3 text-[17px] leading-relaxed">
                  <span aria-hidden className={`${t.accent} font-bold shrink-0`}>
                    →
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        )}

        {page.faq.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-4">Questions</h2>
            <div className={`border-t ${t.line}`}>
              {page.faq.map((entry, i) => (
                <details key={i} className={`border-b group ${t.line}`}>
                  <summary className="flex items-center justify-between gap-3 py-4 px-1 cursor-pointer list-none font-display font-bold text-[17px]">
                    {entry.q}
                    <span
                      aria-hidden
                      className={`font-display font-bold text-xl transition-transform group-open:rotate-45 ${t.accent}`}
                    >
                      +
                    </span>
                  </summary>
                  <div className={`pb-4 px-1 text-[16px] leading-relaxed whitespace-pre-line ${t.sub}`}>
                    {entry.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Someone who read to the bottom has decided, and should not have
            to scroll back up to act on it. */}
        {!closed && !soldOut && <div className="mt-14">{cta}</div>}

        {/* The only links off this page, and only the ones a page taking
            payment is obliged to carry. */}
        <p className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[10px] mt-14 ${t.muted}`}>
          <Link href="/terms" className={`${t.accentHover} transition-colors`}>
            Terms
          </Link>
          <Link href="/privacy" className={`${t.accentHover} transition-colors`}>
            Privacy
          </Link>
          <Link href="/refund-policy" className={`${t.accentHover} transition-colors`}>
            Refunds
          </Link>
          <span>{business.tradeName}</span>
        </p>
      </main>

      {/* Ad traffic is a thumb on a phone. The price and the button stay
          reachable at every scroll position rather than living at two
          fixed points on a long page. */}
      {!closed && !soldOut && (
        <div className="md:hidden fixed left-0 right-0 bottom-0 z-[100] bg-ink text-bone border-t border-[#3c3b33] flex items-center justify-between gap-3 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            {priceLabel && <span className="font-mono font-bold text-[16px] text-marigold">{priceLabel}</span>}
            {showSeats && (
              <small className="block font-mono text-[10px] text-[#8b8a80]">{seatsLeft} seats left</small>
            )}
          </div>
          <div className="shrink-0 w-[52%] max-w-[220px]">
            {page.kind === "paid" ? (
              <CheckoutModal
                itemId={item.id}
                title={page.headline || item.title}
                slug={item.slug}
                category={item.category}
                thumbnail={item.thumbnail}
                imageFocal={details.imageFocal ?? null}
                priceLabel={priceLabel ?? ""}
                tax={tax}
                gstin={business.gstin}
                triggerClassName="block w-full text-center bg-marigold text-ink font-semibold text-[15px] px-4 py-3 rounded-full"
                triggerLabel={page.ctaLabel || "Reserve seat"}
                adPage={page.slug}
              />
            ) : (
              <RegisterModal
                itemId={item.id}
                title={page.headline || item.title}
                slug={item.slug}
                category={item.category}
                thumbnail={item.thumbnail}
                imageFocal={details.imageFocal ?? null}
                registrationFields={registrationFields}
                triggerClassName="block w-full text-center bg-marigold text-ink font-semibold text-[15px] px-4 py-3 rounded-full"
                triggerLabel={page.ctaLabel || "Save my seat"}
                adPage={page.slug}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

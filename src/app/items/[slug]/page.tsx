import { notFound } from "next/navigation";
import Footer, { FooterLinks } from "@/components/Footer";
import CheckoutModal from "@/components/CheckoutModal";
import RegisterModal from "@/components/RegisterModal";
import ItemImage, { ITEM_DETAIL_HERO_ASPECT_CLASS } from "@/components/ItemImage";
import BioCard from "@/components/BioCard";
import MobileMenu from "@/components/MobileMenu";
import JsonLd from "@/components/JsonLd";
import { Outcomes, WhoFor, Faq } from "@/components/ItemSections";
import { getItemBySlug, getSetting } from "@/lib/items";
import { hasTaxDetailsColumn } from "@/lib/admin-repo";
import { getBio, getNav, getTaxSettingsForDisplay, SITE_URL } from "@/lib/site-settings";
import { computePricing, priceLabel as taxPriceLabel, priceSubLabel } from "@/lib/tax";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";
import type { Metadata } from "next";
import { SITE_TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Every workshop time on this page carries the zone. "Sun, 30 Aug, 12:00 pm"
// is ambiguous the moment one buyer is outside Delhi, and this is sold on
// the internet, not in a room.
function formatWorkshopDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: SITE_TZ,
    }) + " IST"
  );
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await getItemBySlug(params.slug);
  if (!item) return {};
  return {
    title: item.title,
    description: item.description,
    alternates: { canonical: `/items/${item.slug}` },
    openGraph: {
      type: "article",
      title: item.title,
      description: item.description,
      url: `${SITE_URL}/items/${item.slug}`,
      images: item.thumbnail ? [item.thumbnail] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description: item.description,
      images: item.thumbnail ? [item.thumbnail] : [],
    },
  };
}

export default async function ItemDetailPage({ params }: { params: { slug: string } }) {
  const [item, footerLinks, bio, nav, taxSettings, b2bReady] = await Promise.all([
    getItemBySlug(params.slug),
    getSetting<FooterLinks>("footerLinks", {}),
    getBio(),
    getNav(),
    getTaxSettingsForDisplay(),
    // Whether an order can actually STORE a buyer's GSTIN yet. Gating the
    // checkout block on the stored setting alone meant a buyer could type
    // one, pay, and have it silently dropped at insert time — no invoice
    // credit, and nothing to tell them why.
    hasTaxDetailsColumn().catch(() => false),
  ]);

  if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
    notFound();
  }

  const tax = { ...taxSettings, b2bEnabled: taxSettings.b2bEnabled && b2bReady };

  const isWorkshop = item!.category === "workshop";
  const d = item!.details as any;
  const price = isWorkshop ? (d as WorkshopDetails).price : (d as CourseDetails).price;
  // An item saved with no curriculum/agenda used to crash this page —
  // `undefined.map` is a 500, not an empty section. Default to [] and let
  // the section below decide not to render.
  const agenda: { title: string; body: string }[] =
    (isWorkshop ? (d as WorkshopDetails).agenda : (d as CourseDetails).curriculum) ?? [];
  // Reads "₹6,999 + GST" or the tax-inclusive total, depending on the
  // admin's display choice. One helper, so the nav, the badge, the sticky
  // bar and the checkout button can never disagree about the price.
  const priceLabel = taxPriceLabel(price, tax);
  const priceNote = priceSubLabel(price, tax);
  // schema.org defines Offer.price as the amount PAYABLE. Publishing the
  // pre-tax figure would put ₹6,999 in Google's rich result while checkout
  // charges ₹8,258.82 — the same show-one-charge-another problem as the
  // checkout button, but on a machine-read public surface.
  // sellerStateCode only decides the CGST/SGST-vs-IGST split, never the
  // total, so the displayed price does not need the invoice settings.
  const payablePrice = computePricing({ listPrice: price, tax, sellerStateCode: "" }).payable;
  // Free workshops skip payment entirely — a lead-capture registration
  // instead of a checkout. Courses aren't part of this flow.
  const isFreeWorkshop = isWorkshop && price === 0;
  const triggerLabel = isFreeWorkshop ? "Reserve my free seat" : isWorkshop ? "Reserve my seat" : "Enroll now";
  const showSeats = isWorkshop && !(d as WorkshopDetails).unlimitedSeats && (d as WorkshopDetails).showSeatsBadge !== false;
  const showPriceBadge = d.showPriceBadge !== false;
  const dateLabel = isWorkshop ? formatWorkshopDate((d as WorkshopDetails).date) : "";

  // The checkout and registration routes already refuse a started or full
  // workshop, but the page didn't say so — someone could read the whole
  // page, open the modal, type their details and only then be told no.
  // `soldOut` ignores showSeatsBadge on purpose: hiding the counter is a
  // presentation choice, being full is a fact.
  const w = d as WorkshopDetails;
  const startedAt = isWorkshop && w.date ? new Date(w.date).getTime() : NaN;
  const hasStarted = !Number.isNaN(startedAt) && startedAt < Date.now();
  const soldOut = isWorkshop && !w.unlimitedSeats && (w.seatsLeft ?? 0) <= 0;
  const closed = hasStarted || soldOut;
  const closedReason = hasStarted
    ? "This one has already run. Nothing to book — but the next one goes up here first."
    : "Every seat is taken. The next date goes up here first.";

  const ctaProps = {
    itemId: item!.id,
    title: item!.title,
    slug: item!.slug,
    category: item!.category,
    thumbnail: item!.thumbnail,
    imageFocal: item!.details?.imageFocal ?? null,
  };

  // Course and Event are the two schema types Google renders as a rich
  // result rather than a plain blue link, so they're worth the bytes.
  const structured: Record<string, unknown> = isWorkshop
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: item!.title,
        description: item!.description,
        eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        startDate: (d as WorkshopDetails).date || undefined,
        location: { "@type": "VirtualLocation", url: `${SITE_URL}/items/${item!.slug}` },
        image: item!.thumbnail ? [item!.thumbnail] : undefined,
        organizer: { "@type": "Person", name: bio.name, url: SITE_URL },
        offers: {
          "@type": "Offer",
          price: String(payablePrice),
          priceCurrency: "INR",
          // Keyed off the fact, not off showSeatsBadge — a sold-out
          // workshop with the counter hidden was publishing InStock.
          availability: soldOut
            ? "https://schema.org/SoldOut"
            : hasStarted
              ? "https://schema.org/SoldOut"
              : "https://schema.org/InStock",
          url: `${SITE_URL}/items/${item!.slug}`,
        },
      }
    : {
        "@context": "https://schema.org",
        "@type": "Course",
        name: item!.title,
        description: item!.description,
        image: item!.thumbnail ? [item!.thumbnail] : undefined,
        provider: { "@type": "Person", name: bio.name, url: SITE_URL },
        offers: {
          "@type": "Offer",
          price: String(payablePrice),
          priceCurrency: "INR",
          category: "Paid",
          url: `${SITE_URL}/items/${item!.slug}`,
        },
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "Online",
          courseWorkload: (d as CourseDetails).duration || undefined,
        },
      };

  const faqStructured =
    Array.isArray(d.faq) && d.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: d.faq
            .filter((f: any) => f?.q && f?.a)
            .map((f: any) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
        }
      : null;

  return (
    <>
      <JsonLd data={faqStructured ? [structured, faqStructured] : structured} />

      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-bone/85 backdrop-blur-md">
        <a href="/" className="font-display font-extrabold text-[16px] text-ink">
          DT<span className="text-marigold-ink">.live</span>
        </a>
        <div className="md:hidden">
          <MobileMenu links={nav.links.filter((l) => l.show)} />
        </div>
        <div className="hidden md:flex items-center gap-3.5 min-w-0">
          <span className="font-semibold text-sm truncate max-w-[34vw]">{item!.title}</span>
          <span className="font-mono text-[13px] text-marigold-ink font-bold whitespace-nowrap">{priceLabel}</span>
          {closed ? (
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted border border-line px-[18px] py-[10px] rounded-full">
              {soldOut ? "Sold out" : "Closed"}
            </span>
          ) : isFreeWorkshop ? (
            <RegisterModal
              {...ctaProps}
              workshopDate={(d as WorkshopDetails).date}
              registrationFields={(d as WorkshopDetails).registrationFields}
              triggerLabel={triggerLabel}
              triggerClassName="bg-marigold border border-marigold text-ink font-semibold text-sm px-[18px] py-[10px] rounded-full hover:bg-ink hover:text-bone hover:border-ink transition-colors"
            />
          ) : (
            <CheckoutModal
              {...ctaProps}
              priceLabel={priceLabel}
              tax={tax}
              triggerLabel={triggerLabel}
              triggerClassName="bg-marigold border border-marigold text-ink font-semibold text-sm px-[18px] py-[10px] rounded-full hover:bg-ink hover:text-bone hover:border-ink transition-colors"
            />
          )}
        </div>
      </nav>

      <main className="max-w-[860px] mx-auto px-5 pt-[120px] pb-[140px] md:pb-[80px]">
        <div className="rounded-card overflow-hidden mb-6">
          <ItemImage
            thumbnail={item!.thumbnail}
            title={item!.title}
            category={item!.category}
            seed={item!.slug}
            sizes="(min-width: 860px) 860px, 100vw"
            imageFocal={item!.details?.imageFocal ?? null}
            aspectClassName={ITEM_DETAIL_HERO_ASPECT_CLASS}
          />
        </div>

        {closed ? (
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-muted">
            <span className="w-2 h-2 rounded-full bg-muted" />
            {soldOut ? "WORKSHOP · SOLD OUT" : "WORKSHOP · THIS ONE HAS RUN"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-live-ink">
            <span className="w-2 h-2 rounded-full bg-live live-dot" />
            {isWorkshop ? "LIVE WORKSHOP · ENROLLMENT OPEN" : "COURSE · SELF-PACED"}
          </span>
        )}
        <h1 className="font-display font-extrabold text-[38px] md:text-[64px] tracking-tight leading-[1.02] mt-3.5 mb-4">
          {item!.title}
        </h1>
        <p className="text-[17px] leading-relaxed text-ink-soft max-w-[620px]">{item!.description}</p>

        <div className="flex flex-wrap gap-2 mt-6">
          {isWorkshop && (
            <>
              {dateLabel && (
                <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">{dateLabel}</span>
              )}
              <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">Live on Zoom</span>
              {showSeats && (
                <span className="font-mono text-[11px] px-3 py-1.5 border border-ink bg-marigold rounded-full font-bold">
                  {(d as WorkshopDetails).seatsLeft} seats left
                </span>
              )}
            </>
          )}
          {showPriceBadge && (
            <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">
              {priceLabel}
              {priceNote && <span className="text-muted"> · {priceNote}</span>}
            </span>
          )}
        </div>

        <Outcomes items={d.outcomes} />

        {agenda.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display font-bold text-2xl tracking-tight mb-4">
              {isWorkshop ? "The agenda" : "The curriculum"}
            </h2>
            <div className="border-t border-ink">
              {agenda.map((block, i) => (
                <details key={i} open={i === 0} className="border-b border-ink group">
                  <summary className="flex items-center justify-between gap-3 py-4 px-1 cursor-pointer list-none font-display font-bold text-[17px]">
                    {block.title}
                    <span
                      aria-hidden
                      className="font-display font-bold text-xl text-marigold-deep transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <div className="pb-4 px-1 text-[16px] leading-relaxed text-ink-soft max-w-[640px] whitespace-pre-line">
                    {block.body}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        <WhoFor forWho={d.forWho} notForWho={d.notForWho} />
        <Faq items={d.faq} />
        <BioCard bio={bio} />

        {/* Desktop repeat of the CTA. The nav button scrolls out of reach on
            a long page and mobile already has a sticky bar; without this,
            a desktop reader who got to the bottom had nothing to click. */}
        <div className="hidden md:flex items-center justify-between gap-6 mt-14 bg-ink text-bone rounded-card p-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[#8b8a80]">
              {closed ? (soldOut ? "Sold out" : "This one has run") : isWorkshop && dateLabel ? dateLabel : "Ready when you are"}
            </p>
            <p className="font-display font-extrabold text-[28px] tracking-tight mt-1.5">
              {priceLabel}
              {isWorkshop && showSeats && (
                <span className="font-mono text-[13px] font-normal text-[#8b8a80] ml-3">
                  {(d as WorkshopDetails).seatsLeft} seats left
                </span>
              )}
            </p>
          </div>
          {closed ? (
            <p className="text-[15px] leading-relaxed text-[#b9b8ae] max-w-[300px]">{closedReason}</p>
          ) : isFreeWorkshop ? (
            <RegisterModal
              {...ctaProps}
              workshopDate={(d as WorkshopDetails).date}
              registrationFields={(d as WorkshopDetails).registrationFields}
              triggerLabel={triggerLabel}
              triggerClassName="bg-marigold border border-marigold text-ink font-semibold text-[16px] px-7 py-3.5 rounded-full hover:bg-bone hover:border-bone transition-colors"
            />
          ) : (
            <CheckoutModal
              {...ctaProps}
              priceLabel={priceLabel}
              tax={tax}
              triggerLabel={triggerLabel}
              triggerClassName="bg-marigold border border-marigold text-ink font-semibold text-[16px] px-7 py-3.5 rounded-full hover:bg-bone hover:border-bone transition-colors"
            />
          )}
        </div>
      </main>

      <div className="md:hidden fixed left-0 right-0 bottom-0 z-[100] bg-ink text-bone flex items-center justify-between gap-3 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div>
          <span className="font-mono font-bold text-[15px] text-marigold">{priceLabel}</span>
          {showSeats && (
            <small className="block font-mono text-[10px] text-[#8b8a80]">
              {(d as WorkshopDetails).seatsLeft} seats left
            </small>
          )}
        </div>
        {closed ? (
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#8b8a80] border border-[#3c3b33] px-4 py-2.5 rounded-full">
            {soldOut ? "Sold out" : "Closed"}
          </span>
        ) : isFreeWorkshop ? (
          <RegisterModal
            {...ctaProps}
            workshopDate={(d as WorkshopDetails).date}
            registrationFields={(d as WorkshopDetails).registrationFields}
            triggerLabel={triggerLabel}
            triggerClassName="bg-marigold text-ink font-semibold text-sm px-5 py-2.5 rounded-full"
          />
        ) : (
          <CheckoutModal
            {...ctaProps}
            priceLabel={priceLabel}
            tax={tax}
            triggerLabel={triggerLabel}
            triggerClassName="bg-marigold text-ink font-semibold text-sm px-5 py-2.5 rounded-full"
          />
        )}
      </div>

      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import CheckoutModal from "@/components/CheckoutModal";
import RegisterModal from "@/components/RegisterModal";
import MetaPixelView from "@/components/MetaPixelView";
import AdCountdown from "@/components/ads/AdCountdown";
import {
  Agenda,
  ForWho,
  Guarantee,
  PaymentMarks,
  ProofChips,
  Teacher,
  Testimonials,
} from "@/components/ads/AdSections";
import { ItemVideoOverlay } from "@/components/ItemVideo";
import { registrationFieldsFor } from "@/lib/live-public";
import { getItemById } from "@/lib/items";
import { countPaidBySource } from "@/lib/admin-repo";
import {
  cachedAdPage,
  getBio,
  getBusinessSettings,
  getTaxSettingsForDisplay,
  SITE_URL,
} from "@/lib/site-settings";
import { getSetting } from "@/lib/items";
import { adSourceTag, isDeadlinePassed, taxFor, taxModeFor } from "@/lib/settings-types";
import { formatRupees, priceLabel as taxPriceLabel } from "@/lib/tax";
import { type RegistrationField, type WorkshopDetails } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";
import type { Metadata } from "next";

// Paid traffic, so speed is the priority and the settings read is cached
// for 30s — see cachedAdPage. Safe because the price is re-resolved at
// checkout: a stale page can show an old seat count, never an old price.
export const revalidate = 30;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const page = await cachedAdPage(params.slug);
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
  const page = await cachedAdPage(params.slug);
  // Unknown slug and switched-off page alike: there is no page here.
  if (!page) notFound();

  const [item, globalTax, business, bio, allTestimonials, paidHere] = await Promise.all([
    getItemById(page.itemId),
    getTaxSettingsForDisplay(),
    getBusinessSettings(),
    getBio(),
    getSetting<{ quote: string; who: string }[]>("testimonials", []),
    // Real paid orders through THIS campaign. Not cached with the page —
    // it is the number most likely to be looked at twice.
    page.showJoined ? countPaidBySource(adSourceTag(page.slug)) : Promise.resolve(0),
  ]);
  // A page whose item was deleted or unpublished would render a button
  // that fails on click. Better to 404 the page itself.
  if (!item || !item.live) notFound();

  // Global → item → this campaign. Same chain the checkout resolves, so
  // the price on the page is the price charged.
  const tax = taxFor(globalTax, taxModeFor(item.details), page.taxMode);

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

  // Baseline + real paid orders. The baseline exists because the live
  // count only knows about this campaign, so a workshop already run twice
  // would otherwise read "0 people have joined" on launch day.
  const joinedCount = (page.joinedBaseline ?? 0) + paidHere;
  const showJoined = page.showJoined === true && joinedCount > 0;
  // NOT gated on page.showSeats. That flag is a DISPLAY choice — "show
  // how many seats are left" — and gating sold-out on it meant a campaign
  // with the seat line switched off kept rendering a live Enroll button
  // for a sold-out workshop: the buyer filled in the modal, tapped pay,
  // and only then got create-order's 409 "This workshop is sold out."
  // What is shown and what is sellable are two different questions.
  const soldOut = seatsLeft !== null && seatsLeft <= 0;

  // Picked by position, and filtered against the current list — a
  // testimonial deleted in Appearance leaves a gap here rather than an
  // undefined that crashes the render.
  const testimonials = page.testimonialPicks
    .map((i) => (Array.isArray(allTestimonials) ? allTestimonials[i] : undefined))
    .filter((x): x is { quote: string; who: string } => !!x?.quote);

  // Same helper live-public.ts uses for the webinar poll, so the ad page
  // and the live page cannot disagree about what "no custom fields" means.
  const registrationFields: RegistrationField[] = registrationFieldsFor(details);

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

  // Ads keep running for hours after a deadline and every one of those
  // clicks is already paid for, so the expired page offers the next thing
  // rather than a closed sign.
  const expiredBlock =
    closed || soldOut ? (
      <div className={`border rounded-card p-6 md:p-7 mt-9 ${t.panel}`}>
        <h2 className="font-display font-extrabold text-[24px] tracking-tight">
          {page.expiredHeadline || (soldOut ? "Every seat is taken." : "Registration has closed.")}
        </h2>
        <p className={`text-[16px] leading-relaxed mt-2.5 ${t.sub}`}>
          {page.expiredBody || "This one has closed — but there's usually another one coming."}
        </p>
        {page.expiredCtaHref && (
          <a href={page.expiredCtaHref} className={`${ctaClass} mt-6`}>
            {page.expiredCtaLabel || "See what's next"}
          </a>
        )}
      </div>
    ) : null;

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
      <main className="max-w-[760px] mx-auto px-5 py-9 md:py-14 pb-28">
        {/* The badge used to be saved and then silently never rendered —
            an admin typed "LIVE THIS SUNDAY", got no error, and the page
            ignored it. */}
        {(page.eyebrow || page.badge || !closed) && (
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex flex-wrap items-center gap-2">
              {page.eyebrow && (
                <span className={`font-mono text-[11px] font-bold tracking-wider border rounded-full px-3.5 py-1.5 ${t.accent} ${t.accentBorder}`}>
                  {page.eyebrow}
                </span>
              )}
              {page.badge && (
                <span
                  className={`font-mono text-[11px] font-bold tracking-wider rounded-full px-3.5 py-1.5 ${
                    dark ? "bg-bone text-ink" : "bg-ink text-bone"
                  }`}
                >
                  {page.badge}
                </span>
              )}
            </div>
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

        {/* Proof, before anything is asked for. A stranger who has known
            you for eleven seconds needs a reason to keep reading, and
            these are the cheapest ones you have. */}
        <ProofChips points={page.proofPoints} t={t} />

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

        {/* The offer, immediately. At a low ticket price the PRICE is the
            hook — burying it under a hero and a countdown asks someone to
            scroll before they know the one thing that would make them
            stay. Everything that justifies it comes after. */}
        {expiredBlock ?? (
          <div className={`border rounded-card p-6 md:p-7 mt-8 ${t.panel}`}>
            {priceLabel && (
              <p className="flex items-baseline gap-3 flex-wrap">
                <span className="font-display font-extrabold text-[42px] leading-none tracking-tight">
                  {priceLabel}
                </span>
                {strikeLabel && (
                  <span className={`font-mono text-[18px] line-through ${t.muted}`}>{strikeLabel}</span>
                )}
              </p>
            )}

            {showJoined && (
              <p className="flex items-center gap-2 font-mono text-[12px] mt-3">
                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-live live-dot" />
                {joinedCount} {joinedCount === 1 ? "person has" : "people have"} joined
              </p>
            )}
            {showSeats && (
              <p className="font-mono text-[12px] text-live mt-1.5">
                {seatsTotal ? `${seatsLeft} of ${seatsTotal} seats left` : `${seatsLeft} seats left`}
              </p>
            )}
            {page.scarcity && <p className={`font-mono text-[12px] mt-1.5 ${t.muted}`}>{page.scarcity}</p>}

            <div className="mt-6">{cta}</div>

            {/* Why you are asking for a phone number, said before they
                wonder. An unexplained field reads as a data grab. */}
            {page.formNote && (
              <p className={`text-center text-[13px] mt-3 ${t.sub}`}>{page.formNote}</p>
            )}
            {page.trustLine && <p className={`text-center font-mono text-[11px] mt-3 ${t.muted}`}>{page.trustLine}</p>}
            {page.showPaymentMarks !== false && page.kind === "paid" && <PaymentMarks t={t} />}
          </div>
        )}

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

        <ForWho forWho={page.forWho} notForWho={page.notForWho} t={t} />
        <Agenda items={page.agenda} t={t} />

        {page.showTeacher !== false && (
          <Teacher
            name={bio.name}
            note={page.teacherNote || bio.blurb}
            avatarUrl={bio.avatarUrl}
            t={t}
          />
        )}

        <Testimonials items={testimonials} t={t} />
        <Guarantee text={page.guarantee ?? ""} t={t} />

        {/* The clock lives HERE, not at the top. At the top it is pressure
            applied before any trust exists, which reads as a trick. Down
            here, next to the last button, it is a nudge for someone who
            has already been given the reasons. */}
        {!closed && !soldOut && (
          <div className={`mt-16 border rounded-card p-6 md:p-7 ${t.panel}`}>
            {page.deadlineIso && (
              <div className="mb-7">
                <AdCountdown
                  deadlineIso={page.deadlineIso}
                  label={page.kind === "paid" ? "THIS PRICE ENDS IN" : "REGISTRATION CLOSES IN"}
                  dark={dark}
                />
              </div>
            )}
            {priceLabel && (
              <p className="flex items-baseline gap-3 flex-wrap mb-5">
                <span className="font-display font-extrabold text-[36px] leading-none tracking-tight">
                  {priceLabel}
                </span>
                {strikeLabel && (
                  <span className={`font-mono text-[16px] line-through ${t.muted}`}>{strikeLabel}</span>
                )}
              </p>
            )}
            {cta}
            {page.trustLine && <p className={`text-center font-mono text-[11px] mt-3 ${t.muted}`}>{page.trustLine}</p>}
          </div>
        )}

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
      {/* Sticky on every size, not just phones. Ad traffic is mostly a
          thumb, but a desktop reader scrolling past the offer loses the
          button just as completely. */}
      {!closed && !soldOut && (
        <div className="fixed left-0 right-0 bottom-0 z-[100] bg-ink text-bone border-t border-[#3c3b33] px-4 md:px-8 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
          {/* One centred row at every width — the price and the button
              are the row, so they must sit inside the same container or
              they drift apart on a wide screen. */}
          <div className="max-w-[760px] mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              {priceLabel && <span className="font-mono font-bold text-[16px] text-marigold">{priceLabel}</span>}
                {showJoined ? (
                <small className="block font-mono text-[10px] text-[#8b8a80]">{joinedCount} joined</small>
              ) : showSeats ? (
                <small className="block font-mono text-[10px] text-[#8b8a80]">{seatsLeft} seats left</small>
              ) : null}
            </div>
            <div className="shrink-0 w-[52%] max-w-[240px]">
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
                  triggerClassName="block w-full text-center bg-marigold text-ink font-semibold text-[15px] px-4 py-3 rounded-full hover:bg-marigold-deep transition-colors"
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
                  triggerClassName="block w-full text-center bg-marigold text-ink font-semibold text-[15px] px-4 py-3 rounded-full hover:bg-marigold-deep transition-colors"
                  triggerLabel={page.ctaLabel || "Save my seat"}
                  adPage={page.slug}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

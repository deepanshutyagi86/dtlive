import Nav from "@/components/Nav";
import LiveStream, { StreamItem } from "@/components/LiveStream";
import Spotlight, { SpotlightData } from "@/components/Spotlight";
import Doors from "@/components/Doors";
import type { CardItem } from "@/components/ItemCard";
import Ticker from "@/components/Ticker";
import Testimonials, { Testimonial } from "@/components/Testimonials";
import Footer, { FooterLinks } from "@/components/Footer";
import StarterRouter from "@/components/StarterRouter";
import JsonLd from "@/components/JsonLd";
import { getDoorCounts, getFeaturedItem, getLiveStreamItems, getSetting } from "@/lib/items";
import { getBio, getNav, getStarter, getStreamSettings, getTaxSettingsForDisplay, SITE_URL } from "@/lib/site-settings";
import { taxFor, taxModeFor } from "@/lib/settings-types";
import { priceLabel } from "@/lib/tax";
import { metaFor, externalFor } from "@/lib/homepage";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";

// Always fetch fresh — this page changes the moment something goes live
// or featured in the admin panel.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [items, featured, counts, ticker, testimonials, footerLinks, heroCopySetting, nav, bio, starter, tax, streamSettings] =
    await Promise.all([
      getLiveStreamItems(),
      getFeaturedItem(),
      getDoorCounts(),
      getSetting<string[]>("ticker", DEFAULT_TICKER),
      getSetting<Testimonial[]>("testimonials", DEFAULT_TESTIMONIALS),
      getSetting<FooterLinks>("footerLinks", DEFAULT_FOOTER),
      getSetting<Partial<HeroCopy>>("heroCopy", {}),
      getNav(),
      getBio(),
      getStarter(),
      getTaxSettingsForDisplay(),
      getStreamSettings(),
    ]);

  // Blank/missing fields fall back to the default individually, never
  // render empty.
  const hero: HeroCopy = {
    eyebrow: heroCopySetting.eyebrow?.trim() || DEFAULT_HERO_COPY.eyebrow,
    line1: heroCopySetting.line1?.trim() || DEFAULT_HERO_COPY.line1,
    line2: heroCopySetting.line2?.trim() || DEFAULT_HERO_COPY.line2,
    subline: heroCopySetting.subline?.trim() || DEFAULT_HERO_COPY.subline,
  };

  const streamItems: StreamItem[] = items.map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    description: i.description,
    category: i.category,
    meta: metaFor(i, tax),
    external: externalFor(i),
    thumbnail: i.thumbnail,
    imageFocal: i.details?.imageFocal ?? null,
  }));

  // Same rows the carousel already fetched — grouped by category inside the
  // Doors component rather than re-queried per category.
  const cardItems: CardItem[] = items.map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    description: i.description,
    category: i.category,
    details: i.details,
    thumbnail: i.thumbnail,
    imageFocal: i.details?.imageFocal ?? null,
  }));

  let spotlight: SpotlightData | null = null;
  if (featured && (featured.category === "course" || featured.category === "workshop")) {
    const d = featured.details as any;
    // This one item's resolved GST, so the hero chip agrees with the
    // price on the item's own page and at checkout.
    const itemTax = taxFor(tax, taxModeFor(featured.details));
    const showSeats = featured.category === "workshop" && !d.unlimitedSeats && d.showSeatsBadge !== false;
    const showPrice = d.showPriceBadge !== false;

    const chips: string[] = [];
    if (featured.category === "workshop") {
      chips.push(
        new Date((d as WorkshopDetails).date).toLocaleString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: SITE_TZ,
        }),
        "Live on Zoom"
      );
      if (showSeats) chips.push(`${(d as WorkshopDetails).seatsLeft} seats left`);
      if (showPrice) chips.push(`${priceLabel((d as WorkshopDetails).price, itemTax)} early bird`);
    } else {
      if (showPrice) chips.push(priceLabel((d as CourseDetails).price, itemTax));
      chips.push((d as CourseDetails).duration ?? "self-paced");
    }

    spotlight = {
      slug: featured.slug,
      title: featured.title,
      description: featured.description,
      chips,
      category: featured.category,
      thumbnail: featured.thumbnail,
      imageFocal: featured.details?.imageFocal ?? null,
      // A course has no real deadline, so the old fallback counted down to
      // "six days from whenever you loaded the page" — a timer that silently
      // resets on every visit and pressures a stranger with a date that does
      // not exist. Only a workshop, which has a genuine start time, gets a
      // countdown now; a featured course shows the CTA without one.
      showCountdown: featured.category === "workshop" && d.showCountdown !== false,
      deadlineISO: featured.category === "workshop" ? (d as WorkshopDetails).date : "",
      ctaLabel: featured.category === "workshop" ? "Reserve my seat" : "Enroll now",
    };
  }

  // Person + WebSite, so a search for the name resolves to this site and
  // the sitelinks searchbox / knowledge panel have something to bind to.
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Deepanshu Tyagi Live",
      url: SITE_URL,
    },
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: bio.name,
      description: bio.blurb,
      url: SITE_URL,
      sameAs: [footerLinks.instagram, footerLinks.youtube, footerLinks.linkedin, bio.portfolioUrl].filter(
        Boolean
      ) as string[],
    },
  ];

  return (
    <>
      <JsonLd data={structured} />
      <Nav nav={nav} />
      <header className="max-w-[1200px] mx-auto px-5 pt-[92px] pb-1">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-2">{hero.eyebrow}</p>
        <h1 className="font-display font-extrabold tracking-tight text-[34px] md:text-[104px] leading-[0.95]">
          <span className="inline-block w-[0.35em] h-[0.35em] rounded-full bg-live live-dot mr-[0.18em] align-[0.08em]" />
          {hero.line1}
          <br />
          <span className="text-marigold-deep">{hero.line2}</span>
        </h1>
        <p className="mt-3 max-w-[560px] text-[15px] md:text-[17px] leading-6 md:leading-7 text-ink-soft">
          {hero.subline}
        </p>
      </header>

      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between gap-3 mt-6 mb-2.5">
        <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.14em] uppercase font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-live live-dot" />
          The stream
        </div>
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted">drag to scroll →</div>
      </div>
      <LiveStream items={streamItems} cardSize={streamSettings.cardSize} />

      {spotlight && <Spotlight data={spotlight} />}

      <Ticker lines={ticker} />

      <StarterRouter data={starter} />

      <Doors counts={counts} items={cardItems} tax={tax} />
      <Testimonials items={testimonials} />
      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

// Three, not five — kept the claims a stranger can parse with zero prior
// context (self-contained numbers, no unexplained proper nouns) and that
// span distinct kinds of work rather than three variations on one theme:
// teaching (students), building (apps shipped), and client delivery
// (websites shipped). Dropped "10% equity · Muchhad" and "HackArena · 6
// cities" — both lean on a brand/event name a first-time visitor has no
// context for yet; they read better as asides once someone's already
// exploring (ventures page, testimonials) than as a cold trust strip.
const DEFAULT_TICKER = ["100+ students taught", "Apps live on the Play Store", "15+ websites shipped"];

interface HeroCopy {
  eyebrow: string;
  line1: string;
  line2: string;
  subline: string;
}

const DEFAULT_HERO_COPY: HeroCopy = {
  eyebrow: "DEEPANSHUTYAGI.LIVE — THE STOREFRONT",
  line1: "Live,",
  line2: "right now.",
  subline: "Everything I teach, build, and sell.",
};

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "Made my first ₹300 before the Sunday session even ended.", who: "Priya, workshop attendee" },
  { quote: "The course is the only one I finished. Short lessons, real tasks.", who: "Business Foundations student" },
  { quote: "Store, cart and Cashfree live in two weeks, exactly as promised.", who: "D2C founder" },
];

// Only reached if the footerLinks settings row is missing entirely. The
// old placeholder WhatsApp number was a live dead link in that case — a
// blank field renders no button at all, which is the correct fallback.
const DEFAULT_FOOTER: FooterLinks = {
  instagram: "https://www.instagram.com/thedeepanshutyagii",
  youtube: "https://www.youtube.com/@thedeepanshutyagi",
  linkedin: "https://linkedin.com/in/deepanshutyagi86",
  email: "deepanshutyagi0784@gmail.com",
};

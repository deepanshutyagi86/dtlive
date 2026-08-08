import Nav from "@/components/Nav";
import LiveStream, { StreamItem } from "@/components/LiveStream";
import Spotlight, { SpotlightData } from "@/components/Spotlight";
import Doors from "@/components/Doors";
import Ticker from "@/components/Ticker";
import Testimonials, { Testimonial } from "@/components/Testimonials";
import Footer, { FooterLinks } from "@/components/Footer";
import { getDoorCounts, getFeaturedItem, getLiveStreamItems, getSetting } from "@/lib/items";
import { metaFor, externalFor } from "@/lib/homepage";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

// Always fetch fresh — this page changes the moment something goes live
// or featured in the admin panel.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [items, featured, counts, ticker, testimonials, footerLinks] = await Promise.all([
    getLiveStreamItems(),
    getFeaturedItem(),
    getDoorCounts(),
    getSetting<string[]>("ticker", DEFAULT_TICKER),
    getSetting<Testimonial[]>("testimonials", DEFAULT_TESTIMONIALS),
    getSetting<FooterLinks>("footerLinks", DEFAULT_FOOTER),
  ]);

  const streamItems: StreamItem[] = items.map((i) => ({
    id: i.id,
    slug: i.slug,
    title: i.title,
    description: i.description,
    category: i.category,
    meta: metaFor(i),
    external: externalFor(i),
  }));

  let spotlight: SpotlightData | null = null;
  if (featured && (featured.category === "course" || featured.category === "workshop")) {
    const d = featured.details as any;
    const chips: string[] =
      featured.category === "workshop"
        ? [
            new Date((d as WorkshopDetails).date).toLocaleString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Kolkata",
            }),
            "Live on Zoom",
            `${(d as WorkshopDetails).seatsLeft} seats left`,
            `₹${(d as WorkshopDetails).price} early bird`,
          ]
        : [`₹${(d as CourseDetails).price}`, (d as CourseDetails).duration ?? "self-paced"];

    spotlight = {
      slug: featured.slug,
      title: featured.title,
      description: featured.description,
      chips,
      deadlineISO:
        featured.category === "workshop" ? (d as WorkshopDetails).date : new Date(Date.now() + 6 * 864e5).toISOString(),
      ctaLabel: featured.category === "workshop" ? "Reserve my seat" : "Enroll now",
    };
  }

  return (
    <>
      <Nav />
      <header className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-2">
        <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-muted mb-4">
          deepanshutyagi.live — the storefront
        </p>
        <h1 className="font-display font-extrabold text-[46px] md:text-[110px] leading-[0.98] tracking-tight">
          <span className="inline-block w-[0.35em] h-[0.35em] rounded-full bg-live live-dot mr-[0.18em] align-[0.08em]" />
          Live,
          <br />
          <span className="text-marigold-deep">right now.</span>
        </h1>
        <p className="mt-5 max-w-[520px] text-[17px] leading-relaxed text-ink-soft">
          Every course, workshop and drop I&apos;m currently running. If a card is here, it&apos;s open —
          tap it to see everything and join. Grab the stream, throw it around.
        </p>
      </header>

      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between gap-3 mt-14 mb-3.5">
        <div className="flex items-center gap-2.5 font-mono text-xs tracking-[0.16em] uppercase font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-live live-dot" />
          The stream
        </div>
        <div className="font-mono text-[11px] text-muted">drag to scroll →</div>
      </div>
      <LiveStream items={streamItems} />

      <Ticker lines={ticker} />

      {spotlight && <Spotlight data={spotlight} />}

      <Doors counts={counts} />
      <Testimonials items={testimonials} />
      <Footer links={footerLinks} />
    </>
  );
}

const DEFAULT_TICKER = [
  "500+ students taught",
  "3 apps on Play Store",
  "10% equity · Muchhad",
  "15+ websites shipped",
  "HackArena · 6 cities",
];

const DEFAULT_TESTIMONIALS: Testimonial[] = [
  { quote: "Made my first ₹300 before the Sunday session even ended.", who: "Priya, workshop attendee" },
  { quote: "The course is the only one I finished. Short lessons, real tasks.", who: "Business Foundations student" },
  { quote: "Store, cart and Cashfree live in two weeks, exactly as promised.", who: "D2C founder" },
];

const DEFAULT_FOOTER: FooterLinks = {
  whatsapp: "https://wa.me/910000000000",
  instagram: "https://www.instagram.com/thedeepanshutyagii",
  youtube: "https://www.youtube.com/@thedeepanshutyagi",
  linkedin: "https://linkedin.com/in/deepanshutyagi86",
  email: "deepanshutyagi0784@gmail.com",
};

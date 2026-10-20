import type { FooterLinks } from "@/components/Footer";
import JsonLd from "@/components/JsonLd";
import V4Home from "@/components/v4/V4Home";
import { V4_FONT_VARS } from "@/components/v4/fonts";
import type { V4Course, V4NextLive, V4PastLive, V4Shipped, V4Studio } from "@/components/v4/types";
import { getLiveStreamItems, getSetting } from "@/lib/items";
import { getBio, getBusinessSettings, getTaxSettingsForDisplay, SITE_URL } from "@/lib/site-settings";
import { hasTaxDetailsColumn } from "@/lib/admin-repo";
import { taxFor, taxModeFor } from "@/lib/settings-types";
import { priceLabel, priceSubLabel } from "@/lib/tax";
import { overviewVideoFor } from "@/lib/types";
import type { AgencyDetails, CourseDetails, ShopDetails, VentureDetails, WorkshopDetails } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";

// Always fetch fresh — this page changes the moment something goes live
// in the admin panel.
export const dynamic = "force-dynamic";

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((s) => String(s ?? "").trim()).filter(Boolean) : [];

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SITE_TZ,
  });
}

// wa.me / api.whatsapp links accept a prefilled message; anything else
// (or no WhatsApp at all) falls back to the workshops page, which always
// shows the next date first.
function waitlistHref(whatsapp?: string): string {
  if (!whatsapp) return "/workshops";
  try {
    const url = new URL(whatsapp);
    if (/(^|\.)wa\.me$|whatsapp\.com$/.test(url.hostname)) {
      url.searchParams.set("text", "Hi Deepanshu, add me to the waitlist for the next live workshop.");
      return url.toString();
    }
    return whatsapp;
  } catch {
    return "/workshops";
  }
}

export default async function HomePage() {
  const [items, ticker, footerLinks, bio, taxSettings, business, b2bReady] = await Promise.all([
    getLiveStreamItems(),
    getSetting<string[]>("ticker", DEFAULT_TICKER),
    getSetting<FooterLinks>("footerLinks", DEFAULT_FOOTER),
    getBio(),
    getTaxSettingsForDisplay(),
    getBusinessSettings(),
    hasTaxDetailsColumn().catch(() => false),
  ]);

  const now = Date.now();

  const courses: V4Course[] = items
    .filter((i) => i.category === "course")
    .map((i) => {
      const d = (i.details ?? {}) as CourseDetails;
      const resolved = taxFor(taxSettings, taxModeFor(i.details));
      const tax = { ...resolved, b2bEnabled: resolved.b2bEnabled && b2bReady };
      return {
        id: i.id,
        slug: i.slug,
        title: i.title,
        description: i.description,
        category: i.category,
        thumbnail: i.thumbnail,
        imageFocal: i.details?.imageFocal ?? null,
        price: d.price,
        priceLabel: priceLabel(d.price, tax),
        priceNote: priceSubLabel(d.price, tax),
        tax,
        bestFor: d.bestFor?.trim() || null,
        level: d.level?.trim() || null,
        forWho: strings(d.forWho),
        notForWho: strings(d.notForWho),
        outcomes: strings(d.outcomes),
        modules: (d.curriculum ?? []).map((b) => String(b?.title ?? "").trim()).filter(Boolean),
        hasFreeLesson: !!overviewVideoFor(i.details),
      };
    });

  // Next live = the soonest live workshop that hasn't started. A past one
  // is never offered — only mentioned as "previously", as proof it runs.
  const workshops = items
    .filter((i) => i.category === "workshop" && (i.details as WorkshopDetails)?.date)
    .map((i) => ({ item: i, d: i.details as WorkshopDetails, at: new Date((i.details as WorkshopDetails).date).getTime() }))
    .filter((w) => !Number.isNaN(w.at));
  const upcoming = workshops.filter((w) => w.at > now).sort((a, b) => a.at - b.at)[0];
  const past = workshops.filter((w) => w.at <= now).sort((a, b) => b.at - a.at)[0];

  let nextLive: V4NextLive | null = null;
  if (upcoming) {
    const w = upcoming.d;
    const tax = taxFor(taxSettings, taxModeFor(w));
    nextLive = {
      slug: upcoming.item.slug,
      title: upcoming.item.title,
      dateLabel: dateLabel(w.date),
      seatsLabel:
        !w.unlimitedSeats && w.showSeatsBadge !== false && Number.isFinite(w.seatsLeft)
          ? `${w.seatsLeft} seats left`
          : null,
      priceLabel: priceLabel(w.price, tax),
    };
  }
  const pastLive: V4PastLive | null = past
    ? {
        title: past.item.title,
        dateLabel: new Date(past.d.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: SITE_TZ,
        }),
      }
    : null;

  const agency = items.find((i) => i.category === "agency");
  let studio: V4Studio | null = null;
  if (agency) {
    const a = agency.details as AgencyDetails;
    studio = {
      slug: agency.slug,
      title: agency.title,
      description: agency.description,
      priceLabel:
        a?.priceType === "from" && a.priceValue
          ? `From ₹${Number(a.priceValue).toLocaleString("en-IN")}`
          : "Custom quote",
    };
  }

  const shipped: V4Shipped[] = items
    .filter((i) => i.category === "shop" || i.category === "venture")
    .map((i) => {
      if (i.category === "shop") {
        const s = i.details as ShopDetails;
        return {
          id: i.id,
          title: i.title,
          label: `Shop · ${s?.platform || "Store"}`,
          href: s?.externalUrl || "/shop",
          external: !!s?.externalUrl,
          thumbnail: i.thumbnail,
          imageFocal: i.details?.imageFocal ?? null,
          category: i.category,
        };
      }
      const v = i.details as VentureDetails;
      return {
        id: i.id,
        title: i.title,
        label: `Venture${v?.equityPercent ? ` · ${v.equityPercent}%` : ""}`,
        href: v?.externalUrl || "/ventures",
        external: !!v?.externalUrl,
        thumbnail: i.thumbnail,
        imageFocal: i.details?.imageFocal ?? null,
        category: i.category,
      };
    });

  const structured = [
    { "@context": "https://schema.org", "@type": "WebSite", name: "Deepanshu Tyagi Live", url: SITE_URL },
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
      <V4Home
        fontVars={V4_FONT_VARS}
        courses={courses}
        nextLive={nextLive}
        pastLive={pastLive}
        studio={studio}
        shipped={shipped}
        credentials={ticker.length ? ticker : DEFAULT_TICKER}
        links={footerLinks}
        waitlistHref={waitlistHref(footerLinks.whatsapp)}
        bioName={bio.name}
        bioAvatar={bio.avatarUrl || null}
        gstin={business.gstin}
      />
    </>
  );
}

const DEFAULT_TICKER = ["100+ students taught", "Apps live on the Play Store", "15+ websites shipped"];

// Only reached if the footerLinks settings row is missing entirely.
const DEFAULT_FOOTER: FooterLinks = {
  instagram: "https://www.instagram.com/thedeepanshutyagii",
  youtube: "https://www.youtube.com/@thedeepanshutyagi",
  linkedin: "https://linkedin.com/in/deepanshutyagi86",
  email: "deepanshutyagi0784@gmail.com",
};

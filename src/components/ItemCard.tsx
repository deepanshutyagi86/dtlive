import Link from "next/link";
import RegisterModal from "./RegisterModal";
import ItemImage from "./ItemImage";
import { CATEGORY_CTA, CATEGORY_LABELS, CHIP_CLASS } from "@/lib/types";
import { formatRupees, priceLabel } from "@/lib/tax";
import { DEFAULT_TAX, type TaxSettings } from "@/lib/settings-types";
import { SITE_TZ } from "@/lib/dates";
import type {
  AgencyDetails,
  Category,
  CourseDetails,
  ImageFocal,
  ShopDetails,
  VentureDetails,
  WorkshopDetails,
} from "@/lib/types";

export interface CardItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  details: any;
  thumbnail: string | null;
  imageFocal?: ImageFocal | null;
}

// The single card used by the category pages, the shop/venture directories
// and the homepage category sections. Previously three near-identical
// copies of this markup; the differences between them were unintentional
// drift, not design, so a tweak had to be made in three places to land.
const SHELL = "bg-card border border-line rounded-card overflow-hidden flex flex-col";
const HOVER =
  "group hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(25,25,19,0.35)] transition-all";

// A shop or venture card labels itself by what the listing actually is —
// which storefront, how much equity — since "Shop"/"Venture" is already
// implied by the section it sits under and would waste the only badge.
export function chipLabel(item: CardItem): string {
  const d = item.details as any;
  if (item.category === "shop") {
    const s = d as ShopDetails;
    return [s.platform, s.brand].filter(Boolean).join(" · ") || CATEGORY_LABELS.shop;
  }
  if (item.category === "venture") {
    const v = d as VentureDetails;
    return v.status === "coming-soon" ? "Coming soon" : `${v.equityPercent ?? 0}% equity`;
  }
  return CATEGORY_LABELS[item.category];
}

// `tax` defaults to the off state so a caller that hasn't been threaded
// through yet renders exactly what it always did, rather than dropping the
// price entirely.
export function metaLine(item: CardItem, tax: TaxSettings = DEFAULT_TAX): string {
  const d = item.details as any;
  if (item.category === "course") {
    const c = d as CourseDetails;
    return `${priceLabel(c.price, tax)} · ${c.duration ?? "self-paced"}`;
  }
  if (item.category === "workshop") {
    const w = d as WorkshopDetails;
    const date = new Date(w.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: SITE_TZ });
    // Honour the same two flags the detail page does. The old card printed
    // "20 seats left" even for a workshop marked unlimited, which is both
    // false and needless scarcity.
    const hideSeats = w.unlimitedSeats || w.showSeatsBadge === false;
    return hideSeats ? date : `${date} · ${w.seatsLeft} seats left`;
  }
  if (item.category === "agency") {
    const a = d as AgencyDetails;
    // Two bugs in one line before this. formatRupees, not raw
    // interpolation: every other card runs its price through priceLabel()
    // and reads "₹6,999", so a bare number here printed "from ₹15000"
    // directly beside them — two conventions in one viewport. And
    // priceValue is optional, so an item set to "from" with the amount
    // left blank rendered the literal string "from ₹undefined" on a public
    // card. A missing amount is a quote, which is what it always meant.
    if (a.priceType === "quote" || typeof a.priceValue !== "number") return "Custom quote";
    return `from ₹${formatRupees(a.priceValue)}`;
  }
  return "";
}

function externalUrlFor(item: CardItem): string | null {
  const d = item.details as any;
  if (item.category === "shop") return (d as ShopDetails).externalUrl || null;
  if (item.category === "venture") return (d as VentureDetails).externalUrl || null;
  return null;
}

export default function ItemCard({
  item,
  sizes,
  compact = false,
  tax = DEFAULT_TAX,
}: {
  item: CardItem;
  sizes: string;
  tax?: TaxSettings;
  // Set by the homepage's two-up mobile grid (Doors.tsx) only. Tightens
  // padding/type on small screens so two narrow cards read cleanly side by
  // side; the category/directory pages stay full-width on mobile and don't
  // pass this, so their cards keep the normal, larger treatment.
  compact?: boolean;
}) {
  const meta = metaLine(item, tax);
  const external = externalUrlFor(item);

  const bodyClass = `${compact ? "p-3 sm:p-5" : "p-5"} flex flex-col ${compact ? "gap-2 sm:gap-3" : "gap-3"} flex-1`;
  const chipClass = `font-mono text-[10px] font-bold tracking-wider uppercase w-fit rounded-full border ${
    compact ? "px-2 py-0.5 sm:px-2.5 sm:py-1" : "px-2.5 py-1"
  } ${CHIP_CLASS[item.category]}`;
  const titleClass = `font-display font-bold tracking-tight ${compact ? "text-base sm:text-xl" : "text-xl"}`;
  const descClass = `leading-relaxed text-ink-soft flex-1 ${
    compact ? "text-[13px] sm:text-[16px] line-clamp-3 sm:line-clamp-none" : "text-[16px]"
  }`;
  const footerClass = `flex items-center justify-between font-semibold border-t border-line ${
    compact ? "text-xs sm:text-sm pt-2 sm:pt-3" : "text-sm pt-3"
  }`;

  const image = (
    <ItemImage
      thumbnail={item.thumbnail}
      title={item.title}
      category={item.category}
      seed={item.slug}
      sizes={sizes}
      imageFocal={item.imageFocal}
    />
  );

  const head = (
    <>
      <span className={chipClass}>{chipLabel(item)}</span>
      <div className={titleClass}>{item.title}</div>
      <div className={descClass}>{item.description}</div>
      {meta && <div className="font-mono text-[11px] text-muted">{meta}</div>}
    </>
  );

  // Agency items have no detail page — they're a quote request, not a
  // checkout — so the card opens the lead-capture modal instead of linking
  // to /items/[slug], which 404s for this category.
  if (item.category === "agency") {
    return (
      <div className={SHELL}>
        {image}
        <div className={bodyClass}>
          {head}
          <div className="border-t border-line pt-3">
            <RegisterModal
              itemId={item.id}
              title={item.title}
              slug={item.slug}
              category={item.category}
              thumbnail={item.thumbnail}
              imageFocal={item.imageFocal}
              triggerLabel={`${CATEGORY_CTA[item.category]} →`}
              triggerClassName="font-semibold text-sm hover:text-marigold-ink transition-colors"
            />
          </div>
        </div>
      </div>
    );
  }

  if (item.category === "shop" || item.category === "venture") {
    // No externalUrl set — nothing to send a click to. Render the card
    // without a link rather than a dead "#" href.
    if (!external) {
      return (
        <div className={SHELL}>
          {image}
          <div className={bodyClass}>{head}</div>
        </div>
      );
    }
    return (
      <a href={external} target="_blank" rel="noopener" className={`${SHELL} ${HOVER}`}>
        {image}
        <div className={bodyClass}>
          {head}
          <div className={`${footerClass} group-hover:text-marigold-ink`}>
            <span>{CATEGORY_CTA[item.category]}</span>
            <span className="group-hover:translate-x-1.5 transition-transform">↗</span>
          </div>
        </div>
      </a>
    );
  }

  return (
    <Link href={`/items/${item.slug}`} className={`${SHELL} ${HOVER}`}>
      {image}
      <div className={bodyClass}>
        {head}
        <div className={`${footerClass} group-hover:text-marigold-ink`}>
          <span>{CATEGORY_CTA[item.category]}</span>
          <span className="group-hover:translate-x-1.5 transition-transform">→</span>
        </div>
      </div>
    </Link>
  );
}

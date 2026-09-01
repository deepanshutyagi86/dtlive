import type { TaxMode } from "./settings-types";

export type Category = "course" | "workshop" | "agency" | "shop" | "venture";

export type CurriculumBlock = { title: string; body: string };

export interface RegistrationField {
  key: string;
  label: string;
  type: "text" | "email" | "tel";
  required: boolean;
}

// The form RegisterModal has always rendered. Every read site must fall
// back to this when an item has no registrationFields configured, so
// existing items render and behave identically after this field shipped.
export const DEFAULT_REGISTRATION_FIELDS: RegistrationField[] = [
  { key: "name", label: "Full name", type: "text", required: true },
  { key: "email", label: "email", type: "email", required: true },
  { key: "phone", label: "WhatsApp number", type: "tel", required: true },
];

// x/y are 0–100 percentages, same units as CSS object-position. Absent on
// an item means: fall back to the global default (ITEM_IMAGE_OBJECT_POSITION_CLASS
// in ItemImage.tsx, currently object-top) — every read site must treat
// undefined this way, not assume {x:50,y:50}.
export interface ImageFocal {
  x: number;
  y: number;
}

/* --- Sales content, shared by courses and workshops ---------------- */

export interface FaqEntry {
  q: string;
  a: string;
}

// Everything a buyer needs AFTER paying. Rendered on the confirmation
// page and pushed into the confirmation email, so a buyer never has to
// ask "so… how do I actually join?".
export interface JoiningInfo {
  groupUrl?: string;
  groupLabel?: string;
  meetingUrl?: string;
  meetingLabel?: string;
  /** Free text shown under the links, e.g. "Recording sent within 24h." */
  note?: string;
  /** Physical or virtual location string, also used in the calendar file. */
  location?: string;
  /** Used to compute the calendar event's end time. Defaults to 60. */
  durationMinutes?: number;
}

// All optional. Every read site must render nothing at all when a field is
// absent — these shipped after items already existed, so an item saved
// before this commit has none of them and must look exactly as it did.
interface SalesContent {
  /** "What you'll walk away with" — one concrete outcome per entry. */
  outcomes?: string[];
  /** "Who this is for" */
  forWho?: string[];
  /** "Who this isn't for" — as valuable as forWho; lets the wrong person leave happy. */
  notForWho?: string[];
  faq?: FaqEntry[];
  joining?: JoiningInfo;
  /** Comparison strip on /courses. */
  level?: string;
  bestFor?: string;
  buildOutcome?: string;
  /** Per-item override of the GST invoice setting — whether a DOCUMENT
   *  is issued. Separate from taxMode below, which decides whether tax is
   *  CHARGED at all. */
  invoice?: "default" | "always" | "never";
  /** Per-item override of whether GST is charged. Absent = follow the
   *  global switch. See taxFor() in settings-types.ts. */
  taxMode?: TaxMode;
}

// Shared by every category's details shape.
interface ItemDetailsBase {
  imageFocal?: ImageFocal;
}

// Shared by CourseDetails/WorkshopDetails — all optional, all read sites
// must treat undefined as: fields = DEFAULT_REGISTRATION_FIELDS, every
// showX flag = true, unlimitedSeats = false.
interface RegistrationDisplayOptions extends ItemDetailsBase, SalesContent {
  registrationFields?: RegistrationField[];
  showSeatsBadge?: boolean;
  showCountdown?: boolean;
  showPriceBadge?: boolean;
  unlimitedSeats?: boolean;
  syllabus?: ItemSyllabus;
  /** Teaching preview — a button under the description. */
  overviewVideo?: ItemVideo;
  /** Marketing film — a play button on the item's main image. */
  promoVideo?: ItemVideo;
}

/**
 * The long-form PDF for one item — the full curriculum or run-sheet, shown
 * on its own page at /items/[slug]/syllabus with a download beside it.
 *
 * Lives inside the item's `details` JSON rather than a column: adding a
 * column would need a migration against the production database, and this
 * is exactly the kind of optional per-item extra the JSON blob is for.
 *
 * `enabled` is tri-state on purpose. undefined means "on, because a file
 * was uploaded" — the common case, so uploading is one action rather than
 * two. false is an explicit hide that keeps the file for later.
 */
export interface ItemSyllabus {
  url: string;
  fileName?: string;
  enabled?: boolean;
}

/**
 * A video attached to an item. Two of them exist, and they are NOT
 * interchangeable — they answer different questions for different people:
 *
 *   overviewVideo — "Module 0". A teaching preview: what the inside of the
 *                   course actually looks like. Shown as a labelled button
 *                   under the description, for someone already reading the
 *                   page and deciding whether it is any good.
 *
 *   promoVideo    — the marketing film. Shown as a play button on the
 *                   item's main image, so it is the first thing a person
 *                   who just arrived can press. Usually short, and often
 *                   uploaded directly rather than hosted on YouTube.
 *
 * Both live in the item's `details` JSON rather than columns, same
 * reasoning as ItemSyllabus: a column needs a hand-run migration against
 * production, and these are exactly the optional per-item extra the JSON
 * blob exists for.
 *
 * `url` accepts a YouTube link (unlisted is the recommendation), a Google
 * Drive share link, or a direct .mp4 — see parseVideoUrl() in lib/video.ts,
 * the only thing that decides whether a URL is playable. An unparseable
 * url renders nothing at all rather than an empty player.
 */
export interface ItemVideo {
  url: string;
  /** Wording on the button, or under the play circle. */
  label?: string;
  /** Small line beneath, e.g. "12 min · free to watch". */
  note?: string;
  /** Set only when the file was uploaded to the site rather than linked.
   *  Display-only, in the admin panel — it is also how that panel knows
   *  which of its two inputs, URL or upload, this video came from. */
  fileName?: string;
  /**
   * Tri-state, same shape and reasoning as ItemSyllabus.enabled: undefined
   * means "on, because a URL was pasted" — so adding a video is one action
   * rather than two. false is an explicit hide that keeps the URL.
   */
  enabled?: boolean;
}

export const DEFAULT_OVERVIEW_VIDEO_LABEL = "Watch the overview — Module 0";
export const DEFAULT_PROMO_VIDEO_LABEL = "Watch";

/** Which of an item's two videos is being asked for. */
export type ItemVideoKey = "overviewVideo" | "promoVideo";

/**
 * The ONE thing that decides whether a given video shows, so the button,
 * the play overlay and the admin preview can never disagree. Same pattern
 * as syllabusFor() in site-settings.ts.
 */
export function itemVideoFor(details: unknown, key: ItemVideoKey): ItemVideo | null {
  const video = (details as Partial<Record<ItemVideoKey, ItemVideo>>)?.[key];
  if (!video?.url?.trim()) return null;
  if (video.enabled === false) return null;
  return video;
}

export const overviewVideoFor = (details: unknown) => itemVideoFor(details, "overviewVideo");
export const promoVideoFor = (details: unknown) => itemVideoFor(details, "promoVideo");

export interface CourseDetails extends RegistrationDisplayOptions {
  price: number; // in rupees
  duration?: string;
  curriculum: CurriculumBlock[];
}

export interface WorkshopDetails extends RegistrationDisplayOptions {
  price: number;
  date: string; // ISO datetime
  seatsTotal: number;
  seatsLeft: number;
  agenda: CurriculumBlock[];
}

export interface AgencyDetails extends ItemDetailsBase {
  priceType: "from" | "quote";
  priceValue?: number; // used if priceType === "from"
  included: string[];
}

export interface ShopDetails extends ItemDetailsBase {
  platform: string; // Amazon | Flipkart | Meesho | Website | ...
  brand: string; // Vyrelle | Muchhad | Sanskriti | ...
  externalUrl: string;
}

export interface VentureDetails extends ItemDetailsBase {
  equityPercent?: number;
  status: "live" | "coming-soon";
  externalUrl?: string;
  role?: string;
}

export type ItemDetails =
  | CourseDetails
  | WorkshopDetails
  | AgencyDetails
  | ShopDetails
  | VentureDetails;

export const CATEGORY_LABELS: Record<Category, string> = {
  course: "Course",
  workshop: "Workshop",
  agency: "Agency",
  shop: "Shop",
  venture: "Venture",
};

export const CATEGORY_CTA: Record<Category, string> = {
  course: "Enroll now",
  workshop: "Reserve seat",
  agency: "Get a quote",
  shop: "Visit store",
  venture: "Visit site",
};

// The category chip fill/border language — shared so every surface that
// shows a category badge (carousel cards, grid cards, directory cards)
// reads as the same color-coded system rather than each inventing its own.
export const CHIP_CLASS: Record<Category, string> = {
  course: "bg-marigold border-marigold",
  workshop: "bg-ink text-bone border-ink",
  venture: "bg-transparent border-ink",
  shop: "bg-transparent border-ink border-dashed",
  agency: "bg-bone border-ink",
};

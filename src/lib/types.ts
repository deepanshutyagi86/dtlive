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
  /** Per-item override of the GST invoice setting. */
  invoice?: "default" | "always" | "never";
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
  overviewVideo?: OverviewVideo;
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
 * The course overview video - "Module 0". One free video that does the
 * job a paragraph of copy cannot: show the person who is teaching, and
 * what the inside of the course actually looks like.
 *
 * Lives in the item's `details` JSON rather than a column, same reasoning
 * as ItemSyllabus above: adding a column needs a hand-run migration
 * against production, and this is exactly the optional per-item extra the
 * JSON blob exists for.
 *
 * `url` accepts a YouTube link (unlisted is the recommendation), a Google
 * Drive share link, or a direct .mp4 - see parseVideoUrl() in lib/video.ts,
 * which is the ONLY thing that decides whether a given URL is playable.
 * An unparseable url renders nothing at all rather than an empty player.
 */
export interface OverviewVideo {
  url: string;
  /** Button wording. Blank falls back to DEFAULT_OVERVIEW_VIDEO_LABEL. */
  label?: string;
  /** Small line under the button, e.g. "12 min · free to watch". */
  note?: string;
}

export const DEFAULT_OVERVIEW_VIDEO_LABEL = "Watch the overview — Module 0";

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

// Pure types + defaults for every admin-editable setting.
//
// Deliberately dependency-free: SettingsForm is a client component, so
// anything it imports must not drag the Neon client into the browser
// bundle. Server-side reads live in src/lib/site-settings.ts, which
// imports from here. Same split as guide-utils.ts / guides.ts.
//
// Every one of these lives as a single JSON row in the existing
// `settings` key/value table — migrations against production are blocked,
// so a new feature adds a KEY, never a column. Consequence, as always:
// a code push cannot change any of this. The DB row wins.

/* ------------------------------------------------------------------ */
/* Branding — favicon, touch icon, social preview                      */
/* ------------------------------------------------------------------ */

export interface Branding {
  /** Square PNG/WebP, 512×512. Browser tab icon + Android home screen. */
  faviconUrl?: string;
  /** Square PNG, 180×180, no transparency. iOS "Add to Home Screen". */
  appleIconUrl?: string;
  /** 1200×630 PNG/JPG. The WhatsApp / Instagram / X link preview card. */
  ogImageUrl?: string;
  /** Overrides the <title> and meta description sitewide when set. */
  siteTitle?: string;
  siteDescription?: string;
}

export const DEFAULT_BRANDING: Branding = {};

/** Shown in the admin panel next to each upload field. */
export const BRANDING_HELP: Record<
  "faviconUrl" | "appleIconUrl" | "ogImageUrl",
  { label: string; size: string; note: string }
> = {
  faviconUrl: {
    label: "Favicon",
    size: "512 × 512 px · PNG or WebP · square",
    note:
      "The little icon in the browser tab and on an Android home screen. Upload one square image at 512×512 — the browser scales it down. Keep the mark large and centred with a bit of padding; fine detail disappears at 16px. A solid background reads better than a transparent one on a dark tab bar. Leave blank to use the built-in DT mark.",
  },
  appleIconUrl: {
    label: "Apple touch icon",
    size: "180 × 180 px · PNG · no transparency",
    note:
      "Used when someone adds the site to an iPhone home screen. iOS ignores SVG and paints transparency black, so upload a flat PNG with a real background colour. Leave blank to fall back to the generated mark.",
  },
  ogImageUrl: {
    label: "Link preview image",
    size: "1200 × 630 px · PNG or JPG · under 1 MB",
    note:
      "The card that shows when you paste a link into WhatsApp, Instagram DMs, X or LinkedIn. This is the single most-seen image on the site. Put the logo and 3–5 words of text in the middle 80% — WhatsApp crops the edges. Leave blank to use the generated card.",
  },
};

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export interface NavLink {
  label: string;
  href: string;
  show: boolean;
}

export interface NavSettings {
  links: NavLink[];
  ctaLabel: string;
  ctaHref: string;
}

// NOTE: getNav() in site-settings.ts replaces `links` WHOLESALE with the
// stored row when one exists with a non-empty array — it does not merge
// new entries in. A site that has ever saved Settings → Navigation already
// has a stored `links` array, so adding a line here will NOT surface it on
// the live site; it has to be added in /admin as well.
export const DEFAULT_NAV: NavSettings = {
  links: [
    { label: "Courses", href: "/courses", show: true },
    { label: "Workshops", href: "/workshops", show: true },
    { label: "Guides", href: "/guide", show: true },
    { label: "Agency", href: "/agency", show: true },
    { label: "Shop", href: "/shop", show: false },
    { label: "Ventures", href: "/ventures", show: false },
    { label: "Booth", href: "/booth", show: false },
  ],
  ctaLabel: "Let's talk",
  ctaHref: "/agency",
};

/* ------------------------------------------------------------------ */
/* Bio — the "who's teaching" card, and the numbers you claim          */
/* ------------------------------------------------------------------ */

export interface BioSettings {
  name: string;
  role: string;
  blurb: string;
  avatarUrl?: string;
  portfolioUrl?: string;
  portfolioLabel?: string;
}

export const DEFAULT_BIO: BioSettings = {
  name: "Deepanshu Tyagi",
  role: "",
  blurb:
    "Equity in two D2C brands, 15+ stores and sites shipped for clients, apps on the Play Store, and 100+ students taught. Everything here is something I did this month, not something I read.",
  portfolioUrl: "",
  portfolioLabel: "Portfolio",
};

/* ------------------------------------------------------------------ */
/* "Not sure where to start?" router                                   */
/* ------------------------------------------------------------------ */

export interface StarterOption {
  label: string;
  sub: string;
  href: string;
}

export interface StarterSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  options: StarterOption[];
}

export const DEFAULT_STARTER: StarterSettings = {
  enabled: true,
  eyebrow: "Not sure where to start?",
  title: "Pick the one that sounds like you.",
  options: [
    { label: "I want to learn", sub: "Self-paced courses you keep forever.", href: "/courses" },
    { label: "I want it built", sub: "Websites and apps, delivered for you.", href: "/agency" },
    { label: "I want something free", sub: "Playbooks as PDFs. No email needed.", href: "/guide" },
  ],
};

/* ------------------------------------------------------------------ */
/* Guide CTA — the closing pitch on every course/workshop detail page  */
/* ------------------------------------------------------------------ */

export interface GuideCtaSettings {
  /** Someone who read the whole page and didn't buy is still worth a follow-up. */
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
}

export const DEFAULT_GUIDE_CTA: GuideCtaSettings = {
  enabled: true,
  eyebrow: "Not ready yet?",
  title: "Grab the free guide instead.",
  subtitle: "No pitch — just the playbook, free.",
  buttonLabel: "Browse free guides",
};

/* ------------------------------------------------------------------ */
/* Live stream carousel                                                */
/* ------------------------------------------------------------------ */

/**
 * Named sizes rather than a free pixel value on purpose. Tailwind compiles
 * the classes it can see in the source at build time, so a width typed into
 * the admin panel would produce a class that does not exist and a card with
 * no width at all. Three vetted steps, each a real pair of classes.
 */
export type StreamCardSize = "small" | "medium" | "large";

export interface StreamSettings {
  cardSize: StreamCardSize;
}

export const DEFAULT_STREAM: StreamSettings = {
  cardSize: "medium",
};

/* ------------------------------------------------------------------ */
/* Syllabus PDF                                                        */
/* ------------------------------------------------------------------ */

export interface SyllabusSettings {
  /** Master switch. Off hides every syllabus link and 404s the pages,
   *  without touching a single uploaded file. */
  enabled: boolean;
  /** Wording on the buttons and the page itself. */
  ctaLabel: string;
  heading: string;
  blurb: string;
  downloadLabel: string;
}

export const DEFAULT_SYLLABUS: SyllabusSettings = {
  enabled: true,
  ctaLabel: "Read Full Description",
  heading: "The full syllabus",
  blurb: "Everything covered, module by module. Read it here or take it with you.",
  downloadLabel: "Download PDF",
};

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

export interface Coupon {
  code: string;
  type: "percent" | "flat";
  /** Percent (1–100) or flat rupees off. */
  value: number;
  /** Item IDs this applies to. Empty array = every paid item. */
  appliesTo: string[];
  active: boolean;
  /** ISO date. Blank = never expires. Compared inclusively to end of day IST. */
  expiresAt?: string;
  /** 0 or absent = unlimited. */
  maxUses?: number;
  usedCount?: number;
  /** Minimum order value in rupees before the coupon is allowed. */
  minAmount?: number;
  /** Never let a discount take an order below this, in rupees. */
  minPayable?: number;
}

export const DEFAULT_COUPONS: Coupon[] = [];

/* ------------------------------------------------------------------ */
/* Tax & pricing — decides what the buyer is CHARGED                   */
/* ------------------------------------------------------------------ */

export interface TaxSettings {
  /** Off = the buyer pays exactly the price on the item, no tax logic at all. */
  enabled: boolean;
  /** Combined GST rate as a percentage, e.g. 18. */
  ratePercent: number;
  /**
   * "exclusive" — the price you type is BEFORE tax, and GST is added on top.
   *               Type 6999, the buyer is charged 8259.
   * "inclusive" — the price you type is the final amount, and the invoice
   *               back-computes the tax out of it. Type 6999, the buyer is
   *               charged 6999 and the invoice shows ~1067 of that as GST.
   *
   * This is the single most consequential setting on the site: switching it
   * changes what every existing item costs.
   */
  mode: "inclusive" | "exclusive";
  /**
   * How a price reads on cards and detail pages. Only meaningful in
   * exclusive mode, where the pre-tax and final numbers differ.
   *
   * "plus-gst" — "₹6,999 + GST"; the total appears at checkout.
   * "total"    — "₹8,259" with a small "incl. 18% GST" underneath.
   */
  display: "plus-gst" | "total";
  /**
   * Lets a buyer supply their own GSTIN at checkout so the invoice is
   * raised to their business. Turning this on requires the one-time
   * migration in docs/MIGRATIONS.md — until that has run, the fields are
   * hidden automatically rather than silently dropping what people type.
   */
  b2bEnabled: boolean;
  /** Shown above the B2B fields so a buyer knows why they'd bother. */
  b2bPrompt: string;
}

export const DEFAULT_TAX: TaxSettings = {
  enabled: false,
  ratePercent: 18,
  mode: "exclusive",
  display: "plus-gst",
  b2bEnabled: false,
  b2bPrompt: "Buying through a company? Add your GSTIN and we'll raise the invoice to your business so you can claim input credit.",
};

/**
 * Whether GST is charged on one particular thing, overriding the global
 * switch above.
 *
 *   "default" — follow TaxSettings.enabled (the global switch)
 *   "on"      — charge GST on this, even if the global switch is off
 *   "off"     — never charge GST on this, even if the global switch is on
 *
 * Absent means "default", so every item and ad page written before this
 * existed keeps behaving exactly as it did.
 */
export type TaxMode = "default" | "on" | "off";

/**
 * Resolves the tax settings that actually apply to ONE sale.
 *
 * Overrides are applied in the order given, so pass them
 * LEAST-specific first and the most specific wins:
 *
 *     taxFor(global, itemMode, adPageMode)
 *
 * An ad page selling a course at a promotional price can therefore switch
 * GST off for that campaign without touching the course, and the course's
 * own setting still governs every other surface it is sold on.
 *
 * Only `enabled` is overridden — never the rate, the inclusive/exclusive
 * mode, or the B2B switch. Those are properties of the BUSINESS, not of a
 * product: one seller cannot charge 18% on one item and 12% on another
 * just because a toggle allowed it.
 *
 * Returns the original object untouched when nothing changes, so the
 * common path allocates nothing and referential equality still holds.
 */
export function taxFor(global: TaxSettings, ...overrides: (TaxMode | undefined)[]): TaxSettings {
  let enabled = global.enabled;
  for (const override of overrides) {
    if (override === "on") enabled = true;
    else if (override === "off") enabled = false;
  }
  return enabled === global.enabled ? global : { ...global, enabled };
}

/** An item's own tax override, read out of its schemaless details blob. */
export function taxModeFor(details: unknown): TaxMode | undefined {
  const mode = (details as { taxMode?: unknown })?.taxMode;
  return mode === "on" || mode === "off" || mode === "default" ? mode : undefined;
}

// GST state codes. Needed for the CGST+SGST vs IGST decision: same state as
// the seller splits the rate in two, a different state charges it whole as
// IGST. Ordered by code so the checkout dropdown is predictable.
export const GST_STATES: { code: string; name: string }[] = [
  { code: "01", name: "Jammu & Kashmir" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" },
  { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" },
  { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" },
  { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" },
  { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" },
  { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" },
  { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" },
  { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" },
  { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" },
  { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" },
  { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" },
  { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" },
  { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "97", name: "Other Territory" },
];

export function stateNameForCode(code: string): string {
  return GST_STATES.find((s) => s.code === code)?.name ?? "";
}

/* ------------------------------------------------------------------ */
/* Business details — the one set of contact/legal facts everything    */
/* else (invoice, Terms, Privacy, Refund, Shipping, Contact) reads      */
/* from. src/lib/legal.ts is the fallback for a blank or missing field, */
/* never a second copy of these facts.                                  */
/* ------------------------------------------------------------------ */

export interface BusinessSettings {
  legalName: string;
  tradeName: string;
  gstin: string;
  addressLines: string[];
  stateName: string;
  /** Two-digit GST state code, e.g. "09" for Uttar Pradesh. */
  stateCode: string;
  email: string;
  phone: string;
}

export const DEFAULT_BUSINESS: BusinessSettings = {
  legalName: "Deepanshu",
  tradeName: "Deepanshu Empire",
  gstin: "09HXMPD1277C1ZF",
  addressLines: ["Badum, Meerut", "Meerut, Uttar Pradesh – 250502", "India"],
  stateName: "Uttar Pradesh",
  stateCode: "09",
  email: "dtyagi.main@gmail.com",
  phone: "+91 98706 00903",
};

/** The address lines joined into one sentence-friendly string. */
export function businessFullAddress(b: BusinessSettings): string {
  return b.addressLines.join(", ");
}

/* ------------------------------------------------------------------ */
/* GST invoicing — the DOCUMENT, not the pricing or the seller identity */
/* ------------------------------------------------------------------ */

export interface InvoiceSettings {
  /** Master switch. Off = no invoice link is generated or emailed at all. */
  enabled: boolean;
  /**
   * "all"   — every paid order gets an invoice link, unless the item opts out
   * "none"  — no order gets one, unless the item opts in
   * Per-item override lives on the item as details.invoice.
   */
  mode: "all" | "none";
  /** SAC code for online educational/training services. */
  hsnSac: string;
  /**
   * NOTE: the rate and inclusive/exclusive mode used to live here. They now
   * live in TaxSettings, because they decide what the buyer is CHARGED and
   * not merely what the document says. They are read from a saved snapshot
   * on the order when one exists, so changing the rate never rewrites an
   * invoice that has already been issued.
   *
   * The seller's legal identity (name, GSTIN, address, state, contact) used
   * to live here too. It now lives in BusinessSettings above, because the
   * same facts are also printed on Terms/Privacy/Refund/Shipping/Contact —
   * one place to change a GSTIN or a phone number, not two that can drift.
   */
  /** Invoice numbers render as <prefix><financialYear>-<sequence>. */
  numberPrefix: string;
  financialYear: string;
  /** Optional uploaded signature image shown above the signature line. */
  signatureUrl?: string;
  declaration: string;
  notes: string;
}

export const DEFAULT_INVOICE: InvoiceSettings = {
  enabled: false,
  mode: "none",
  hsnSac: "999293",
  numberPrefix: "DE/",
  financialYear: "2026-27",
  declaration:
    "We declare that this invoice shows the actual price of the service described and that all particulars are true and correct.",
  notes: "",
};

/* ------------------------------------------------------------------ */
/* Booth — the DJ / music room. A YouTube playlist runs on a server     */
/* clock; everyone who lands on /booth lands on the same video at the   */
/* same second, because "now" is derived from startedAtIso rather than  */
/* restarted per visitor. See lib/booth.ts for the two ways "same       */
/* second" gets computed (deterministic guess vs. real durations).      */
/* ------------------------------------------------------------------ */

/** Used only when there's no YOUTUBE_API_KEY to fetch real per-track
 *  durations — see computeDeterministicSlot() in lib/booth.ts. */
export const DEFAULT_AVG_TRACK_SEC = 210;

export interface BoothSet {
  /** crypto.randomUUID() at creation — stable key, never derived from title. */
  id: string;
  title: string;
  /** Full playlist URL (youtube.com/playlist?list=..., or a watch URL
   *  carrying &list=...) or a bare playlist ID. Parsed by
   *  parsePlaylistId() in lib/booth.ts, which accepts both. */
  youtubePlaylistUrl: string;
  /** Fallback average track length in seconds, used only when there's no
   *  YOUTUBE_API_KEY — see computeDeterministicSlot() in lib/booth.ts.
   *  Ignored entirely once real durations are available. */
  avgTrackSec: number;
  /** Typed by hand for now — no audio analysis exists to derive this. Drives the visuals only. */
  bpm: number;
  /** ISO datetime — the moment this playlist is treated as having begun
   *  looping from its first track. Editing this re-anchors the room. */
  startedAtIso: string;
  /** Track titles, one per line, in playlist order. Optional: with
   *  YOUTUBE_API_KEY set, real titles fetched from the API are shown
   *  instead and nothing here needs to be typed by hand. */
  tracklist: string[];
  /** The one set currently playing in the room. First live===true set with
   *  a parseable playlist URL wins — see activeSet() in site-settings.ts. */
  live: boolean;
}

export interface BoothSettings {
  /** Master switch. Off = /booth 404s and the nav link hides. Defaults off
   *  so nothing appears on the live site until deliberately switched on. */
  enabled: boolean;
  heading: string;
  blurb: string;
  gearImageUrl?: string;
  gearCaption?: string;
  sets: BoothSet[];
}

export const DEFAULT_BOOTH: BoothSettings = {
  enabled: false,
  heading: "The Booth",
  blurb: "A playlist, always running. Drop in wherever it's got to.",
  sets: [],
};

/* ------------------------------------------------------------------ */
/* Live — the webinar page at /live                                    */
/*                                                                     */
/* A page built to be changed WHILE it is being looked at. During a    */
/* webinar the pitch happens at a particular minute, and the offer     */
/* should appear at that minute — not be sitting there being           */
/* price-shopped for the previous forty. So every block carries its    */
/* own `visible` flag, the public page re-reads this row on a timer,   */
/* and flipping a switch in /admin/live changes what every open        */
/* browser shows without anyone being asked to refresh.                */
/*                                                                     */
/* One row, key "live", like every other setting. No migration.        */
/* ------------------------------------------------------------------ */

/**
 * What a block DOES when it's clicked.
 *
 * "paid"     — opens the normal Razorpay checkout for `itemId`, at the
 *              webinar price if one is set. Money now.
 * "register" — opens the normal registration form and writes a lead.
 *              A name and a WhatsApp number now, money later.
 * "link"     — goes to `externalUrl`. For the things that aren't sold
 *              here: a WhatsApp group, a Calendly, another site.
 *
 * The same item can appear twice in one session as two blocks — a free
 * "register for the recording" and a paid "get it now" — which is the
 * point of the kind living on the block rather than on the item.
 */
export type LiveBlockKind = "paid" | "register" | "link";

export interface LiveBlock {
  /** crypto.randomUUID() at creation. Never derived from the item or title:
   *  it is what the checkout route quotes a price against, so it has to
   *  survive renaming and reordering. */
  id: string;
  kind: LiveBlockKind;
  /** The item this block sells. Required for paid/register, ignored for link. */
  itemId: string;
  /**
   * The reveal switch. False = the block is not rendered and, just as
   * importantly, its price is not quotable — see resolveLiveOffer() in
   * site-settings.ts. Hiding a block in the UI while leaving the API
   * willing to sell at its price would be a discount anyone could find
   * by reading the page source.
   */
  visible: boolean;
  /** Overrides the item's own title/description on this page only. */
  headline?: string;
  blurb?: string;
  /**
   * The webinar price in rupees. Absent = the item's normal price.
   * 0 is a real value and means free — distinct from absent.
   *
   * NEVER read this in the browser and send it to the checkout. The
   * server re-reads it from this row; the client only ever names a block.
   */
  overridePrice?: number;
  /** Shown struck through beside the price. Usually the normal price. */
  strikePrice?: number;
  /** Small chip on the card, e.g. "TODAY ONLY". */
  badge?: string;
  /** One line of honest scarcity, e.g. "20 seats at this price". */
  scarcity?: string;
  /**
   * ISO datetime. A countdown on this block alone, so the offer can
   * expire without the whole page expiring. Set it when you flip the
   * block visible, not when you build the page — a deadline written the
   * night before has usually already passed by the time you pitch.
   */
  deadlineIso?: string;
  /** Button wording. Blank falls back to the item's category CTA. */
  ctaLabel?: string;
  /** kind === "link" only. */
  externalUrl?: string;
}

export interface LiveSession {
  id: string;
  /** URL segment: /live/<slug>. Also the value written to leads.source and
   *  orders.source as `live:<slug>`, which is what makes per-webinar
   *  numbers possible at all. Changing it orphans that history. */
  slug: string;
  title: string;
  subtitle: string;
  heroImageUrl?: string;
  /** Same 0–100 percentages as every other image on the site; edited with
   *  the existing FocalPointPicker rather than a second cropper. */
  imageFocal?: { x: number; y: number };
  /**
   * The one session /live itself resolves to. First active session wins —
   * see activeLiveSession(). Past sessions stay reachable at their own
   * /live/<slug> as replay pages, which is why this is a flag and not a
   * "current session" pointer that would have to be cleared.
   */
  active: boolean;
  /** ISO datetime — drives the page countdown before the webinar starts. */
  startsAtIso?: string;
  /** Zoom/YouTube link shown to someone who has registered. */
  joinUrl?: string;
  blocks: LiveBlock[];
}

export interface LiveSettings {
  /** Master switch. Off = /live and every /live/<slug> 404s, without
   *  deleting a single session. Defaults off so nothing appears on the
   *  live site until it is deliberately switched on. */
  enabled: boolean;
  /** Shown on a session that has no blocks visible yet — the state the
   *  page is in for the first forty minutes of a webinar. */
  holdingLine: string;
  sessions: LiveSession[];
}

export const DEFAULT_LIVE: LiveSettings = {
  enabled: false,
  holdingLine: "Stay on the call — everything drops here in a minute.",
  sessions: [],
};

/** The value written to leads.source / orders.source for a session. One
 *  function so the writer and the admin filter can never disagree about
 *  the format. */
export function liveSourceTag(slug: string): string {
  return `live:${slug}`;
}

/**
 * What /live itself resolves to: the first session marked active. The
 * page, the route guard and the nav all ask this rather than reading
 * settings.sessions, so /live can never render a session the admin has
 * switched off.
 */
export function activeLiveSession(settings: LiveSettings): LiveSession | null {
  if (!settings.enabled) return null;
  return settings.sessions.find((s) => s.active) ?? null;
}

/** /live/<slug>. Reachable whether or not the session is the active one —
 *  that is what makes a finished webinar keep working as a replay page. */
export function liveSessionBySlug(settings: LiveSettings, slug: string): LiveSession | null {
  if (!settings.enabled) return null;
  return settings.sessions.find((s) => s.slug === slug) ?? null;
}

/**
 * THE price gate. The checkout and the registration route call this with
 * nothing but ids from the browser, and it answers with a price read from
 * the database — the browser never gets to name an amount.
 *
 * Returns null, meaning "no webinar price, use the item's own", when
 * anything at all is off: live switched off, unknown session, unknown
 * block, a block that is not visible, a block that is not for this item,
 * or a block whose deadline has passed. Every one of those is a case
 * where honouring a webinar price would be a discount someone found by
 * reading the page source rather than by being on the call.
 */
/**
 * THE rule for whether an offer may be sold, shared by /live blocks and
 * /w ad pages.
 *
 * Two surfaces sell the same items at their own prices, and the ways an
 * offer can be illegitimate are identical on both: switched off, pointed
 * at a different item than the one being bought, or past its deadline.
 * Written once here so a rule added later cannot be added to one surface
 * and forgotten on the other — which is exactly the shape of bug that
 * ends with someone paying a webinar price they were never offered.
 *
 * `live` is the surface's own visibility flag: LiveBlock.visible, or
 * AdPage.enabled.
 */
export function isOfferSellable(
  offer: { live: boolean; itemId: string; deadlineIso?: string },
  itemId: string,
  now: number = Date.now()
): boolean {
  if (!offer.live) return false;
  if (offer.itemId !== itemId) return false;
  return !isDeadlinePassed(offer.deadlineIso, now);
}

/** Shared by the gate above and every countdown, so an expired offer stops
 *  being sellable at exactly the second it stops looking sellable.
 *  An UNPARSEABLE date reads as "no deadline", never as "expired" — a typo
 *  in the admin panel must not silently kill a live offer mid-webinar. */
export function isDeadlinePassed(deadlineIso: string | undefined, now: number = Date.now()): boolean {
  if (!deadlineIso) return false;
  const t = new Date(deadlineIso).getTime();
  if (Number.isNaN(t)) return false;
  return t < now;
}

export function resolveLiveOffer(
  settings: LiveSettings,
  sessionSlug: string | null | undefined,
  blockId: string | null | undefined,
  itemId: string
): { session: LiveSession; block: LiveBlock; price: number } | null {
  if (!sessionSlug || !blockId) return null;
  const session = liveSessionBySlug(settings, sessionSlug);
  if (!session) return null;

  const block = session.blocks.find((b) => b.id === blockId);
  if (!block) return null;
  if (!isOfferSellable({ live: block.visible, itemId: block.itemId, deadlineIso: block.deadlineIso }, itemId)) {
    return null;
  }
  if (block.overridePrice === undefined) return null;

  return { session, block, price: block.overridePrice };
}

/** Block-shaped wrapper over isDeadlinePassed, for the many UI call
 *  sites that already hold a LiveBlock rather than a date string. */
export function isLiveDeadlinePassed(block: LiveBlock, now: number = Date.now()): boolean {
  return isDeadlinePassed(block.deadlineIso, now);
}


/* ------------------------------------------------------------------ */
/* Ad pages — /w/<slug>, built for cold traffic off a paid ad          */
/*                                                                     */
/* Deliberately NOT a /live session with a flag. A webinar page holds  */
/* several offers and hides them until they are pitched; an ad page    */
/* holds exactly one offer, shows it immediately, and never polls,     */
/* because the person arriving has no idea who you are and every       */
/* second of load time is money already spent on the click.            */
/*                                                                     */
/* What the two DO share is the rule about when an offer may be sold — */
/* isOfferSellable() above — so the thing that protects your prices    */
/* exists once, not twice.                                             */
/* ------------------------------------------------------------------ */

export interface AdPageFaq {
  q: string;
  a: string;
}

export interface AdPage {
  id: string;
  /** URL segment: /w/<slug>. Also the tag written to leads.source and
   *  orders.source as `ad:<slug>`. Changing it orphans that history. */
  slug: string;
  /** Off = /w/<slug> returns Not Found. Nothing is deleted, and — via
   *  isOfferSellable — nothing can be bought at this page's price either. */
  enabled: boolean;

  /** The one line that has to do the work. Not the item's title: an ad
   *  page answers "why should I care", a product page answers "what is
   *  this", and the same sentence rarely does both. */
  headline: string;
  subheadline: string;
  heroImageUrl?: string;
  imageFocal?: { x: number; y: number };
  /** Optional video, played from the hero. For cold traffic this often
   *  outperforms any amount of copy. */
  videoUrl?: string;

  /** What is being sold or signed up for. */
  itemId: string;
  kind: "paid" | "register";
  /** The ad price, in rupees. Absent = the item's normal price.
   *  NEVER read in the browser and sent to checkout — the server
   *  re-reads it; the browser only ever names a slug. */
  price?: number;
  strikePrice?: number;
  ctaLabel: string;
  badge?: string;
  scarcity?: string;
  /** ISO datetime. A countdown, and a hard stop on sellability. */
  deadlineIso?: string;

  /** "What you'll get" — one line each. The whole body of the page. */
  bullets: string[];
  faq: AdPageFaq[];
  /** Small reassurance under the button, e.g. "Recording included." */
  trustLine?: string;

  /* --- how the page looks and what it shouts ------------------------ */

  /** Dark is the default and the one built to convert: it is what makes
   *  the countdown and the marigold button carry. Light exists so an
   *  offer with a bright creative can be tested against it. */
  theme?: "dark" | "light";
  /** The small pill above the headline, e.g. "FEATURED" or "EARLY BIRD".
   *  Blank shows no pill. */
  eyebrow?: string;
  /** Chips under the sub-headline. Both auto-fill from the workshop item
   *  (its date, and its joining location) — these only OVERRIDE, so the
   *  same fact never has to be typed in two places and cannot drift. */
  dateLabel?: string;
  locationLabel?: string;
  /** The price chip, e.g. "₹27 early bird". Blank builds one from the
   *  price itself. */
  priceChipLabel?: string;
  /**
   * Seats. The real numbers come off the workshop item and fall as people
   * actually buy, which is the only kind of scarcity worth printing.
   * `seatsOverride` replaces the remaining count for pages selling
   * something with no seat tracking of its own; `showSeats: false` hides
   * the line entirely.
   */
  showSeats?: boolean;
  seatsOverride?: number;
  /**
   * "N people have joined" — the other half of the scarcity pair, and
   * usually the stronger one: seats-left says "hurry", joined says
   * "other people already decided this was worth it", and for a stranger
   * off an ad the second is the more persuasive claim.
   *
   * Independent of showSeats. Both, either, or neither.
   */
  showJoined?: boolean;
  /**
   * A starting number added to the live count of real paid orders.
   *
   * This is here for a legitimate reason: the live count only knows about
   * THIS campaign, so a workshop you have already run twice reads as "0
   * people have joined" on the day you launch the ad, which is false in
   * the other direction. The baseline is where the people who already
   * took it go.
   *
   * It is a public claim about how many people bought something. Put a
   * number here you could defend if someone asked. An invented one is a
   * lie told to buyers, and it is the kind that gets checked.
   */
  joinedBaseline?: number;
  /**
   * GST on this campaign, overriding both the item's own setting and the
   * global switch. Absent = follow the item, then the global.
   *
   * The reason this exists per-campaign: a ₹27 ad price is usually a
   * round number chosen because it reads well, and adding 18% to it turns
   * ₹27 into ₹31.86 on the checkout — which is a different number from
   * the one in the ad.
   */
  taxMode?: TaxMode;
  /** Set when the video was uploaded here rather than linked. Display-only
   *  in the admin panel, and how it knows which of its two inputs to fill. */
  videoFileName?: string;

  /* --- proof, and the reasons to believe any of this ---------------- */

  /**
   * The block that answers "who are you". Cold traffic off an ad has
   * known you for eleven seconds and is being asked for card details;
   * without a face and a credential the page is all pressure and no
   * reason, which is what a scam looks like.
   */
  showTeacher?: boolean;
  /** One line of credentials under the name. Blank uses the site bio. */
  teacherNote?: string;
  /** Short proof points shown as a row of chips — "100+ students taught". */
  proofPoints: string[];
  /**
   * Which of the site's saved testimonials to show, by position in that
   * list. Positions rather than ids because testimonials have never had
   * ids; the consequence is that REORDERING them in Appearance shifts
   * what an ad page shows, so the picker says so.
   */
  testimonialPicks: number[];

  /* --- reasons not to worry ----------------------------------------- */

  /** The risk reversal. At ₹27 the money is not the barrier — wasting an
   *  evening is. This line is what removes that, and it is close to free. */
  guarantee?: string;
  /** Two columns that stop the wrong people buying, which is worth more
   *  than the sale: refunds cost more than they earn. */
  forWho: string[];
  notForWho: string[];
  /** What actually happens in the session, in order. `time` optional. */
  agenda: { time?: string; title: string }[];
  /** Under the button: why you are asking for a phone number. */
  formNote?: string;
  /** Show UPI/card marks by the button. "Secured by Razorpay" in 10px
   *  grey does very little on its own. */
  showPaymentMarks?: boolean;

  /* --- the WhatsApp step, and what happens when it's over ----------- */

  /**
   * Where a buyer is sent the second payment succeeds. Overrides the
   * item's own joining link for people who came through THIS campaign, so
   * a campaign can have its own group. Blank falls back to the item.
   *
   * This is the highest-leverage field on the whole page and it is not on
   * the page at all: getting a buyer into WhatsApp immediately is what
   * decides whether they turn up, and turning up is where the money is.
   */
  groupUrl?: string;
  groupLabel?: string;

  /** Shown once the deadline has passed. Ads keep running for hours after
   *  a deadline, and every one of those clicks is already paid for — a
   *  dead end there is pure waste. */
  expiredHeadline?: string;
  expiredBody?: string;
  /** Offer the next one instead of nothing. */
  expiredCtaLabel?: string;
  expiredCtaHref?: string;
}

export interface AdPagesSettings {
  pages: AdPage[];
}

export const DEFAULT_AD_PAGES: AdPagesSettings = { pages: [] };

/** The tag written to leads.source / orders.source for an ad page. One
 *  function, so the writer and the admin filter cannot disagree. */
export function adSourceTag(slug: string): string {
  return `ad:${slug}`;
}

export function adPageBySlug(settings: AdPagesSettings, slug: string): AdPage | null {
  const page = settings.pages.find((p) => p.slug === slug) ?? null;
  return page && page.enabled ? page : null;
}

/**
 * The price gate for /w, mirroring resolveLiveOffer. Returns null — meaning
 * "charge the item's own price" — whenever the page is off, unknown, for a
 * different item, expired, or simply sets no price of its own.
 */
export function resolveAdOffer(
  settings: AdPagesSettings,
  slug: string | null | undefined,
  itemId: string
): { page: AdPage; price: number } | null {
  if (!slug) return null;
  const page = adPageBySlug(settings, slug);
  if (!page) return null;
  if (!isOfferSellable({ live: page.enabled, itemId: page.itemId, deadlineIso: page.deadlineIso }, itemId)) {
    return null;
  }
  if (page.price === undefined) return null;
  return { page, price: page.price };
}

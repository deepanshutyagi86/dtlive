// Server-side reads for every admin-editable setting, in one place.
//
// Each getter merges the stored row over the defaults field-by-field
// rather than replacing wholesale, so a settings row written before a new
// field existed still renders — the missing field falls back instead of
// coming through as undefined. Same rule the hero copy already followed.

import { unstable_cache } from "next/cache";
import type { EmailSender } from "./email";
import { firstLiveSet, parsePlaylistId } from "./booth";
import { getSetting } from "./items";
import { BUSINESS, BUSINESS_ADDRESS_LINES } from "./legal";
import {
  DEFAULT_AVG_TRACK_SEC,
  DEFAULT_BIO,
  DEFAULT_BOOTH,
  DEFAULT_BRANDING,
  DEFAULT_COUPONS,
  DEFAULT_GUIDE_CTA,
  DEFAULT_AD_PAGES,
  DEFAULT_INVOICE,
  DEFAULT_LIVE,
  DEFAULT_NAV,
  adPageBySlug,
  adSourceTag,
  businessFullAddress,
  isDeadlinePassed,
  isLiveDeadlinePassed,
  liveSessionBySlug,
  liveSourceTag,
  resolveAdOffer,
  resolveLiveOffer,
  DEFAULT_STARTER,
  DEFAULT_STREAM,
  DEFAULT_SYLLABUS,
  DEFAULT_TAX,
  type BioSettings,
  type BoothSet,
  type BoothSettings,
  type Branding,
  type BusinessSettings,
  type Coupon,
  type GuideCtaSettings,
  type AdPage,
  type AdPagesSettings,
  type InvoiceSettings,
  type LiveBlock,
  type LiveSession,
  type LiveSettings,
  type TaxMode,
  type NavLink,
  type NavSettings,
  type StarterSettings,
  type StreamSettings,
  type SyllabusSettings,
  type TaxSettings,
} from "./settings-types";
import type { ItemSyllabus } from "./types";

export const SITE_URL = "https://www.deepanshutyagi.live";

/**
 * Chrome-only settings reads (nav, bio, branding, the starter block) go
 * through this. They are rendered by surfaces Next prerenders at BUILD
 * time — the root layout's generateMetadata and not-found.tsx — so an
 * unreachable database there would fail the whole build rather than one
 * request. Falling back to defaults is strictly better for this class of
 * value: the site renders with its default nav instead of not shipping.
 *
 * Money and tax settings (coupons, invoicing) deliberately do NOT use
 * this — a swallowed error there would silently charge the wrong amount
 * or issue a wrong invoice, so those must fail loudly.
 */
async function readChromeSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    return await getSetting<T>(key, fallback);
  } catch (err) {
    // Next signals "this render must become dynamic" by THROWING — the
    // neon driver's cache:"no-store" fetch triggers exactly that during
    // static generation. Swallowing it would turn a correct bailout into a
    // page silently rendered with default settings, so rethrow anything
    // carrying a digest (Next's marker) and only absorb real DB failures.
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error(`Settings: could not read "${key}", using defaults.`, err);
    return fallback;
  }
}

export async function getBranding(): Promise<Branding> {
  const stored = await readChromeSetting<Partial<Branding>>("branding", DEFAULT_BRANDING);
  return {
    faviconUrl: clean(stored.faviconUrl),
    appleIconUrl: clean(stored.appleIconUrl),
    ogImageUrl: clean(stored.ogImageUrl),
    siteTitle: clean(stored.siteTitle),
    siteDescription: clean(stored.siteDescription),
  };
}

// Path booth.enabled/activeSet gate the nav link (and the page itself) on.
// A literal, not a derived string, so it can't drift from the route folder.
const BOOTH_PATH = "/booth";

export async function getNav(): Promise<NavSettings> {
  const [stored, booth] = await Promise.all([
    readChromeSetting<Partial<NavSettings>>("nav", {}),
    getBoothSettings(),
  ]);
  const links: NavLink[] = Array.isArray(stored.links) && stored.links.length > 0
    ? stored.links
        .filter((l) => l && typeof l.href === "string" && typeof l.label === "string")
        .map((l) => ({ label: l.label.trim(), href: l.href.trim(), show: l.show !== false }))
        .filter((l) => l.label && l.href)
    : DEFAULT_NAV.links;

  // The one place every page's nav is assembled, so this is the one place
  // that has to ask activeSet() rather than every render call site — a
  // link to /booth must never survive here when the room would 404. Both
  // switches have to agree, same rule /booth itself applies below.
  const boothLive = booth.enabled && Boolean(activeSet(booth));
  const filteredLinks = boothLive ? links : links.filter((l) => l.href !== BOOTH_PATH);

  return {
    links: filteredLinks,
    ctaLabel: clean(stored.ctaLabel) || DEFAULT_NAV.ctaLabel,
    ctaHref: clean(stored.ctaHref) || DEFAULT_NAV.ctaHref,
  };
}

export async function getBio(): Promise<BioSettings> {
  const stored = await readChromeSetting<Partial<BioSettings>>("bio", {});
  return {
    name: clean(stored.name) || DEFAULT_BIO.name,
    role: clean(stored.role) || DEFAULT_BIO.role,
    blurb: clean(stored.blurb) || DEFAULT_BIO.blurb,
    avatarUrl: clean(stored.avatarUrl),
    portfolioUrl: clean(stored.portfolioUrl),
    portfolioLabel: clean(stored.portfolioLabel) || DEFAULT_BIO.portfolioLabel,
  };
}

export async function getStarter(): Promise<StarterSettings> {
  const stored = await readChromeSetting<Partial<StarterSettings>>("starter", {});
  const options = Array.isArray(stored.options) && stored.options.length > 0
    ? stored.options.filter((o) => o && o.label && o.href)
    : DEFAULT_STARTER.options;
  return {
    enabled: stored.enabled !== false,
    eyebrow: clean(stored.eyebrow) || DEFAULT_STARTER.eyebrow,
    title: clean(stored.title) || DEFAULT_STARTER.title,
    options,
  };
}

export async function getGuideCta(): Promise<GuideCtaSettings> {
  const stored = await readChromeSetting<Partial<GuideCtaSettings>>("guideCta", {});
  return {
    enabled: stored.enabled !== false,
    eyebrow: clean(stored.eyebrow) || DEFAULT_GUIDE_CTA.eyebrow,
    title: clean(stored.title) || DEFAULT_GUIDE_CTA.title,
    subtitle: clean(stored.subtitle) || DEFAULT_GUIDE_CTA.subtitle,
    buttonLabel: clean(stored.buttonLabel) || DEFAULT_GUIDE_CTA.buttonLabel,
  };
}

export async function getStreamSettings(): Promise<StreamSettings> {
  const stored = await readChromeSetting<Partial<StreamSettings>>("stream", {});
  const size = stored.cardSize;
  return {
    // Anything unrecognised falls back rather than passing an unknown key
    // through to a class lookup that would come back undefined.
    cardSize: size === "small" || size === "large" ? size : DEFAULT_STREAM.cardSize,
  };
}

export async function getSyllabusSettings(): Promise<SyllabusSettings> {
  const stored = await readChromeSetting<Partial<SyllabusSettings>>("syllabus", {});
  return {
    enabled: stored.enabled !== false,
    ctaLabel: clean(stored.ctaLabel) || DEFAULT_SYLLABUS.ctaLabel,
    heading: clean(stored.heading) || DEFAULT_SYLLABUS.heading,
    blurb: clean(stored.blurb) || DEFAULT_SYLLABUS.blurb,
    downloadLabel: clean(stored.downloadLabel) || DEFAULT_SYLLABUS.downloadLabel,
  };
}

/**
 * The one place that decides whether an item has a readable syllabus.
 *
 * Both switches have to agree: the global setting, and the item's own.
 * Every surface — the card link, the detail-page button, the syllabus
 * route itself — asks this, so a link can never point at a page that is
 * going to 404, and turning the feature off in settings cannot leave a
 * live link stranded on some page nobody remembered to check.
 */
export function syllabusFor(itemDetails: any, settings: SyllabusSettings): ItemSyllabus | null {
  if (!settings.enabled) return null;
  const s = itemDetails?.syllabus as ItemSyllabus | undefined;
  if (!s || typeof s.url !== "string" || !s.url.trim()) return null;
  // undefined means "on, because a file is here"; only an explicit false hides it.
  if (s.enabled === false) return null;
  return { url: s.url.trim(), fileName: s.fileName, enabled: true };
}

/**
 * Reads the "booth" row and normalises each set field-by-field, same
 * pattern as every other getter here — a field a stored row doesn't have
 * yet (never saved) falls back rather than coming through as undefined.
 *
 * Also tolerates the pre-YouTube shape (a `mixes` array of Mixcloud
 * entries) by reading it as the source array when `sets` isn't present:
 * those old entries have no `youtubePlaylistUrl`, so they normalise to an
 * unparseable URL and simply read as "not live" rather than crashing —
 * exactly the "extra/old fields ignored gracefully" behaviour every other
 * field-by-field merge in this file already has.
 */
export async function getBoothSettings(): Promise<BoothSettings> {
  const stored = await readChromeSetting<Record<string, unknown>>("booth", {});
  const rawSets = Array.isArray(stored.sets) ? stored.sets : Array.isArray(stored.mixes) ? stored.mixes : [];
  const sets: BoothSet[] = rawSets
    .filter((s: any) => s && typeof s.id === "string")
    .map((s: any) => ({
      id: s.id,
      title: clean(s.title) || "",
      youtubePlaylistUrl: clean(s.youtubePlaylistUrl) || "",
      avgTrackSec: Number.isFinite(s.avgTrackSec) && s.avgTrackSec > 0 ? s.avgTrackSec : DEFAULT_AVG_TRACK_SEC,
      bpm: Number.isFinite(s.bpm) && s.bpm > 0 ? s.bpm : 120,
      startedAtIso: typeof s.startedAtIso === "string" ? s.startedAtIso : new Date().toISOString(),
      tracklist: Array.isArray(s.tracklist) ? s.tracklist.filter((t: unknown) => typeof t === "string") : [],
      live: s.live === true,
    }));
  return {
    enabled: stored.enabled === true,
    heading: clean(stored.heading as string) || DEFAULT_BOOTH.heading,
    blurb: clean(stored.blurb as string) || DEFAULT_BOOTH.blurb,
    gearImageUrl: clean(stored.gearImageUrl as string),
    gearCaption: clean(stored.gearCaption as string),
    sets,
  };
}

/**
 * The one place that decides which set is playing right now. The page, the
 * nav link (via getNav() above) and the route guard all ask this instead
 * of reading settings.sets directly, so a link can never point at a room
 * that isn't there: first set with live === true and a parseable playlist
 * URL wins.
 */
export function activeSet(settings: BoothSettings): BoothSet | null {
  const live = firstLiveSet(settings.sets);
  if (!live) return null;
  return parsePlaylistId(live.youtubePlaylistUrl) ? live : null;
}

export async function getCoupons(): Promise<Coupon[]> {
  const stored = await getSetting<Coupon[]>("coupons", DEFAULT_COUPONS);
  return Array.isArray(stored) ? stored.filter((c) => c && typeof c.code === "string") : [];
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const stored = await getSetting<Partial<InvoiceSettings>>("invoice", {});
  return {
    ...DEFAULT_INVOICE,
    ...stored,
    enabled: stored.enabled === true,
    mode: stored.mode === "all" ? "all" : "none",
  };
}

/**
 * The seller's own contact/legal identity — name, GSTIN, address, state,
 * phone, email. Single source of truth for the GST invoice AND for
 * Terms/Privacy/Refund/Shipping/Contact, so there is one place to correct a
 * phone number instead of two that can silently drift apart.
 *
 * Merged field-by-field, not wholesale: a blank field in the stored row
 * (nothing typed into /admin/settings yet, or cleared back to empty) falls
 * back to src/lib/legal.ts rather than rendering empty on a legal page.
 */
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const stored = await readChromeSetting<Partial<BusinessSettings>>("business", {});
  return {
    legalName: clean(stored.legalName) || BUSINESS.legalName,
    tradeName: clean(stored.tradeName) || BUSINESS.tradeName,
    gstin: clean(stored.gstin) || BUSINESS.gstin,
    addressLines:
      Array.isArray(stored.addressLines) && stored.addressLines.length > 0
        ? stored.addressLines.filter((l) => typeof l === "string" && l.trim())
        : BUSINESS_ADDRESS_LINES,
    stateName: clean(stored.stateName) || BUSINESS.address.state,
    stateCode: clean(stored.stateCode) || BUSINESS.address.stateCode,
    email: clean(stored.email) || BUSINESS.email,
    phone: clean(stored.phone) || BUSINESS.phone,
  };
}

/**
 * Tax governs what the buyer is CHARGED, so this is deliberately NOT read
 * through readChromeSetting — a swallowed failure here would silently
 * charge the wrong amount. It must fail loudly.
 *
 * Use this ONLY on the money path: create-order and apply-coupon. Anything
 * that merely renders a price label must use getTaxSettingsForDisplay()
 * below, or a transient database blip takes the homepage down instead of
 * showing a slightly stale price string.
 *
 * Back-compat: the rate and mode used to live inside the `invoice` row.
 * A site that saved settings before the `tax` row existed still has them
 * there, so those values are honoured as the fallback rather than
 * silently resetting to the defaults and changing every price.
 */
export async function getTaxSettings(): Promise<TaxSettings> {
  const [stored, legacyInvoice] = await Promise.all([
    getSetting<Partial<TaxSettings>>("tax", {}),
    getSetting<Record<string, unknown>>("invoice", {}),
  ]);

  const legacyRate = Number(legacyInvoice?.taxRatePercent);
  const legacyMode = legacyInvoice?.taxMode === "exclusive" ? "exclusive" : undefined;

  const rate = Number.isFinite(stored.ratePercent as number)
    ? Number(stored.ratePercent)
    : Number.isFinite(legacyRate)
      ? legacyRate
      : DEFAULT_TAX.ratePercent;

  return {
    // Defaults to OFF. Turning tax on changes what every item costs, so it
    // has to be a deliberate act in the admin panel, never something a
    // deploy switches on by itself.
    enabled: stored.enabled === true,
    ratePercent: Math.min(Math.max(rate, 0), 100),
    mode: stored.mode === "inclusive" ? "inclusive" : stored.mode === "exclusive" ? "exclusive" : legacyMode ?? DEFAULT_TAX.mode,
    display: stored.display === "total" ? "total" : "plus-gst",
    b2bEnabled: stored.b2bEnabled === true,
    b2bPrompt: (typeof stored.b2bPrompt === "string" && stored.b2bPrompt.trim()) || DEFAULT_TAX.b2bPrompt,
  };
}

/**
 * Decides whether one order gets an invoice. The item's own setting wins
 * over the global mode; "default" (or absent) defers to the global mode.
 * The master `enabled` switch overrides everything — turning it off must
 * stop invoices for every item at once, including ones marked "always".
 */
export function invoiceAppliesTo(settings: InvoiceSettings, itemDetails: any): boolean {
  if (!settings.enabled) return false;
  const perItem = itemDetails?.invoice;
  if (perItem === "always") return true;
  if (perItem === "never") return false;
  return settings.mode === "all";
}

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = value.trim();
  return t ? t : undefined;
}

/**
 * The same settings, for surfaces that only render a price LABEL — the
 * homepage, category grids, item pages. Degrades to the defaults (tax off,
 * so the listed price shows unchanged) rather than throwing.
 *
 * That trade is deliberate and it only goes one way: a failure here shows a
 * price that is missing its "+ GST" suffix for one render. The same failure
 * on the charging path would take money at the wrong amount, which is why
 * getTaxSettings() above stays loud and is the one create-order calls.
 */
export async function getTaxSettingsForDisplay(): Promise<TaxSettings> {
  try {
    return await getTaxSettings();
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err;
    console.error("Tax settings unreadable, rendering prices without tax:", err);
    return DEFAULT_TAX;
  }
}

/* ------------------------------------------------------------------ */
/* Live — the webinar page                                             */
/* ------------------------------------------------------------------ */

/**
 * Field-by-field merge like every getter above. Deliberately NOT
 * readChromeSetting: a block carries a price, and a swallowed database
 * error that fell back to DEFAULT_LIVE would quietly turn a revealed
 * ₹999 offer back into the item's ₹6,999 list price mid-webinar. Same
 * reasoning that keeps coupons and tax off the chrome path.
 */
export async function getLiveSettings(): Promise<LiveSettings> {
  const stored = await getSetting<Record<string, unknown>>("live", {});
  const rawSessions = Array.isArray(stored.sessions) ? stored.sessions : [];

  const sessions: LiveSession[] = rawSessions
    // A session with no slug has no URL and nothing to tag its
    // registrations with, so it cannot be rendered or reported on.
    .filter((x: any) => x && typeof x.id === "string" && typeof x.slug === "string" && x.slug.trim())
    .map((x: any) => ({
      id: x.id,
      slug: String(x.slug).trim(),
      title: clean(x.title) || "",
      subtitle: clean(x.subtitle) || "",
      heroImageUrl: clean(x.heroImageUrl),
      imageFocal: isFocal(x.imageFocal) ? { x: x.imageFocal.x, y: x.imageFocal.y } : undefined,
      active: x.active === true,
      startsAtIso: clean(x.startsAtIso),
      joinUrl: clean(x.joinUrl),
      blocks: Array.isArray(x.blocks) ? x.blocks.filter(isBlockish).map(normaliseBlock) : [],
    }));

  return {
    enabled: stored.enabled === true,
    holdingLine: clean(stored.holdingLine as string) || DEFAULT_LIVE.holdingLine,
    sessions,
  };
}

/** Array-of-non-empty-strings, the shape half a dozen of these fields
 *  share. Anything that isn't a string is dropped rather than rendered. */
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim() !== "") : [];
}

function isFocal(f: any): boolean {
  return f && Number.isFinite(f.x) && Number.isFinite(f.y);
}

function isBlockish(b: any): boolean {
  return b && typeof b.id === "string";
}

function normaliseBlock(b: any): LiveBlock {
  return {
    id: b.id,
    kind: b.kind === "paid" || b.kind === "link" ? b.kind : "register",
    itemId: typeof b.itemId === "string" ? b.itemId : "",
    // Defaults to HIDDEN. A block that arrives in some shape this code
    // doesn't recognise must not appear on a live page mid-webinar —
    // and must not be sellable. Visible is opt-in, always.
    visible: b.visible === true,
    headline: clean(b.headline),
    blurb: clean(b.blurb),
    // 0 is a real price (free) and must survive. Number.isFinite, not a
    // truthiness check, which would silently drop it.
    overridePrice: Number.isFinite(b.overridePrice) && b.overridePrice >= 0 ? b.overridePrice : undefined,
    strikePrice: Number.isFinite(b.strikePrice) && b.strikePrice > 0 ? b.strikePrice : undefined,
    badge: clean(b.badge),
    scarcity: clean(b.scarcity),
    deadlineIso: clean(b.deadlineIso),
    ctaLabel: clean(b.ctaLabel),
    externalUrl: clean(b.externalUrl),
  };
}

// activeLiveSession / liveSessionBySlug / resolveLiveOffer / isLiveDeadlinePassed
// deliberately live in settings-types.ts, not here. Two reasons, both
// load-bearing: this module imports the Neon client at module scope, so
// anything defined here cannot be unit-tested without a database URL and
// cannot be imported by the client components that render the /live page —
// and resolveLiveOffer is the price gate, which is precisely the code that
// most needs tests. It takes a LiveSettings and returns an answer; it has
// no business touching the database.

/**
 * The one call both money routes make to ask "is this purchase happening
 * at a webinar price?". apply-coupon uses it so the modal PREVIEWS the
 * webinar price, and create-order uses it so the buyer is CHARGED it —
 * the two must agree, and they agree by asking the same function rather
 * than by each reading the settings row their own way.
 *
 * Costs one extra settings read, and only when the browser actually named
 * a session and a block. An ordinary product-page checkout never gets here.
 *
 * Returns null for every rejection resolveLiveOffer knows about, and null
 * means one thing at both call sites: charge the item's normal price.
 */
export async function livePriceFor(
  itemId: string,
  sessionSlug: string | null | undefined,
  blockId: string | null | undefined
): Promise<{ price: number; sourceTag: string } | null> {
  if (!sessionSlug || !blockId) return null;
  const offer = resolveLiveOffer(await getLiveSettings(), sessionSlug, blockId, itemId);
  if (!offer) return null;
  return { price: offer.price, sourceTag: liveSourceTag(offer.session.slug) };
}

/**
 * The source tag for a REGISTRATION (a lead), which has no price to
 * verify — a register block is free by definition. Still checks that the
 * block exists, is visible, is for this item and hasn't expired, so a
 * stale link can't keep tagging registrations onto a webinar that ended.
 */
export async function liveSourceFor(
  itemId: string,
  sessionSlug: string | null | undefined,
  blockId: string | null | undefined
): Promise<string | null> {
  if (!sessionSlug || !blockId) return null;
  const settings = await getLiveSettings();
  const session = liveSessionBySlug(settings, sessionSlug);
  if (!session) return null;
  const block = session.blocks.find((b) => b.id === blockId);
  if (!block || !block.visible || block.itemId !== itemId) return null;
  if (isLiveDeadlinePassed(block)) return null;
  return liveSourceTag(session.slug);
}

/* ------------------------------------------------------------------ */
/* Ad pages                                                            */
/* ------------------------------------------------------------------ */

/**
 * Field-by-field merge like every getter above, and deliberately NOT on
 * the readChromeSetting path: an ad page carries a price, and a swallowed
 * database error falling back to defaults would quietly turn a ₹27 ad
 * offer back into the item's full price on a page you are paying to send
 * people to. Same reasoning as getLiveSettings.
 */
export async function getAdPages(): Promise<AdPagesSettings> {
  const stored = await getSetting<Record<string, unknown>>("adPages", {});
  const raw = Array.isArray(stored.pages) ? stored.pages : [];

  const pages: AdPage[] = raw
    // No slug means no URL and nothing to tag its registrations with, so
    // it cannot be rendered or reported on.
    .filter((p: any) => p && typeof p.id === "string" && typeof p.slug === "string" && p.slug.trim())
    .map((p: any) => ({
      id: p.id,
      slug: String(p.slug).trim(),
      // Defaults to OFF. A page arriving in a shape this code doesn't
      // recognise must not be live, and — through isOfferSellable — must
      // not be sellable either.
      enabled: p.enabled === true,
      headline: clean(p.headline) || "",
      subheadline: clean(p.subheadline) || "",
      heroImageUrl: clean(p.heroImageUrl),
      imageFocal: isFocal(p.imageFocal) ? { x: p.imageFocal.x, y: p.imageFocal.y } : undefined,
      videoUrl: clean(p.videoUrl),
      itemId: typeof p.itemId === "string" ? p.itemId : "",
      kind: p.kind === "paid" ? "paid" : "register",
      // 0 is a real price (free) and must survive; Number.isFinite, not a
      // truthiness check, which would silently drop it.
      price: Number.isFinite(p.price) && p.price >= 0 ? p.price : undefined,
      strikePrice: Number.isFinite(p.strikePrice) && p.strikePrice > 0 ? p.strikePrice : undefined,
      ctaLabel: clean(p.ctaLabel) || "",
      badge: clean(p.badge),
      scarcity: clean(p.scarcity),
      deadlineIso: clean(p.deadlineIso),
      bullets: Array.isArray(p.bullets) ? p.bullets.filter((b: unknown) => typeof b === "string" && b.trim()) : [],
      faq: Array.isArray(p.faq)
        ? p.faq
            .filter((f: any) => f && typeof f.q === "string" && typeof f.a === "string")
            .map((f: any) => ({ q: f.q, a: f.a }))
        : [],
      trustLine: clean(p.trustLine),
      // Dark unless explicitly set light — the default is the one the
      // page was designed around.
      theme: p.theme === "light" ? "light" : "dark",
      eyebrow: clean(p.eyebrow),
      dateLabel: clean(p.dateLabel),
      locationLabel: clean(p.locationLabel),
      priceChipLabel: clean(p.priceChipLabel),
      // Defaults ON: a workshop that tracks seats should say so unless
      // told otherwise. The page still hides the line when there is no
      // real number behind it.
      showSeats: p.showSeats !== false,
      seatsOverride: Number.isFinite(p.seatsOverride) && p.seatsOverride >= 0 ? p.seatsOverride : undefined,
      // Defaults OFF: a counter is a public claim, so it appears only
      // when it has been deliberately switched on.
      showJoined: p.showJoined === true,
      joinedBaseline: Number.isFinite(p.joinedBaseline) && p.joinedBaseline >= 0 ? p.joinedBaseline : undefined,
      videoFileName: clean(p.videoFileName),

      showTeacher: p.showTeacher !== false,
      teacherNote: clean(p.teacherNote),
      proofPoints: strings(p.proofPoints),
      // Filtered to real, in-bounds positions here rather than at render:
      // a testimonial deleted in Appearance would otherwise leave an ad
      // page pointing past the end of the list.
      testimonialPicks: Array.isArray(p.testimonialPicks)
        ? p.testimonialPicks.filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0)
        : [],
      guarantee: clean(p.guarantee),
      forWho: strings(p.forWho),
      notForWho: strings(p.notForWho),
      agenda: Array.isArray(p.agenda)
        ? p.agenda
            .filter((a: any) => a && typeof a.title === "string" && a.title.trim())
            .map((a: any) => ({ time: clean(a.time), title: a.title }))
        : [],
      formNote: clean(p.formNote),
      showPaymentMarks: p.showPaymentMarks !== false,
      groupUrl: clean(p.groupUrl),
      groupLabel: clean(p.groupLabel),
      expiredHeadline: clean(p.expiredHeadline),
      expiredBody: clean(p.expiredBody),
      expiredCtaLabel: clean(p.expiredCtaLabel),
      expiredCtaHref: clean(p.expiredCtaHref),
    }));

  return { pages };
}

/** Every ad page, enabled or not — the admin list and the registrations
 *  view both need to see a page that has been switched off, which is the
 *  normal state of a finished campaign. */
export async function getAllAdPages(): Promise<AdPage[]> {
  return (await getAdPages()).pages;
}

/** What /w/<slug> renders. Null for unknown or switched-off. */
export async function adPageFor(slug: string): Promise<AdPage | null> {
  return adPageBySlug(await getAdPages(), slug);
}

/**
 * The /w counterpart of livePriceFor: both money routes call it with
 * nothing but a slug from the browser, and it answers with a price read
 * from the database.
 */
export async function adPriceFor(
  itemId: string,
  slug: string | null | undefined
): Promise<{ price: number; sourceTag: string } | null> {
  if (!slug) return null;
  const offer = resolveAdOffer(await getAdPages(), slug, itemId);
  if (!offer) return null;
  return { price: offer.price, sourceTag: adSourceTag(offer.page.slug) };
}

/** The source tag for a free registration from an ad page, which has no
 *  price to verify. Still checks the page exists, is on, is for this item
 *  and hasn't expired, so a stale ad link can't keep tagging people onto
 *  a campaign that ended. */
export async function adSourceFor(itemId: string, slug: string | null | undefined): Promise<string | null> {
  if (!slug) return null;
  const page = adPageBySlug(await getAdPages(), slug);
  if (!page || page.itemId !== itemId) return null;
  if (isDeadlinePassed(page.deadlineIso)) return null;
  return adSourceTag(page.slug);
}

/**
 * One cached read for everything /w needs.
 *
 * The page is force-dynamic no longer: it is hit by paid traffic, where
 * every 100ms of time-to-first-byte is money already spent on the click,
 * and three uncached database round trips per visitor is a cost with no
 * matching benefit. Thirty seconds is short enough that the seats-left
 * number is never meaningfully wrong and long enough that a burst of ad
 * clicks is served from memory.
 *
 * Caching is safe here specifically because the PRICE is not trusted from
 * this read: checkout re-resolves it through resolveAdOffer at purchase
 * time. A stale page can show an old seat count; it cannot charge an old
 * price.
 */
export const cachedAdPage = unstable_cache(
  async (slug: string) => {
    const page = adPageBySlug(await getAdPages(), slug);
    return page;
  },
  ["ad-page"],
  { revalidate: 30, tags: ["ad-pages"] }
);

/**
 * An ad page's GST override for one item.
 *
 * Deliberately separate from adPriceFor: that returns null when the page
 * sets no price of its own, but a campaign can perfectly well sell at the
 * item's normal price and still want GST off. Folding the two together
 * would silently drop the tax override in exactly that case.
 *
 * Validated the same way everything else about an ad page is — the page
 * must exist, be switched on, be for this item, and not have expired —
 * so a stale link cannot keep suppressing tax on a finished campaign.
 */
export async function adTaxModeFor(
  itemId: string,
  slug: string | null | undefined
): Promise<TaxMode | undefined> {
  if (!slug) return undefined;
  const page = adPageBySlug(await getAdPages(), slug);
  if (!page || page.itemId !== itemId) return undefined;
  if (isDeadlinePassed(page.deadlineIso)) return undefined;
  return page.taxMode;
}

/**
 * The sender identity printed at the bottom of every email, and the
 * address replies go to.
 *
 * Built from BusinessSettings so there is one place a phone number or an
 * address changes — the same facts already on the invoice and every legal
 * page. Nothing here is decorative: a short transactional message with no
 * identifiable sender is what Gmail reads as spam, which is exactly what
 * it did.
 */
export async function getEmailSender(): Promise<EmailSender> {
  const business = await getBusinessSettings();
  return {
    tradeName: business.tradeName || business.legalName,
    address: businessFullAddress(business),
    email: business.email,
    phone: business.phone,
    siteUrl: SITE_URL,
  };
}

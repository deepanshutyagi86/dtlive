// Server-side reads for every admin-editable setting, in one place.
//
// Each getter merges the stored row over the defaults field-by-field
// rather than replacing wholesale, so a settings row written before a new
// field existed still renders — the missing field falls back instead of
// coming through as undefined. Same rule the hero copy already followed.

import { getSetting } from "./items";
import { BUSINESS, BUSINESS_ADDRESS_LINES } from "./legal";
import {
  DEFAULT_BIO,
  DEFAULT_BOOTH,
  DEFAULT_BRANDING,
  DEFAULT_COUPONS,
  DEFAULT_GUIDE_CTA,
  DEFAULT_INVOICE,
  DEFAULT_NAV,
  DEFAULT_STARTER,
  DEFAULT_STREAM,
  DEFAULT_SYLLABUS,
  DEFAULT_TAX,
  type BioSettings,
  type BoothMix,
  type BoothSettings,
  type Branding,
  type BusinessSettings,
  type Coupon,
  type GuideCtaSettings,
  type InvoiceSettings,
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

// Path booth.enabled/activeMix gate the nav link (and the page itself) on.
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
  // that has to ask activeMix() rather than every render call site — a
  // link to /booth must never survive here when the room would 404. Both
  // switches have to agree, same rule /booth itself applies below.
  const boothLive = booth.enabled && Boolean(activeMix(booth));
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

export async function getBoothSettings(): Promise<BoothSettings> {
  const stored = await readChromeSetting<Partial<BoothSettings>>("booth", {});
  const mixes = Array.isArray(stored.mixes)
    ? stored.mixes.filter((m) => m && typeof m.id === "string" && typeof m.mixcloudUrl === "string")
    : DEFAULT_BOOTH.mixes;
  return {
    enabled: stored.enabled === true,
    heading: clean(stored.heading) || DEFAULT_BOOTH.heading,
    blurb: clean(stored.blurb) || DEFAULT_BOOTH.blurb,
    gearImageUrl: clean(stored.gearImageUrl),
    gearCaption: clean(stored.gearCaption),
    mixes,
  };
}

/**
 * The one place that decides which mix is playing right now. The page, the
 * nav link (via getNav() above) and the route guard all ask this instead
 * of reading settings.mixes directly, so a link can never point at a room
 * that isn't there: first mix with live === true and a real URL wins.
 */
export function activeMix(settings: BoothSettings): BoothMix | null {
  return settings.mixes.find((m) => m.live && typeof m.mixcloudUrl === "string" && m.mixcloudUrl.trim()) ?? null;
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

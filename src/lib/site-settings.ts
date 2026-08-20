// Server-side reads for every admin-editable setting, in one place.
//
// Each getter merges the stored row over the defaults field-by-field
// rather than replacing wholesale, so a settings row written before a new
// field existed still renders — the missing field falls back instead of
// coming through as undefined. Same rule the hero copy already followed.

import { getSetting } from "./items";
import {
  DEFAULT_BIO,
  DEFAULT_BRANDING,
  DEFAULT_COUPONS,
  DEFAULT_INVOICE,
  DEFAULT_NAV,
  DEFAULT_STARTER,
  type BioSettings,
  type Branding,
  type Coupon,
  type InvoiceSettings,
  type NavLink,
  type NavSettings,
  type StarterSettings,
} from "./settings-types";

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

export async function getNav(): Promise<NavSettings> {
  const stored = await readChromeSetting<Partial<NavSettings>>("nav", {});
  const links: NavLink[] = Array.isArray(stored.links) && stored.links.length > 0
    ? stored.links
        .filter((l) => l && typeof l.href === "string" && typeof l.label === "string")
        .map((l) => ({ label: l.label.trim(), href: l.href.trim(), show: l.show !== false }))
        .filter((l) => l.label && l.href)
    : DEFAULT_NAV.links;
  return {
    links,
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

export async function getCoupons(): Promise<Coupon[]> {
  const stored = await getSetting<Coupon[]>("coupons", DEFAULT_COUPONS);
  return Array.isArray(stored) ? stored.filter((c) => c && typeof c.code === "string") : [];
}

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const stored = await getSetting<Partial<InvoiceSettings>>("invoice", {});
  return {
    ...DEFAULT_INVOICE,
    ...stored,
    addressLines:
      Array.isArray(stored.addressLines) && stored.addressLines.length > 0
        ? stored.addressLines.filter((l) => typeof l === "string" && l.trim())
        : DEFAULT_INVOICE.addressLines,
    taxRatePercent: Number.isFinite(stored.taxRatePercent as number)
      ? Number(stored.taxRatePercent)
      : DEFAULT_INVOICE.taxRatePercent,
    enabled: stored.enabled === true,
    mode: stored.mode === "all" ? "all" : "none",
    // Forced. Checkout charges the listed price and never adds GST, so an
    // "exclusive" invoice would print a total nobody paid and over-declare
    // output tax. A stored "exclusive" value from before this rule is
    // ignored rather than honoured.
    taxMode: "inclusive",
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

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

export const DEFAULT_NAV: NavSettings = {
  links: [
    { label: "Courses", href: "/courses", show: true },
    { label: "Workshops", href: "/workshops", show: true },
    { label: "Guides", href: "/guide", show: true },
    { label: "Agency", href: "/agency", show: true },
    { label: "Shop", href: "/shop", show: false },
    { label: "Ventures", href: "/ventures", show: false },
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

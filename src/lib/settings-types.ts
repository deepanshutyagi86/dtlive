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
/* GST invoicing                                                       */
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
  legalName: string;
  tradeName: string;
  gstin: string;
  addressLines: string[];
  stateName: string;
  /** Two-digit GST state code, e.g. "09" for Uttar Pradesh. */
  stateCode: string;
  email: string;
  phone: string;
  /** SAC code for online educational/training services. */
  hsnSac: string;
  /** Combined GST rate as a percentage, e.g. 18. */
  taxRatePercent: number;
  /**
   * "inclusive" — the price the buyer paid already contains GST, and the
   *               invoice back-computes the taxable value. This is what
   *               almost every Indian D2C listing does.
   * "exclusive" — GST is added on top of the listed price.
   */
  taxMode: "inclusive" | "exclusive";
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
  legalName: "Deepanshu",
  tradeName: "Deepanshu Empire",
  gstin: "09HXMPD1277C1ZF",
  addressLines: ["Badum, Meerut", "Meerut, Uttar Pradesh – 250502", "India"],
  stateName: "Uttar Pradesh",
  stateCode: "09",
  email: "dtyagi.main@gmail.com",
  phone: "+91 98706 00903",
  hsnSac: "999293",
  taxRatePercent: 18,
  taxMode: "inclusive",
  numberPrefix: "DE/",
  financialYear: "2026-27",
  declaration:
    "We declare that this invoice shows the actual price of the service described and that all particulars are true and correct.",
  notes: "",
};

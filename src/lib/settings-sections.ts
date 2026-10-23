// Which settings section lives on which admin page.
//
// This is a PLAIN module on purpose — no "use client", no React import.
//
// It used to live inside SettingsForm.tsx, which is a client component,
// and the six settings pages are server components that imported it from
// there. In the App Router every export of a "use client" module becomes
// a client reference on the server, so reading `.title` off it threw at
// render and all six pages died. The page that shows an error is not the
// page with the bug; the boundary is.
//
// Rule this encodes: shared DATA never lives in a component file. If a
// server component and a client component both need it, it belongs in a
// module that is neither.

export type SettingsSectionKey =
  | "home" | "testimonials"
  | "bio" | "branding" | "nav" | "footer"
  | "emails" | "notify"
  | "coupons" | "tax" | "invoice" | "business"
  | "syllabus" | "guideCta" | "booth";

export interface SettingsGroup {
  title: string;
  blurb: string;
  sections: SettingsSectionKey[];
}

/**
 * The form itself is NOT split into separate components: it loads every
 * setting and saves every setting whichever page you are on, so a value
 * you cannot see round-trips untouched rather than being dropped. Only
 * the rendering is filtered. Splitting the state as well would mean six
 * forms that can each half-save — a far worse failure than one form that
 * renders a subset.
 */
export const SECTION_GROUPS: Record<string, SettingsGroup> = {
  homepage: {
    title: "Homepage",
    blurb: "Everything on deepanshutyagi.live, top to bottom — the same order a visitor scrolls it. Open a block, change it, hit Save.",
    sections: ["home"],
  },
  appearance: {
    title: "Appearance",
    blurb: "The frame around every other page — menu, footer, icons, your photo, and the card that shows when a link is shared. (The homepage has its own menu, built from its sections.)",
    sections: ["branding", "nav", "footer", "bio"],
  },
  emails: {
    title: "Emails",
    blurb: "What gets sent after someone buys or registers, and where your own copy goes.",
    sections: ["emails", "notify"],
  },
  pricing: {
    title: "Pricing",
    blurb: "Discount codes, GST, and what the invoice says. This decides what buyers are charged.",
    sections: ["coupons", "tax", "invoice"],
  },
  business: {
    title: "Business details",
    blurb: "Legal name, GSTIN, address and contact — printed on invoices and every legal page.",
    sections: ["business"],
  },
  extras: {
    title: "Extras",
    blurb: "Smaller features that have their own switches.",
    sections: ["syllabus", "guideCta", "testimonials", "booth"],
  },
};

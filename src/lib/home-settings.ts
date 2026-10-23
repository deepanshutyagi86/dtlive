// The V4 homepage's own settings — one row, key "home", like every other
// setting (no migration).
//
// Plain module on purpose: no React, no DB. The homepage server component,
// the admin panel (a client component) and the tests all import the SAME
// normaliser, so the panel can never show a shape the site would render
// differently. GET /api/settings returns raw JSON — normaliseHome() is the
// boundary that makes it safe to use without an optional chain anywhere.
//
// Every text field is "blank = default". The defaults below are the exact
// words the homepage shipped with, so saving an empty form changes nothing.

import type { ImageFocal } from "./types";

export interface HomeImage {
  /** Blob URL. "" = no photo (the surface falls back to its plain design). */
  url: string;
  focal?: ImageFocal;
}

export type HomeCardKey = "learn" | "live" | "studio" | "shipped";

export interface HomeShowcase {
  /** Shown in the fake address bar, e.g. "sanskritiantique.com". */
  name: string;
  /** Optional real link, opened from the "See it live" chip. */
  url: string;
  /** Desktop screenshot. A tall full-page capture scrolls on its own. */
  desktop: HomeImage;
  /** Phone screenshot. Optional — the desktop one is reused, cropped. */
  mobile: HomeImage;
  /** One line under the name, e.g. "D2C store · Shopify". */
  tag: string;
}

export interface HomeProofTile {
  text: string;
  image: HomeImage;
}

export interface HomeSettings {
  hero: { eyebrow: string; line1: string; line2: string; lede: string };
  /** Background photos for the four shortcut cards under the hero. */
  cards: Record<HomeCardKey, HomeImage>;
  /** The black band that crosses the gold one. */
  credos: string[];
  live: {
    /** Your photo on the ticket. Blank = the bio photo from Appearance. */
    host: HomeImage;
    hostCaption: string;
    /** Used when the workshop itself has no thumbnail. */
    cover: HomeImage;
    pitch: string;
    waitlistPitch: string;
  };
  studio: { showcase: HomeShowcase[] };
  /** Text-and-photo tiles after the shipped work. Blank = first two ticker lines. */
  proof: HomeProofTile[];
  seeker: { line: string; accent: string; sub: string; books: string[] };
  note: { text: string; sub: string };
}

export const HOME_CARD_LABELS: Record<HomeCardKey, string> = {
  learn: "Learn",
  live: "Live",
  studio: "Studio",
  shipped: "Shipped",
};

const BLANK_IMAGE: HomeImage = { url: "" };

export const DEFAULT_HOME: HomeSettings = {
  hero: {
    eyebrow: "Builder / Seeker",
    line1: "I ship things.",
    line2: "Then I teach how.",
    lede: "AI courses, live workshops, a studio that builds your site in 14 days, and the brands I run.",
  },
  cards: { learn: BLANK_IMAGE, live: BLANK_IMAGE, studio: BLANK_IMAGE, shipped: BLANK_IMAGE },
  credos: [
    "Execution is the only proof",
    "Clarity over speed",
    "Built, broke, fixed",
    "Build for humans",
    "Calm intensity",
    "Shipped, not learned",
  ],
  live: {
    host: BLANK_IMAGE,
    hostCaption: "Live with Deepanshu",
    cover: BLANK_IMAGE,
    pitch: "A few focused hours, live. You build it with me and ask as you go.",
    waitlistPitch: "The next date drops soon. Leave your number and you hear first, before it goes public.",
  },
  studio: { showcase: [] },
  proof: [],
  seeker: {
    line: "I meditate. I dance.",
    accent: "I think about death more than most people think about lunch.",
    sub: "Those aren’t the opposite of building. They’re the same engine.",
    books: [
      "The Book · Alan Watts",
      "Bhagavad Gita, Ch. 2",
      "The Beginning of Infinity",
      "The War of Art",
      "Finite and Infinite Games",
    ],
  },
  note: {
    text: "Learning without shipping is a very comfortable way to hide. I did it for years. Not anymore.",
    sub: "Everything here, I built, broke and fixed first. Take what helps.",
  },
};

/* ------------------------------------------------------------------ */

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function focal(v: unknown): ImageFocal | undefined {
  if (!isObj(v)) return undefined;
  const x = Number(v.x);
  const y = Number(v.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

export function normaliseImage(v: unknown): HomeImage {
  if (typeof v === "string") return { url: v.trim() };
  if (!isObj(v)) return { url: "" };
  const f = focal(v.focal);
  return f ? { url: str(v.url).trim(), focal: f } : { url: str(v.url).trim() };
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.map((s) => str(s)) : [];
}

/**
 * Raw stored JSON → a complete HomeSettings, with text left EXACTLY as
 * stored (blank stays blank). That is what the admin form edits.
 * resolveHome() is the second step the site applies: blank → default.
 */
export function normaliseHome(raw: unknown): HomeSettings {
  const r = isObj(raw) ? raw : {};
  const hero = isObj(r.hero) ? r.hero : {};
  const cards = isObj(r.cards) ? r.cards : {};
  const live = isObj(r.live) ? r.live : {};
  const studio = isObj(r.studio) ? r.studio : {};
  const seeker = isObj(r.seeker) ? r.seeker : {};
  const note = isObj(r.note) ? r.note : {};

  return {
    hero: { eyebrow: str(hero.eyebrow), line1: str(hero.line1), line2: str(hero.line2), lede: str(hero.lede) },
    cards: {
      learn: normaliseImage(cards.learn),
      live: normaliseImage(cards.live),
      studio: normaliseImage(cards.studio),
      shipped: normaliseImage(cards.shipped),
    },
    credos: strings(r.credos),
    live: {
      host: normaliseImage(live.host),
      hostCaption: str(live.hostCaption),
      cover: normaliseImage(live.cover),
      pitch: str(live.pitch),
      waitlistPitch: str(live.waitlistPitch),
    },
    studio: {
      showcase: (Array.isArray(studio.showcase) ? studio.showcase : []).filter(isObj).map((s) => ({
        name: str(s.name),
        url: str(s.url),
        tag: str(s.tag),
        desktop: normaliseImage(s.desktop),
        mobile: normaliseImage(s.mobile),
      })),
    },
    proof: (Array.isArray(r.proof) ? r.proof : []).filter(isObj).map((p) => ({
      text: str(p.text),
      image: normaliseImage(p.image),
    })),
    seeker: { line: str(seeker.line), accent: str(seeker.accent), sub: str(seeker.sub), books: strings(seeker.books) },
    note: { text: str(note.text), sub: str(note.sub) },
  };
}

const or = (v: string, d: string) => v.trim() || d;
const list = (v: string[], d: string[]) => {
  const clean = v.map((s) => s.trim()).filter(Boolean);
  return clean.length ? clean : d;
};

/** What the homepage renders: every blank replaced by its default, empty rows dropped. */
export function resolveHome(raw: unknown): HomeSettings {
  const h = normaliseHome(raw);
  const d = DEFAULT_HOME;
  return {
    hero: {
      eyebrow: or(h.hero.eyebrow, d.hero.eyebrow),
      line1: or(h.hero.line1, d.hero.line1),
      line2: or(h.hero.line2, d.hero.line2),
      lede: or(h.hero.lede, d.hero.lede),
    },
    cards: h.cards,
    credos: list(h.credos, d.credos),
    live: {
      host: h.live.host,
      hostCaption: or(h.live.hostCaption, d.live.hostCaption),
      cover: h.live.cover,
      pitch: or(h.live.pitch, d.live.pitch),
      waitlistPitch: or(h.live.waitlistPitch, d.live.waitlistPitch),
    },
    studio: { showcase: h.studio.showcase.filter((s) => s.desktop.url || s.mobile.url) },
    proof: h.proof.filter((p) => p.text.trim() || p.image.url).map((p) => ({ ...p, text: p.text.trim() })),
    seeker: {
      line: or(h.seeker.line, d.seeker.line),
      accent: or(h.seeker.accent, d.seeker.accent),
      sub: or(h.seeker.sub, d.seeker.sub),
      books: list(h.seeker.books, d.seeker.books),
    },
    note: { text: or(h.note.text, d.note.text), sub: or(h.note.sub, d.note.sub) },
  };
}

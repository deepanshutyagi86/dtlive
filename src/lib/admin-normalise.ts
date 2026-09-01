// Shape repair for objects loaded into the ADMIN PANEL from the settings
// table.
//
// This module exists because of a real outage. GET /api/settings returns
// the RAW stored JSON — it does NOT run the field-by-field normalisation
// that getAdPages()/getLiveSettings() apply on the server. So every field
// added to a type after a row was written arrives in the admin panel as
// undefined, and `page.testimonialPicks.includes(...)` on undefined threw
// and rendered the error boundary in place of the whole editor.
//
// The rule: an object loaded from settings must be usable without a
// single optional-chain at the point of use. If the type says a field is
// required, the normaliser supplies it. Adding a field to AdPage or
// LiveSession means adding a line here — that is the whole contract.
//
// Deliberately plain TypeScript with no React imports, so the same code
// the panels run is what the tests exercise.

import { DEFAULT_AVG_TRACK_SEC, type AdPage, type BoothSet, type LiveBlock, type LiveSession } from "./settings-types";

/**
 * Fills in every field a saved page might not have.
 *
 * This exists because GET /api/settings returns the RAW stored JSON, not
 * the shape getAdPages() normalises on the server. A page written before
 * a field existed therefore arrives here with that field undefined — and
 * `page.testimonialPicks.includes(...)` on undefined is a TypeError that
 * takes the whole editor down, which is exactly what happened.
 *
 * So: normalise once, at the boundary, for every page — not field by
 * field at each use, which only works until the next field is added.
 * Every array below MUST have a default; the type says they are required
 * and the stored data cannot be trusted to agree.
 */
export function normaliseAdPage(raw: Partial<AdPage>): AdPage {
  return {
    // Spread first so every genuinely optional field is carried through
    // untouched, then overwrite the ones the type says are required —
    // the stored data cannot be trusted to have them.
    ...raw,
    id: raw.id ?? crypto.randomUUID(),
    slug: raw.slug ?? "",
    enabled: raw.enabled === true,
    headline: raw.headline ?? "",
    subheadline: raw.subheadline ?? "",
    itemId: raw.itemId ?? "",
    kind: raw.kind === "register" ? "register" : "paid",
    ctaLabel: raw.ctaLabel ?? "",
    bullets: raw.bullets ?? [],
    faq: raw.faq ?? [],
    proofPoints: raw.proofPoints ?? [],
    testimonialPicks: raw.testimonialPicks ?? [],
    forWho: raw.forWho ?? [],
    notForWho: raw.notForWho ?? [],
    agenda: raw.agenda ?? [],
  };
}

/**
 * Fills in every field a saved session or block might not have.
 *
 * GET /api/settings returns the RAW stored JSON, not the shape
 * getLiveSettings() normalises on the server — so a row written before a
 * field existed arrives here with that field undefined, and
 * `session.blocks.map(...)` on undefined takes the whole panel down.
 *
 * That already happened once on the ad-pages editor. This panel is worse
 * to lose: it is the one open during a webinar, in front of an audience,
 * with an offer waiting to be revealed. Normalise at the boundary.
 */
export function normaliseSession(raw: Partial<LiveSession>): LiveSession {
  return {
    ...raw,
    id: raw.id ?? crypto.randomUUID(),
    slug: raw.slug ?? "",
    title: raw.title ?? "",
    subtitle: raw.subtitle ?? "",
    active: raw.active === true,
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(normaliseBlock) : [],
  };
}

export function normaliseBlock(raw: Partial<LiveBlock>): LiveBlock {
  return {
    ...raw,
    id: raw.id ?? crypto.randomUUID(),
    kind: raw.kind === "paid" || raw.kind === "link" ? raw.kind : "register",
    itemId: raw.itemId ?? "",
    // Hidden unless it explicitly says otherwise — the same default the
    // server applies, for the same reason: an unrecognised block must not
    // appear on a live page mid-webinar.
    visible: raw.visible === true,
  };
}

/**
 * Booth playlist sets — the same asymmetry, found by audit rather than by
 * an outage. getBoothSettings() in site-settings.ts normalises five
 * fields; the admin panel read `d.booth.sets` raw, so a set stored without
 * `tracklist` crashed LinesField's `value.join()`, and one without
 * `youtubePlaylistUrl` or `title` crashed the status line — taking the
 * whole Extras page down.
 *
 * Also carries the server's `mixes` fallback: a booth row written before
 * the YouTube switch stores its sets under the old key, and the admin
 * panel was showing "no playlists yet" for a room that was actually
 * playing on the live site.
 */
export function normaliseBoothSet(raw: Partial<BoothSet>): BoothSet {
  return {
    ...raw,
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title ?? "",
    youtubePlaylistUrl: raw.youtubePlaylistUrl ?? "",
    avgTrackSec: Number.isFinite(raw.avgTrackSec) ? (raw.avgTrackSec as number) : DEFAULT_AVG_TRACK_SEC,
    bpm: Number.isFinite(raw.bpm) ? (raw.bpm as number) : 120,
    startedAtIso: raw.startedAtIso ?? new Date().toISOString(),
    tracklist: Array.isArray(raw.tracklist) ? raw.tracklist.filter((t) => typeof t === "string") : [],
    live: raw.live === true,
  };
}

/** The sets out of a raw booth row, old `mixes` key included. */
export function normaliseBoothSets(stored: Record<string, unknown> | undefined): BoothSet[] {
  const raw = Array.isArray(stored?.sets)
    ? stored!.sets
    : Array.isArray(stored?.mixes)
      ? stored!.mixes
      : [];
  return (raw as Partial<BoothSet>[]).map(normaliseBoothSet);
}

/**
 * An array field read straight from settings.
 *
 * `?? []` is not enough on its own: a stored value that is a string or an
 * object survives it and then throws on .map or .join. Every list loaded
 * from the settings table goes through this.
 */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

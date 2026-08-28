// Pure booth clock + tracklist math. No server-only imports (no db, no
// neon) on purpose — this is shared by the server page render AND the
// client-side ticking clock, so it must be safe to end up in the browser
// bundle. Mirrors the split settings-types.ts already establishes: types
// and defaults there, DB reads in site-settings.ts, math here.

export interface BoothTrack {
  atSec: number;
  label: string;
}

// "12:34 Artist - Track" or "1:02:34 Artist - Track". A line that doesn't
// start with a timecode is dropped rather than thrown on — a bad line an
// admin typed should cost that one line, not the page.
const TIMECODE = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)$/;

export function parseTracklist(lines: string[]): BoothTrack[] {
  const tracks: BoothTrack[] = [];
  for (const raw of lines) {
    const m = TIMECODE.exec(raw);
    if (!m) continue;
    const [, a, b, c, rawLabel] = m;
    const label = rawLabel.trim();
    if (!label) continue;
    const atSec = c ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);
    tracks.push({ atSec, label });
  }
  return tracks.sort((x, y) => x.atSec - y.atSec);
}

/**
 * positionSec = ((now - startedAt) / 1000) % duration.
 *
 * Returns null — "not running" — for anything that would otherwise divide
 * by zero, produce a negative position, or trust a clock it shouldn't: a
 * non-positive duration, an unparseable startedAtIso, or a start time still
 * in the future. Callers render the room idle rather than crash.
 */
export function boothPosition(startedAtIso: string, durationSec: number, nowMs: number): number | null {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
  const startedMs = Date.parse(startedAtIso);
  if (!Number.isFinite(startedMs) || startedMs > nowMs) return null;
  const elapsedSec = (nowMs - startedMs) / 1000;
  return elapsedSec % durationSec;
}

/** The last track whose timecode is at or before positionSec. */
export function currentTrack(tracks: BoothTrack[], positionSec: number): BoothTrack | null {
  let current: BoothTrack | null = null;
  for (const t of tracks) {
    if (t.atSec > positionSec) break;
    current = t;
  }
  return current;
}

/**
 * The standard Mixcloud widget iframe src, built from a mix's public page
 * URL. Not the JS Widget API — that adds a `seek()` but Mixcloud's own docs
 * hedge it ("resolves true if the seek was allowed and false if it
 * wasn't") with no documented rule for when, and there is no live mix in
 * this database yet to verify it end-to-end. A plain embed the visitor
 * presses play on themselves is the reliable choice for v1; our own UI
 * above it is what makes the clock sync visible instead.
 */
export function mixcloudEmbedSrc(mixcloudUrl: string): string | null {
  try {
    const u = new URL(mixcloudUrl);
    if (!/(^|\.)mixcloud\.com$/i.test(u.hostname)) return null;
    if (!u.pathname || u.pathname === "/") return null;
    const params = new URLSearchParams({ hide_cover: "1", light: "1", feed: u.pathname });
    return `https://www.mixcloud.com/widget/iframe/?${params.toString()}`;
  } catch {
    return null;
  }
}

export function formatTimecode(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(r).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Pure booth clock + playlist math. No server-only imports (no db, no
// neon) on purpose — this is shared by the server page render AND the
// client-side ticking clock/admin form, so it must be safe to end up in
// the browser bundle. Mirrors the split settings-types.ts already
// establishes: types and defaults there, DB reads in site-settings.ts,
// math here.

import type { BoothSet, BoothSettings } from "./settings-types";

/**
 * Pulls a YouTube playlist ID out of whatever an admin pastes:
 *   - https://www.youtube.com/playlist?list=XXXX
 *   - https://www.youtube.com/watch?v=...&list=XXXX
 *   - a bare playlist ID (PLxxxx, LLxxxx, UUxxxx, ...)
 * Returns null for anything that doesn't come out to a plausible ID,
 * rather than guessing — a broken value should fail to save, not fail
 * silently at render time.
 */
const BARE_PLAYLIST_ID = /^[A-Za-z0-9_-]{10,}$/;

export function parsePlaylistId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  try {
    const u = new URL(raw);
    if (!/(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname)) return null;
    const list = u.searchParams.get("list");
    return list && list.trim() ? list.trim() : null;
  } catch {
    // Not a URL — fall through to the bare-ID case below.
  }

  return BARE_PLAYLIST_ID.test(raw) ? raw : null;
}

/** The first set marked live, regardless of whether its URL is any good —
 *  used for admin status messaging, which needs to say WHY the room is
 *  hidden rather than just that it is. Compare to activeSet() in
 *  site-settings.ts, which is the stricter "is anything actually playing"
 *  check every real render path uses. */
export function firstLiveSet(sets: BoothSet[]): BoothSet | null {
  return sets.find((s) => s.live) ?? null;
}

export interface BoothSlot {
  index: number;
  offsetSec: number;
}

/**
 * PATH A — deterministic approximation, no YouTube Data API needed.
 *
 *   elapsed = (now - startedAt) / 1000
 *   slot    = floor(elapsed / avgTrackSec)
 *   index   = slot % trackCount
 *   offset  = elapsed % avgTrackSec
 *
 * Two visitors computing this from the same (startedAtIso, avgTrackSec,
 * trackCount, nowMs) land on the exact same video at the exact same
 * offset — even though avgTrackSec is a guess and the offset drifts from
 * the video's *true* position over the course of the playlist. That
 * determinism is the entire point of this function: everyone lands in
 * the same place. Do not "fix" the drift by feeding it anything that
 * could differ between two visitors (a locally-measured duration, a
 * client-side average) — that would make it accurate for one person and
 * wrong for the room.
 *
 * Returns null — "not running" — for a non-positive avgTrackSec/trackCount,
 * an unparseable startedAtIso, or a start time still in the future.
 */
export function computeDeterministicSlot(
  startedAtIso: string,
  avgTrackSec: number,
  trackCount: number,
  nowMs: number
): BoothSlot | null {
  if (!Number.isFinite(avgTrackSec) || avgTrackSec <= 0) return null;
  if (!Number.isFinite(trackCount) || trackCount <= 0) return null;
  const startedMs = Date.parse(startedAtIso);
  if (!Number.isFinite(startedMs) || startedMs > nowMs) return null;

  const elapsedSec = (nowMs - startedMs) / 1000;
  const slot = Math.floor(elapsedSec / avgTrackSec);
  const index = slot % trackCount;
  const offsetSec = elapsedSec % avgTrackSec;
  return { index, offsetSec };
}

/**
 * PATH B — exact position from real per-track durations (YouTube Data API,
 * see lib/youtube.ts getPlaylistTimeline()). Same "wrap the whole playlist
 * and find where now lands" idea as Path A, but the cumulative timeline is
 * real instead of guessed, so index/offset land on the actual video and
 * the actual second rather than an approximation.
 */
export function computeTimelinePosition(startedAtIso: string, durationsSec: number[], nowMs: number): BoothSlot | null {
  const total = durationsSec.reduce((a, b) => a + b, 0);
  if (durationsSec.length === 0 || !Number.isFinite(total) || total <= 0) return null;
  const startedMs = Date.parse(startedAtIso);
  if (!Number.isFinite(startedMs) || startedMs > nowMs) return null;

  const elapsedSec = (nowMs - startedMs) / 1000;
  let pos = elapsedSec % total;
  for (let i = 0; i < durationsSec.length; i++) {
    const d = durationsSec[i];
    if (pos < d) return { index: i, offsetSec: pos };
    pos -= d;
  }
  // Floating-point edge case: pos lands exactly on (or fractionally past)
  // the final boundary. Land on the last track's end rather than index
  // out of range.
  const lastIndex = durationsSec.length - 1;
  return { index: lastIndex, offsetSec: Math.max(0, durationsSec[lastIndex] - 0.001) };
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

/**
 * The plain-language line the admin panel shows at the top of the Booth
 * section — computed from the CURRENT FORM STATE, not a save round-trip,
 * so it updates live as an admin edits. Mirrors activeSet()'s logic in
 * site-settings.ts exactly, because a status line that could disagree with
 * what actually renders on /booth is worse than no status line at all.
 */
export function boothStatusLine(settings: BoothSettings): string {
  if (!settings.enabled) return "Hidden — the Booth is switched off.";
  const live = firstLiveSet(settings.sets);
  if (!live) return "Hidden — no playlist is marked live.";
  const title = live.title.trim() || "Untitled";
  if (!parsePlaylistId(live.youtubePlaylistUrl)) return `Hidden — ${title} is live but has no playlist URL.`;
  return `Live — playing ${title}.`;
}

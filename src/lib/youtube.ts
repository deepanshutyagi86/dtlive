// PATH B of the booth clock (see lib/booth.ts): real per-track durations
// and titles from the YouTube Data API v3, when YOUTUBE_API_KEY is set.
// A missing key is a normal deployment state, not an error — every
// function here falls through to null so the caller lands on Path A
// (computeDeterministicSlot) without a visitor ever seeing a failure.

export interface PlaylistTrack {
  title: string;
  durationSec: number;
}

export interface PlaylistTimeline {
  tracks: PlaylistTrack[];
}

interface CacheEntry {
  data: PlaylistTimeline | null;
  expiresAt: number;
}

// Quota is 10,000 units/day and /booth is force-dynamic, so this must
// never be hit on every render. An hour is generous relative to how often
// a playlist's own contents change.
const TTL_MS = 60 * 60 * 1000;
// A failed/errored lookup (bad key, outage) is still cached, just briefly —
// long enough that a burst of visitors during an outage doesn't retry the
// API on every single request.
const FAILURE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function parseIso8601Duration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const [, h, min, s] = m;
  return (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

async function fetchAllPlaylistItems(playlistId: string, apiKey: string): Promise<{ videoId: string; title: string }[]> {
  const items: { videoId: string; title: string }[] = [];
  let pageToken: string | undefined;
  // 500-item sanity cap — not a real playlist size limit, just a floor
  // under quota burn if something is pathological (e.g. a paging bug).
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`playlistItems ${res.status}`);
    const json = await res.json();
    for (const item of json.items ?? []) {
      const videoId = item?.snippet?.resourceId?.videoId;
      const title = item?.snippet?.title;
      if (typeof videoId === "string" && typeof title === "string") items.push({ videoId, title });
    }
    pageToken = json.nextPageToken;
  } while (pageToken && items.length < 500);
  return items;
}

async function fetchDurations(videoIds: string[], apiKey: string): Promise<Map<string, number>> {
  const durations = new Map<string, number>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`videos ${res.status}`);
    const json = await res.json();
    for (const item of json.items ?? []) {
      const id = item?.id;
      const iso = item?.contentDetails?.duration;
      if (typeof id === "string" && typeof iso === "string") durations.set(id, parseIso8601Duration(iso));
    }
  }
  return durations;
}

/**
 * Real per-track durations and titles for a playlist, cached in-memory so
 * a page render never hits the API directly. Reads YOUTUBE_API_KEY inside
 * the function body (not module scope) so a key added in the platform
 * takes effect on the next call without a redeploy.
 */
export async function getPlaylistTimeline(playlistId: string): Promise<PlaylistTimeline | null> {
  const cached = cache.get(playlistId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const items = await fetchAllPlaylistItems(playlistId, apiKey);
    if (items.length === 0) {
      cache.set(playlistId, { data: null, expiresAt: Date.now() + TTL_MS });
      return null;
    }
    const durations = await fetchDurations(
      items.map((i) => i.videoId),
      apiKey
    );
    const data: PlaylistTimeline = {
      tracks: items.map((i) => ({ title: i.title, durationSec: durations.get(i.videoId) ?? 0 })),
    };
    cache.set(playlistId, { data, expiresAt: Date.now() + TTL_MS });
    return data;
  } catch (err) {
    console.error(`Booth: could not fetch playlist timeline for "${playlistId}", falling back to Path A.`, err);
    cache.set(playlistId, { data: null, expiresAt: Date.now() + FAILURE_TTL_MS });
    return null;
  }
}

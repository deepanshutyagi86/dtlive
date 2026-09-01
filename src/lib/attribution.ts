// Where a buyer came from, in your own database rather than only in
// Meta's dashboard.
//
// Meta already knows which ad produced a Purchase — that is what the fbc
// click id in meta-capi.ts is for. This is the other half: the same fact,
// stored on your own row, so "which campaign actually produced buyers, not
// just clicks" is a question you can answer without logging into Ads
// Manager, and can still answer about an ad account you no longer run.
//
// Pure and dependency-free so it can be unit-tested and imported by the
// client components that do the capturing.

/** The only keys ever stored. Anything else in a URL is ignored. */
export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  // Meta's and Google's own click ids. Present on ad traffic even when
  // whoever built the ad forgot the UTM tags, which is most of the time.
  "fbclid",
  "gclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export interface Attribution {
  params: Partial<Record<AttributionKey, string>>;
  /** Where they were when they first arrived. */
  landing?: string;
  /** Who sent them, when the browser says. */
  referrer?: string;
  /** ISO. First touch, not the moment of purchase. */
  at?: string;
}

// A cap, not a guess at what is reasonable. These land in a JSONB column
// and every value here is attacker-controllable by anyone who can type a
// URL — an uncapped query string is an uncapped database write.
const MAX_VALUE = 200;
const MAX_URL = 500;

function trim(value: string | null | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().slice(0, max);
  return cleaned || undefined;
}

/**
 * Reads the allowlisted parameters out of a query string. Returns null
 * when there is nothing worth storing, so an ordinary visit writes no
 * attribution row rather than an object full of undefineds.
 *
 * `referrer` is recorded only when it is off-site: a click from your own
 * course page to your own checkout is not a traffic source, and recording
 * it would make your own site look like your best-performing channel.
 */
export function parseAttribution(
  search: string,
  opts: { landing?: string; referrer?: string; host?: string; now?: () => Date } = {}
): Attribution | null {
  const params: Partial<Record<AttributionKey, string>> = {};
  let query: URLSearchParams;
  try {
    query = new URLSearchParams(search);
  } catch {
    return null;
  }

  for (const key of ATTRIBUTION_KEYS) {
    const value = trim(query.get(key), MAX_VALUE);
    if (value) params[key] = value;
  }

  let referrer: string | undefined;
  const rawReferrer = trim(opts.referrer, MAX_URL);
  if (rawReferrer && opts.host) {
    try {
      if (new URL(rawReferrer).hostname !== opts.host) referrer = rawReferrer;
    } catch {
      // An unparseable referrer is not worth storing, and is not worth
      // failing over either.
    }
  } else if (rawReferrer && !opts.host) {
    referrer = rawReferrer;
  }

  if (Object.keys(params).length === 0 && !referrer) return null;

  return {
    params,
    landing: trim(opts.landing, MAX_URL),
    referrer,
    at: (opts.now ?? (() => new Date()))().toISOString(),
  };
}

/** sessionStorage key. Session-scoped on purpose — see captureAttribution. */
export const ATTRIBUTION_STORAGE_KEY = "dtlive_attr";

/**
 * Call once per page load. Records FIRST touch and never overwrites it:
 * someone lands from an Instagram ad, browses three pages, then buys, and
 * the sale belongs to the ad — not to the last internal link they clicked.
 *
 * Wrapped in try/catch throughout because sessionStorage throws outright
 * in a Safari private window, and losing a marketing tag must never be
 * able to break a page.
 */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return;
    const found = parseAttribution(window.location.search, {
      landing: window.location.href,
      referrer: document.referrer,
      host: window.location.hostname,
    });
    if (!found) return;
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(found));
  } catch {
    /* private mode, storage disabled — nothing to do and nothing to say */
  }
}

/** What the checkout and registration forms send along. */
export function readAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}

/**
 * Server-side re-validation. The browser sends this object, so it is
 * untrusted input: the shape is rebuilt from the allowlist rather than
 * stored as received, which is what stops an arbitrary JSON blob of any
 * size being written into the database by anyone who can POST.
 */
export function sanitiseAttribution(input: unknown): Attribution | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, any>;
  const params: Partial<Record<AttributionKey, string>> = {};

  for (const key of ATTRIBUTION_KEYS) {
    const value = raw.params?.[key];
    if (typeof value === "string") {
      const cleaned = trim(value, MAX_VALUE);
      if (cleaned) params[key] = cleaned;
    }
  }

  const landing = typeof raw.landing === "string" ? trim(raw.landing, MAX_URL) : undefined;
  const referrer = typeof raw.referrer === "string" ? trim(raw.referrer, MAX_URL) : undefined;

  if (Object.keys(params).length === 0 && !referrer) return null;

  return {
    params,
    landing,
    referrer,
    // Never the browser's clock — a client-supplied timestamp can be any
    // value at all, including one that sorts before the row exists.
    at: new Date().toISOString(),
  };
}

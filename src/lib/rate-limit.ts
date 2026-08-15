// Per-instance, in-memory sliding window. This is deliberately not a
// distributed limiter — on a single-region Vercel deployment at this
// traffic level it stops the actual threat (a loop in someone's terminal)
// without adding a KV dependency. Swap the Map for Vercel KV if the site
// ever runs hot enough for instance fan-out to matter.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }

  recent.push(now);
  hits.set(key, recent);

  // Crude memory bound. Serverless instances are short-lived, so a full
  // clear is an acceptable worst case.
  if (hits.size > 5000) hits.clear();

  return true;
}

export function clientIpFrom(req: Request): string {
  // x-forwarded-for can carry a "client, proxy1, proxy2" chain — the first
  // entry is the caller's IP.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

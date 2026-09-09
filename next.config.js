/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for the /portfolio proxy in src/middleware.ts: without this,
  // Next's own default trailing-slash canonicalization redirect still fires
  // on the way out of middleware for "/portfolio/" (it isn't a real route),
  // sending it back to "/portfolio" and looping against the
  // "/portfolio" -> "/portfolio/" redirect middleware issues. This only
  // disables Next's *automatic* trailing-slash redirect — regular pages are
  // unaffected since they're requested at their canonical (no-slash) URLs
  // day to day. See:
  // https://nextjs.org/docs/app/api-reference/next-config-js/skipTrailingSlashRedirect
  skipTrailingSlashRedirect: true,
  // Bakes the deployed commit into the client bundle at build time — see
  // DEPLOY.md and /api/health. VERCEL_GIT_COMMIT_SHA is only set by
  // Vercel on a Git-triggered build; its absence ('local') on a deployment
  // IS the signal that something bypassed Git (a CLI deploy, a redeploy of
  // an old build) — exactly the failure mode that shipped two sessions of
  // Meta Pixel work without ever reaching production.
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "local",
    NEXT_PUBLIC_BUILT_AT: new Date().toISOString(),
  },
  experimental: {
    // Without this, the client Router Cache can reuse a recently-visited
    // route's rendered output on top of stale useState initializers (e.g.
    // admin/items/[id]/ItemForm), showing the previous item's data for a
    // moment (or longer) after navigating to a different item.
    staleTimes: { dynamic: 0 },
  },
  images: {
    // AVIF first. The ad page's LCP is a photographic 16:9 hero, where
    // AVIF lands 20-30% smaller than WebP at the same perceptual quality —
    // the cheapest real win available on a phone in India. Next 14
    // defaults to WebP only. The first transform per size is slower; every
    // one after it is an edge cache hit.
    formats: ["image/avif", "image/webp"],
    // Scoped to Vercel Blob only. `hostname: "**"` was harmless while
    // next/image was unused, but every card renders through the optimiser
    // now: an open allowlist lets anyone point /_next/image at any URL on
    // the internet and bill the transformations to this project's quota.
    // The wildcard subdomain covers the store ID, which changes if the
    // Blob store is ever recreated.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
  // /portfolio is proxied to deepanshu-one.vercel.app (keeping visitors on
  // this domain) with exact trailing-slash handling — see src/middleware.ts.
  // It has to live in middleware rather than here: next.config.js's
  // redirects()/rewrites() `source` matching is trailing-slash-insensitive
  // (path-to-regexp's default non-strict mode treats "/portfolio" and
  // "/portfolio/" as the same match), so a declarative redirect from
  // "/portfolio" to "/portfolio/" also fires for requests already at
  // "/portfolio/", redirecting it to itself in an infinite loop. Middleware
  // sees the raw pathname and can tell the two apart.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;

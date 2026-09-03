# Deploying dtlive

## The one true repo

`/Users/deepanshutyagi/Documents/claude/dtlive` — the only actual git repository for this
project on this machine. (`~/Downloads/dtlive-app`, if you still have it, is not a git
repo and predates this work by weeks. It is not a copy worth deploying from.)

## Deploy = `git push`. Never `vercel --prod`. Never "Redeploy" on an old build.

Vercel's Git integration IS connected for this project — pushing to `origin/main`
triggers a real build from that exact commit automatically, usually within seconds.
That is the only deploy path. Two things have broken it before and must not happen again:

- **`vercel --prod` / `vercel deploy --prod`** ships whatever is on disk in the current
  directory at that moment — uncommitted changes included, unpushed commits included,
  and just as easily a half-finished mid-edit state. It bypasses Git entirely. There is
  no record afterward of what was actually shipped.
- **Vercel's "Redeploy"** (dashboard button, or `vercel redeploy <url>`) re-runs an
  *existing* deployment's build, pinned to whatever commit it originally shipped. It
  re-reads current environment variables — so an env var change shows up — but it does
  **not** fetch new code. This is exactly what happened here: two full sessions of Meta
  Pixel work sat committed-then-uncommitted-then-committed locally while Production kept
  redeploying commit `e6ec924`, which predates all of it. The Pixel ID env var changed
  and looked live; the code behind it never moved. Confirmed directly against the Vercel
  API (`source: "redeploy"`, `gitSource.sha` pinned to the old commit) — not a guess.

If you need a new deployment, make a commit and `git push`. That's it.

## How to verify a deploy actually landed

```bash
npm run verify:live      # curls production /api/health
git rev-parse --short HEAD
```

Compare the `commit` field in the JSON output against the hash from the second command.
If they match, that commit is what's serving traffic right now. If `commit` says
`"local"`, the live deployment was NOT built from a Git push — `VERCEL_GIT_COMMIT_SHA`
is only set on a Git-triggered build, so its absence is Vercel's own confession that
something bypassed Git.

For local dev: `npm run verify:local` (needs `npm run dev` running).

The full check: pull the live JS and confirm the code you expect is actually in it —

```bash
curl -s https://www.deepanshutyagi.live/w/claude-workshop \
  | grep -oE '/_next/static/chunks/[a-zA-Z0-9_%.-]+\.js' | sort -u
# fetch each, then:
grep -o '.\{60\}InitiateCheckout.\{300\}' <chunk file>
```

Should show both a `value` field and a `genEventId()`-produced `eventID` in the call. If
it shows only `content_ids`, `content_name`, `content_type`, `currency` — no `value`, no
eventID — that's the old code. The deploy did not land; don't rationalize a partial
match as good enough.

## Environment variables

| Name | Where read | Sensitive | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Server | Yes | Neon Postgres connection string |
| `ADMIN_EMAIL` | Server | Yes | Admin login identity |
| `ADMIN_PASSWORD_HASH` | Server | Yes | bcrypt hash checked at admin login |
| `ADMIN_SESSION_SECRET` | Server | Yes | Signs the admin session cookie |
| `RAZORPAY_KEY_ID` | Server | No (public key) | Razorpay Checkout JS init, sent to the browser at checkout time |
| `RAZORPAY_KEY_SECRET` | Server | Yes | Signs/verifies Razorpay orders and payments |
| `RAZORPAY_WEBHOOK_SECRET` | Server | Yes | Verifies the Razorpay webhook's signature |
| `RESEND_API_KEY` | Server | Yes | Sends order confirmation / admin alert emails |
| `RESEND_FROM` | Server | No | From-address for those emails |
| `BLOB_READ_WRITE_TOKEN` | Server | Yes | Vercel Blob uploads (hero images, videos) |
| `YOUTUBE_API_KEY` | Server | Yes (quota-bound) | Real track titles/durations for the booth playlist; falls back to a deterministic guess when unset |
| `NEXT_PUBLIC_META_PIXEL_ID` | Browser | No (an ID, not a secret) | Embedded into the page for `fbq()` — see `src/lib/meta-config.ts` |
| `META_PIXEL_ID` | Server | No (an ID, not a secret) | Used only by the server-side Conversions API call — **must equal `NEXT_PUBLIC_META_PIXEL_ID` above, or Purchase dedup silently breaks** |
| `META_CAPI_TOKEN` | Server | Yes | Meta Conversions API access token |

All Meta Pixel vars are optional — if any is unset, the affected piece (browser pixel,
or server CAPI) silently no-ops. Nothing else breaks. `/api/health` reports which of
these are set (as booleans only) and whether the two pixel IDs actually match — see
below.

## The four Meta events

| Event | Fires | eventID (CAPI dedup) |
|---|---|---|
| `PageView` | `src/app/layout.tsx`'s inline init script (first load); `src/components/MetaPixelRouteTracker.tsx` (every client-side route change after the first) | None |
| `ViewContent` | `src/components/MetaPixelView.tsx`, mounted on `src/app/w/[slug]/page.tsx` — once per content id per tab (`sessionStorage` dedup) | None |
| `InitiateCheckout` | `src/components/CheckoutModal.tsx`, on every checkout-modal open, before Razorpay Checkout is invoked | `genEventId()` — fresh per open, no server-side CAPI mirror yet |
| `Purchase` | Browser: `src/components/MetaPixelPurchase.tsx`, on `/order/confirmed` mount (`sessionStorage` dedup by order id). Server: `sendMetaPurchaseEvent()` in `src/lib/meta-capi.ts`, called from both the Razorpay webhook and the `/order/confirmed` fallback path | The order id, both sides — matching IDs is what lets Meta fold the browser and server events into one conversion instead of double-counting |

Purchase is additionally guarded server-side by `claimMetaPurchaseEvent()` in
`src/lib/admin-repo.ts` — an atomic `UPDATE orders SET meta_purchase_sent_at = now()
WHERE meta_purchase_sent_at IS NULL`, so the CAPI send happens exactly once even if the
webhook and the confirmation-page fallback race each other.

## Debugging live, including through the Razorpay redirect

Append `?fbdebug=1` to any URL once. It's written to `sessionStorage` and stays on
through the full checkout flow — including the redirect to `/order/confirmed`, which is
otherwise the one hop you can't put a breakpoint on. Every `fbTrack()` call logs to the
console as `[fbq] <event> <params> eventID=<id>`, whether or not the pixel was actually
ready to receive it.

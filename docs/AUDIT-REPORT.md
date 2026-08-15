# Phase 0 Audit — 2026-08-15
Commit audited: `03e7cd49d30d56d2218fac7b5311a83a8ebab949`  ·  Branch: `prelaunch-hardening`

## Verdict

The codebase on `prelaunch-hardening` is in decent shape (clean `tsc`, clean build, sensible data-layer guards), but what's actually **deployed to production is `main`**, which is 12 commits behind — missing every security/legal hardening fix from the last audit, including two commits explicitly tagged `(P0)` by their own authors. Confirmed live: production is missing all the new security headers, and the homepage is currently showing a test/placeholder workshop ("Claude 01") as its featured spotlight item to real visitors, and the one live Agency item 404s from every link that points at it.

**Do not redesign on top of `main` as it stands.** Merge and deploy `prelaunch-hardening` first, fix the three P0s below, then Phase 1 is safe to start — the underlying data layer and payment logic are otherwise sound.

## Summary
| Severity | Count |
|---|---|
| P0 | 3 |
| P1 | 5 |
| P2 | 9 |
| P3 | 2 |

## Findings

### [P0-01] Twelve hardening commits — including two self-tagged P0s — are unmerged and unshipped
- **Area:** Section 0 — Git & deploy reconciliation
- **Where:** `main` @ `c82550b` vs `prelaunch-hardening` @ `03e7cd4`
- **Evidence:**
  ```
  $ git log --oneline main..prelaunch-hardening
  03e7cd4 legal: correct cookies section re: Meta Pixel (P0 remainder)
  17f4a70 security: add HSTS, frame, referrer and content-type headers
  1114571 safety: require ALLOW_DESTRUCTIVE_SEED to run db:seed
  8ef5558 docs: document META_PIXEL_ID and META_CAPI_TOKEN
  d7706bd copy: don't promise automated receipts before email ships
  62a5b22 legal: disclose Meta Pixel/CAPI data sharing in privacy policy (P0)
  1ed6bb5 security: expire admin session tokens after 14 days
  e6a4ca6 security: rate-limit public write endpoints and admin login
  1be1371 fix: reject sold-out and zero-price items at checkout; round paise
  b4f145d fix: use atomic seat decrement in Cashfree webhook
  ece9a9b security: gate lead-flow seat decrement to free, live workshops (P0)
  d1d4cfa security: verify admin session in dashboard layout (P0)

  $ git log --oneline prelaunch-hardening..main
  (empty — main has nothing prelaunch-hardening lacks)

  $ git log -1 --format='%H %ci %s' main
  c82550bb12e669c4299b809f60367f7f03550301 2026-08-09 03:26:46 +0530 Fix RegisterModal overflowing above the viewport with dynamic fields
  ```
  Confirmed live on production (`www.deepanshutyagi.live`), which is missing the headers commit's output:
  ```
  $ curl -sI https://www.deepanshutyagi.live/
  strict-transport-security: max-age=63072000        # platform default — no includeSubDomains/preload
  # x-content-type-options, x-frame-options, referrer-policy, permissions-policy: all absent
  ```
  vs. `next.config.js` on `prelaunch-hardening` (lines 27-40) which defines all five headers.
  These commits are the direct output of `PRELAUNCH_FIXES.md` (present, untracked, in the repo root) — a prior audit's fix brief. That audit's P0s were fixed in code and then never merged or deployed.
- **Impact:** Every hardening/legal fix from the last audit — including admin-session verification in the dashboard layout, seat-decrement gating, and the Meta Pixel privacy-policy disclosure — is live in the repo but not live on the site. Anyone auditing what's actually running today would be auditing stale, pre-hardening code.
- **Fix (do not implement):** Merge `prelaunch-hardening` → `main`, verify Vercel's production branch/deployment target in the dashboard (`MANUAL`, see below), redeploy.
- **Effort:** S

### [P0-02] Test/placeholder content is live and is the current homepage spotlight
- **Area:** Section 3/4 — Data-layer truth check, public flow
- **Where:** `items` row `slug = 'Claude-01'`; selected by `getFeaturedItem()` in `src/lib/items.ts:10-15`
- **Evidence:**
  ```
  SELECT id, title, slug, description, thumbnail, category, live, featured, "order", created_at
  FROM items WHERE slug = 'Claude-01';
  ->
  {
    "title": "Claude 01",
    "slug": "Claude-01",
    "description": "A short workshop",
    "category": "workshop",
    "live": true,
    "featured": true,
    "order": 4,
    "created_at": "2026-08-08T15:16:53.571Z"
  }
  ```
  It is the *only* featured item in the database, so `getFeaturedItem()`'s `ORDER BY "order" ASC LIMIT 1` picks it deterministically. Confirmed rendering on production right now:
  ```
  $ curl -s https://www.deepanshutyagi.live/ | grep -o "Claude 01\|A short workshop"
  Claude 01
  A short workshop
  ```
  Its one agenda item is titled "To Be Productive" with an empty body — clearly test data, not real course content.
- **Impact:** Real visitors to the live storefront right now see a fake, placeholder workshop as the hero spotlight — the single most prominent element on the homepage — instead of real "Business Foundations" or nothing at all.
- **Fix (do not implement):** Un-feature or un-publish the `Claude-01` item via `/admin/items`.
- **Effort:** S

### [P0-03] Every Agency-category item is unreachable — its own card 404s
- **Area:** Section 2/3/4 — Route inventory, data integrity, public flow
- **Where:** `src/lib/homepage.ts:27-32` (`externalFor`), `src/app/items/[slug]/page.tsx:28-30` (`notFound()`), `src/components/LiveStream.tsx:25`, `src/components/CategoryGrid.tsx:66`
- **Evidence:**
  ```ts
  // src/lib/homepage.ts
  export function externalFor(item: Item): string | null {
    if (item.category === "shop") return (d as ShopDetails).externalUrl;
    if (item.category === "venture") return (d as VentureDetails).externalUrl ?? null;
    return null;   // <-- agency (and course/workshop) always fall through to null
  }
  ```
  ```ts
  // src/app/items/[slug]/page.tsx:28
  if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
    notFound();
  }
  ```
  Both the homepage stream card and the `/agency` category-grid card for an agency item link to `/items/[slug]` (there is no external URL for `agency`, unlike shop/venture). That page then 404s unconditionally for category `"agency"`. Confirmed live, from both entry points, on production, for the one live agency item ("Website in 14 days"):
  ```
  $ curl -s https://www.deepanshutyagi.live/ | grep -o 'href="/items/website-in-14-days"'
  href="/items/website-in-14-days"
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/items/website-in-14-days
  404
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/agency
  200   # the /agency listing page itself loads fine, and links to the same dead URL
  ```
  This is a stronger, unconditional version of the exact failure mode the audit brief asked me to check for on shop/venture (empty `externalUrl`) — for shop/venture the current live data happens to have `externalUrl` set (see Section 3 below, zero rows returned), so that specific data-driven case is currently dormant. The agency case has no data dependency at all — it is broken for every agency item, always.
- **Impact:** The Agency door is one of five primary navigation paths (`Doors.tsx`) into the site. Every card for it, everywhere it appears, is a dead link today.
- **Fix (do not implement):** Either give `externalFor()` an agency case (e.g. link to `/agency` or an external URL field), or make `ItemDetailPage` render agency items instead of calling `notFound()`.
- **Effort:** S

### [P1-01] Cashfree webhook's seat-decrement guard races the `/order/confirmed` fallback
- **Area:** Section 5 — Payment integrity
- **Where:** `src/app/api/webhooks/cashfree/route.ts:30-46`, `src/app/order/confirmed/page.tsx:19-36`, `src/lib/admin-repo.ts:168-170`
- **Evidence:**
  ```ts
  // webhook route — non-atomic read-then-branch
  const order = await getOrderById(orderId);        // SELECT
  if (isPaid) {
    if (order.status !== "paid") {                  // stale read, not part of the UPDATE
      await setOrderStatus(order.id, "paid");
      if (order.item.category === "workshop") {
        await decrementWorkshopSeats(order.itemId);  // only reached if the stale read said "not yet paid"
      }
    }
  }
  ```
  ```ts
  // src/lib/admin-repo.ts:168
  export async function setOrderStatus(id: string, status: Order["status"]): Promise<void> {
    await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;   // no WHERE status = 'pending' guard
  }
  ```
  ```ts
  // order/confirmed/page.tsx:25-31 — independently flips status to "paid", with NO seat decrement
  if (order && order.status === "pending") {
    const cfOrder = await fetchCashfreeOrder(order.id);
    if (cfOrder.order_status === "PAID") {
      await setOrderStatus(order.id, "paid");   // <-- seats never touched here
      order = { ...order, status: "paid" };
    }
  }
  ```
  By contrast, `decrementWorkshopSeats` (admin-repo.ts:227-238) and `claimMetaPurchaseEvent` (admin-repo.ts:145-152) *are* single atomic `UPDATE ... WHERE ... RETURNING` statements — the pattern is understood and used correctly elsewhere in the same file, just not for this status-check.
- **Impact:** A buyer is very often redirected to `/order/confirmed` before the webhook lands. If that page's fallback wins the race and flips `status` to `"paid"` first, the webhook — when it does arrive — sees `order.status === "paid"` already and skips `decrementWorkshopSeats` entirely. The workshop's seat count silently never reflects that sale, so a seat-limited workshop can be oversold. (The opposite race — two webhook retries both reading "pending" before either writes — would instead double-decrement one sale's seat.) No orders exist in the database yet (see Section 3), so this hasn't caused visible harm, but it is close to certain to hit the first paid, seat-limited workshop.
- **Fix (do not implement):** Make the webhook's status flip itself the atomic, conditional guard (`UPDATE orders SET status='paid' WHERE id=$1 AND status='pending' RETURNING id`) and gate the seat decrement + Meta event on that update actually returning a row, the same pattern already used for `claimMetaPurchaseEvent`.
- **Effort:** M

### [P1-02] Free-workshop registration doesn't check seats or date before accepting
- **Area:** Section 4/5 — Public flow, payment/registration integrity
- **Where:** `src/app/api/leads/route.ts:23-29,89-97`
- **Evidence:**
  ```ts
  // only checks item.live — not seatsLeft, not date
  if (itemId && (!item || !item.live)) {
    return NextResponse.json({ error: "This item is not available." }, { status: 404 });
  }
  ...
  if (isFreeWorkshop) {
    await decrementWorkshopSeats(item!.id);   // return value discarded
  }
  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
  ```
  `decrementWorkshopSeats` (admin-repo.ts:227-238) correctly no-ops (returns `false`) when `seatsLeft <= 0`, but the route never inspects that return value — the lead is created and the `200`/"You're in 🎉" response (`RegisterModal.tsx:140`) fires regardless. There is also no check anywhere in this route for `details.date` being in the past. The paid-checkout route (`api/checkout/create-order/route.ts`) does check seats (line 40) but likewise never checks date.
- **Impact:** Once a free workshop's seats hit 0 (or its date has passed), the registration form still accepts submissions, still emails Meta a Lead event, and still tells the visitor they have a seat — with nothing on the backend reflecting reality.
- **Fix (do not implement):** Check `decrementWorkshopSeats`'s return value and reject the registration (409) if `false`; add a past-date check to both the lead route and the checkout route.
- **Effort:** S

### [P1-03] Receipt/GST-invoice promise still isn't backed by any code path, in two places the earlier fix missed
- **Area:** Section 10 — Known gaps register (honesty bug per brief instructions)
- **Where:** `src/app/order/confirmed/page.tsx:59`, `src/components/Spotlight.tsx:91`, `src/app/api/webhooks/cashfree/route.ts:48-50`
- **Evidence:**
  ```
  // order/confirmed/page.tsx:59 (already on prelaunch-hardening, i.e. post-fix)
  {order.item.title} — we'll email your access details and GST invoice to {order.buyerEmail} shortly.

  // Spotlight.tsx:91 — NOT touched by the copy-fix commit
  <span ...>Secured by Cashfree · instant receipt</span>

  // webhooks/cashfree/route.ts:48-50
  // TODO: generate the PDF receipt here (GST included, matching the
  // existing /courses flow) and store its URL on the order, then
  // optionally email/WhatsApp it to the buyer.
  ```
  `package.json` has no mail-sending dependency at all, and no code path anywhere sends an email or WhatsApp message. Commit `d7706bd` ("copy: don't promise automated receipts before email ships") softened the `order/confirmed` copy from a past-tense claim ("receipt sent") to a future one ("we'll email... shortly") — but it's still a promise nothing fulfills, and it missed `Spotlight.tsx` entirely, which still says "instant receipt" verbatim.
- **Impact:** A paying buyer is told twice (once before paying, once after) that an email/receipt is coming. It never arrives. This is explicitly called out by the audit brief as a P1 honesty bug, not a P3 feature gap.
- **Fix (do not implement):** Drop the "instant receipt" line from `Spotlight.tsx`; either ship the email or soften the `order/confirmed` copy further (e.g. "I'll follow up by email/WhatsApp with your access details").
- **Effort:** S

### [P1-04] No `not-found.tsx` or `error.tsx` anywhere in the app
- **Area:** Section 4 — Public flows (404/error handling)
- **Where:** `src/app/` (absence)
- **Evidence:**
  ```
  $ find src/app -iname "not-found.tsx" -o -iname "error.tsx" -o -iname "global-error.tsx"
  (no output)

  $ curl -s http://localhost:3000/items/nonexistent-xyz | grep -o "404\|This page could not be found"
  404
  This page could not be found
  404
  This page could not be found
  ```
  The rendered page has no `<Nav />`, no `<Footer />`, none of the site's typography or color system — it's Next's bare, unstyled default. Since **every** page is `force-dynamic` (see P2-04 below), a DB outage would similarly fall through to Next's generic unhandled-error page for literally every route, with no branded recovery message.
- **Impact:** A mistyped or stale link (very plausible — shared links, old marketing copy) drops the visitor onto a jarring, off-brand page with no way back except the browser back button. A DB blip takes down every page with the same generic treatment.
- **Fix (do not implement):** Add `src/app/not-found.tsx` and `src/app/error.tsx` using the existing `Nav`/`Footer`/typography.
- **Effort:** S

### [P1-05] No favicon, no OG image, no `metadataBase` — broken link previews on a link-shared storefront
- **Area:** Section 8 — SEO, metadata & social preview
- **Where:** `src/app/layout.tsx:22-26` (root `metadata`), repo root (no `public/` directory)
- **Evidence:**
  ```
  $ ls -la public/                          # no such directory anywhere in the repo
  $ find src/app -iname "*icon*" -o -iname "*apple*" -o -iname "opengraph*"
  (no output)
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/favicon.ico
  404
  ```
  Root `layout.tsx` sets only `title`/`description` — no `metadataBase`, no `openGraph`. The only `openGraph` block anywhere is on item-detail pages (`items/[slug]/page.tsx:18`), and it's conditioned on `item.thumbnail`, which every single live item currently has empty (see Section 3/9 below — 7/7 live items, confirmed by direct query).
- **Impact:** This is explicitly a link-shared storefront (WhatsApp/Instagram DMs per the brief). Every link shared today — homepage or any item page — previews with no image and the browser/OS's generic fallback icon.
- **Fix (do not implement):** Add `public/favicon.ico` + `icon`/`apple-icon` files, set `metadataBase` and a default `openGraph` image on the root layout.
- **Effort:** S

### [P2-01] `npm run lint` is non-functional — no ESLint config exists
- **Area:** Section 1 — Build & type integrity
- **Where:** `package.json:8` (`"lint": "next lint"`), repo root
- **Evidence:**
  ```
  $ find . -maxdepth 2 -iname "*eslint*" -not -path "./node_modules/*"
  (no output)
  $ npm run lint
  ? How would you like to configure ESLint? https://nextjs.org/docs/basic-features/eslint
  ❯  Strict (recommended)
     Base
     Cancel
  ```
  It has never been configured — running it just launches an interactive setup wizard, which also means it would hang indefinitely in a non-interactive CI environment rather than lint anything.
- **Impact:** Lint has effectively never run on this codebase. No lint warnings/errors could be reported for this section because the tool never actually executes.
- **Fix (do not implement):** Run `next lint` interactively once to generate a config (or add `eslint.config.mjs` with `next/core-web-vitals` directly), commit it.
- **Effort:** S

### [P2-02] No `robots.txt` / `sitemap.ts`
- **Area:** Section 8 — SEO, metadata & social preview
- **Where:** `src/app/` (absence)
- **Evidence:**
  ```
  $ find src/app -iname "sitemap*" -o -iname "robots*"
  (no output)
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/robots.txt
  404
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/sitemap.xml
  404
  ```
  The site has no `noindex` anywhere either, so it is currently indexable — it's just invisible to crawlers wanting a sitemap and has no explicit crawl policy.
- **Impact:** Slower/incomplete search discovery of item pages; no control over crawl budget.
- **Fix (do not implement):** Add `src/app/robots.ts` and `src/app/sitemap.ts`.
- **Effort:** S

### [P2-03] Text-contrast failures against the light background (WCAG AA)
- **Area:** Section 7 — Responsive & accessibility baseline
- **Where:** `tailwind.config.ts:8-16` (color tokens), used throughout `src/components` and `src/app`
- **Evidence** (computed via the standard WCAG relative-luminance formula, background `bone` `#F2F1EC` unless noted):
  ```
  text-muted       #8b8a80 vs bone  -> 3.07:1   (needs 4.5:1 for body text — FAILS)
  text-marigold-deep #D98E00 vs bone -> 2.37:1  (needs 3:1 even for large text — FAILS)
  text-live        #FF3B30 vs bone  -> 3.14:1   (needs 4.5:1 for body text — FAILS)
  ink-soft         #41403a vs bone  -> 9.20:1   (passes)
  marigold-deep    vs ink (#191913) -> 8.51:1   (passes — Spotlight's dark-bg usage is fine)
  ```
  Concretely: the homepage hero "right now." span (`page.tsx:85`, `text-marigold-deep`), the order-confirmed "✓ PAYMENT CONFIRMED" badge (`order/confirmed/page.tsx:52`, 11px), the "DT.live" wordmark (`Nav.tsx:8` and others), and the contact-page email/phone links (`contact/page.tsx:28,34`) all use `text-marigold-deep` on the light background. Every form's error message — checkout, registration, admin login — uses `text-live` on the light background. `text-muted` is the default color for nearly every mono caption/label site-wide.
- **Impact:** Marginal-to-clear AA contrast failures on hero copy, status badges, and — worst of all — the exact text (form error messages) that most needs to be readable.
- **Fix (do not implement):** Darken `marigold-deep` and/or restrict it to dark backgrounds only; darken `muted` and `live` a few steps, or bump their weight/size where they must stay light.
- **Effort:** S

### [P2-04] Every page is unconditionally `force-dynamic`, including static legal pages
- **Area:** Section 1 — Build & type integrity (route table)
- **Where:** 20 files under `src/app`, e.g. `src/app/terms/page.tsx:6`, `privacy/page.tsx:6`, `refund-policy/page.tsx:6`, `shipping-policy/page.tsx:6`
- **Evidence:**
  ```
  $ grep -rn 'export const dynamic = "force-dynamic"' src/app | wc -l
  20
  ```
  Every route in the `next build` route table below is `ƒ (Dynamic)` — none are `○ (Static)` except `/_not-found` (Next's own default) and `/admin/login`. `/terms`, `/privacy`, `/refund-policy`, `/shipping-policy` read no request-specific data and have no reason to be server-rendered on every hit — this looks like the blanket `staleTimes`/no-store fix in `cf757b0` ("Fix stale reads: disable fetch caching on the Neon HTTP driver") was applied file-by-file to every page rather than scoped to pages that actually query the DB.
- **Impact:** Unnecessary server render + DB round-trip risk (even though these 4 pages don't query the DB, they still pay the dynamic-render cost) on every hit to purely static legal copy.
- **Fix (do not implement):** Drop `export const dynamic = "force-dynamic"` from the four legal pages (and any other page that doesn't read from the DB or request).
- **Effort:** S

### [P2-05] No `<label>`/`<input>` association anywhere in the codebase
- **Area:** Section 7 — Accessibility baseline
- **Where:** All 15 `<label>` elements repo-wide, e.g. `RegisterModal.tsx:167`, `CheckoutModal.tsx:98`
- **Evidence:**
  ```
  $ grep -rn "htmlFor" src --include="*.tsx" --include="*.ts" | wc -l
  0
  $ grep -rn "<label" src --include="*.tsx" | wc -l
  15
  ```
  Every label relies on visual/DOM adjacency to its input rather than `htmlFor`/`id`.
- **Impact:** Screen readers can't reliably associate the label text with its input across every public form (checkout, free-workshop registration) and every admin form.
- **Fix (do not implement):** Add matching `id`/`htmlFor` pairs.
- **Effort:** S

### [P2-06] Modal close buttons are well under the 44×44px tap-target minimum
- **Area:** Section 7 — Accessibility baseline
- **Where:** `src/components/RegisterModal.tsx:130-134`, `src/components/CheckoutModal.tsx:86-90`
- **Evidence:**
  ```tsx
  <button onClick={close} aria-label="Close" className="sticky top-0 float-right text-2xl leading-none text-muted hover:text-ink bg-bone">
    ×
  </button>
  ```
  `text-2xl leading-none` with no padding, no `min-w`/`min-h` — the tappable box is only as large as the glyph's own line box (roughly 24px), well under the 44×44px guideline. (Both buttons do correctly carry `aria-label="Close"` — that part is fine.)
- **Impact:** Harder to reliably close the checkout/registration modal on a phone, the primary conversion surface on the site.
- **Fix (do not implement):** Add `p-2` or an explicit `min-w-[44px] min-h-[44px]` to both.
- **Effort:** S

### [P2-07] Slug case-sensitivity: one item's slug breaks the lowercase-URL convention
- **Area:** Section 3 — Data-layer truth check
- **Where:** `items` row `slug = 'Claude-01'`; `getItemBySlug` in `src/lib/items.ts` (`WHERE slug = ${slug}`, case-sensitive in Postgres)
- **Evidence:**
  ```
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/items/Claude-01
  200
  $ curl -s -o /dev/null -w "%{http_code}\n" https://www.deepanshutyagi.live/items/claude-01
  404
  ```
  Every other slug in the database is lowercase-hyphenated (`business-foundations`, `vyrelle-meesho`, `sanskriti-the-antique`, `muchhad-desi-eats`, `flatbot-pg-finder`, `website-in-14-days`). `ItemForm.tsx` never normalizes the slug field on save.
- **Impact:** Anyone typing the conventionally-expected lowercase URL for this item gets a 404. (This item is also P0-02 above, so it will go away once that's fixed — but the underlying lack of slug normalization will bite the next item created this way.)
- **Fix (do not implement):** Lowercase/slugify on save in `ItemForm.tsx` and/or the `POST`/`PATCH /api/items` handlers.
- **Effort:** S

### [P2-08] Email/phone are never format-validated, only presence-checked
- **Area:** Section 4/5 — Public flow, form validation
- **Where:** `src/components/RegisterModal.tsx:56-60`, `src/components/CheckoutModal.tsx:38`, `src/app/api/leads/route.ts:37-41,56-58`, `src/app/api/checkout/create-order/route.ts:19`
- **Evidence:**
  ```ts
  // RegisterModal.tsx:56-60 — required-field check only
  for (const f of fields) {
    if (f.required && !form[f.key]?.trim()) { setError("Please fill in all required fields."); return; }
  }
  // api/leads/route.ts:56-58 — presence only, no format check
  if (!email && !phone) {
    return NextResponse.json({ error: "At least one contact field..." }, { status: 400 });
  }
  ```
  No regex/format validation for email or phone appears anywhere client- or server-side; `type="email"`/`type="tel"` on the `<input>`s is the only browser-native nudge, and it's never enforced (no native form `required`/submit, just a click handler).
- **Impact:** A malformed email ("asdf") or non-Indian/garbage phone number reaches lead/order creation and the Meta CAPI send untouched, degrading CAPI match quality and making follow-up contact impossible for that lead.
- **Fix (do not implement):** Add a basic email regex and Indian 10-digit phone check server-side (client-side is optional polish).
- **Effort:** S

### [P2-09] `images.remotePatterns` allows any HTTPS host, but `next/image` is never used
- **Area:** Section 9 — Visual asset readiness
- **Where:** `next.config.js:10-12`
- **Evidence:**
  ```js
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  ```
  ```
  $ grep -rln "next/image" src --include="*.tsx"
  (no output)
  ```
- **Impact:** No current attack surface (the optimizer is never invoked), but it's a dormant, maximally-broad allowlist that Phase 1 should tighten to the actual image hosts once `next/image` is adopted rather than inheriting as-is.
- **Fix (do not implement):** Scope `remotePatterns` to the actual thumbnail/image hosting domain(s) once `next/image` is introduced.
- **Effort:** S

### [P3-01] Hero headline makes a 2.26× jump in one step, exactly at the `md:` breakpoint
- **Area:** Section 7 — Responsive & accessibility baseline
- **Where:** `src/app/page.tsx:81` (`text-[46px] md:text-[104px]`)
- **Evidence:** `tailwind.config.ts` has no custom `screens`, so `md:` is Tailwind's unmodified default, 768px. There is no `sm:` intermediate step — the jump from 46px to 104px happens in a single 0px-wide transition right at 768px.
- **Impact:** Unknown without visual inspection — flagged `MANUAL` below rather than guessed.
- **Fix (do not implement):** Add an `sm:` or `lg:` intermediate size, or use `clamp()`.
- **Effort:** S

### [P3-02] `CASHFREE_ENV` stored in mixed case, not the uppercase the code/docs imply
- **Area:** Section 5 — Payment integrity
- **Where:** `.env` (`CASHFREE_ENV`), `src/lib/cashfree.ts:5`
- **Evidence:** `.env.example` documents `CASHFREE_ENV="SANDBOX" # SANDBOX | PRODUCTION`; the actual `.env` value is `"Sandbox"` (mixed case). `cashfree.ts:5` does a strict `=== "PRODUCTION"` check, so this is currently harmless — it just happens to also not equal `"PRODUCTION"` — but it's a silent footgun: whoever eventually flips this to go live could type `"Production"` and the strict check would silently keep it in sandbox mode instead of erroring.
- **Impact:** None today (confirmed both `CASHFREE_ENV === "PRODUCTION"` and `NEXT_PUBLIC_CASHFREE_ENV === "PRODUCTION"` evaluate to `false`, so the app is sandbox end-to-end as intended). Worth normalizing before the eventual production flip.
- **Fix (do not implement):** Normalize the env value to uppercase, or make the check case-insensitive.
- **Effort:** S

## Manual checks for the owner

1. **Confirm Vercel's production deployment source.** Open the Vercel dashboard → Project → Settings → Git, and confirm which branch triggers production deploys. Everything in P0-01 is inferred from `git log` + live `curl` evidence (production is missing the header commit's output) — I can't see the Vercel dashboard directly. If it's already tracking `prelaunch-hardening` and simply hasn't redeployed, that changes the fix from "merge" to "just redeploy."
2. **Click through a full Cashfree sandbox payment end-to-end**, in a browser, for a paid course or workshop, and watch `/admin/orders` and the item's seat count before/after. I deliberately did not trigger a real checkout myself (it would `INSERT` a row into the same database used for real order history, violating the audit's SELECT-only rule) — the order table is currently completely empty, so this flow has apparently never been exercised end-to-end even in sandbox.
3. **Submit a real free-workshop registration** via `/items/Claude-01` (or whichever item is live once P0-02 is fixed) and confirm it appears in `/admin/leads` and that the Meta Lead event fires once, not twice. Same reasoning as #2 — not run myself to avoid writing to the shared DB.
4. **Paste the homepage URL into a WhatsApp or Instagram DM** and look at the link preview now, so you have a before/after once P1-05 (favicon/OG image) ships.
5. **Visually check the hero headline (`page.tsx`) between ~700px and 900px wide** — code shows a 46px→104px jump at exactly 768px (P3-01); I can't tell from source alone whether it wraps or overflows awkwardly.
6. **Test `/admin/login`'s rate limit under real traffic**, or at least be aware: `src/lib/rate-limit.ts` is an in-memory, per-instance limiter by design (documented in its own comment) — on Vercel's Fluid Compute, concurrent instances each have their own counter, so the effective limit is looser than "5 attempts per 15 minutes" once the app is warm across multiple instances.
7. **Confirm `LinkedIn` footer link isn't actually broken** — `curl -I https://linkedin.com/in/deepanshutyagi86` returned `403`, which is very likely LinkedIn's anti-bot response to a non-browser request rather than a dead profile, but I couldn't distinguish the two from a script. Open it in a real browser to confirm.

## Known gaps (accepted, not bugs)

- **Cashfree production keys** — deliberately deferred by the owner; confirmed both `CASHFREE_ENV` and `NEXT_PUBLIC_CASHFREE_ENV` resolve to sandbox (`=== "PRODUCTION"` is `false` for both), and the client SDK mode check in `CheckoutModal.tsx:62` correctly defaults to `"sandbox"` for any other value. Not flipping this is explicitly out of scope — see P3-02 for a minor related footgun.
- **Post-payment email / WhatsApp notification** — TODO in the webhook (`webhooks/cashfree/route.ts:48-50`); see P1-03 for the copy that currently overpromises this.
- **GST invoice / PDF receipt** — same TODO as above, not built.
- **Custom domain `deepanshutyagi.live`:**
  ```
  $ curl -sI https://deepanshutyagi.live
  HTTP/2 308
  location: https://www.deepanshutyagi.live/
  strict-transport-security: max-age=63072000
  ```
  Apex correctly 308-redirects to `www`, which serves the site (`200`).
- **Vyrelle physical commerce** — not built, no code references found.

## Phase 1 readiness notes

**Thumbnail column.** Confirmed: `thumbnail` is written by the admin form (`ItemForm.tsx`) and the `POST /api/items` handler, and its *only* read-side consumer anywhere in the codebase is `generateMetadata` on the item-detail page (`items/[slug]/page.tsx:18`, gated on `item.thumbnail ? [item.thumbnail] : []`):
```
$ grep -rn "\.thumbnail\|thumbnail:" src --include="*.tsx" --include="*.ts" | grep -v "ItemForm.tsx\|admin-repo.ts\|db.ts\|types.ts"
src/app/api/items/route.ts:32:      thumbnail: thumbnail || null,
src/app/items/[slug]/page.tsx:18:    openGraph: { ... images: item.thumbnail ? [item.thumbnail] : [] },
```
No card, spotlight, grid, or directory tile renders it. All 7 live items currently have it null/empty, confirmed by direct query.

**`/public` inventory.** There is no `public/` directory in the repository at all — zero static assets shipped today.

**`next/image`.** Never imported anywhere (`grep -rln "next/image" src` returns nothing). `images.remotePatterns` already allows any HTTPS host (see P2-09) — Phase 1 can start using `next/image` immediately without a `next.config.js` change, though the allowlist should be tightened once the real host is known.

**Where an image would slot in, per component:**
| Component | Used by | Current visual | Likely image slot | Implied aspect ratio |
|---|---|---|---|---|
| `LiveStream.tsx` `Card` | Homepage stream | Pure typography, 270–290px wide cards | Top of card, above the category chip | Roughly 16:9 to 4:3 at that width |
| `Spotlight.tsx` | Homepage featured item | Dark `bg-ink` panel, `grid md:grid-cols-[1.4fr_1fr]` — right column currently holds only the countdown + CTA | Right column (`1fr`), beside/behind the countdown | Portrait-ish, matches the `1fr` column width |
| `Doors.tsx` | Category nav ("Pick a door") | Pure typography with a dark hover-reveal overlay | Background image revealed on hover, behind the dark overlay | Wide/banner, full row width |
| `DirectoryGrid.tsx` (shop/venture) | `/shop`, `/ventures` | Text-only cards with a tag chip | Top of card, above the platform/equity chip | Similar to `LiveStream` cards |
| `Testimonials.tsx` | Homepage | Text-only quote cards, no avatar | Small avatar beside the quote mark / attribution line | Square (1:1) |
| Item detail page (`items/[slug]/page.tsx`) | `/items/[slug]` | No image at all — straight into the title/description | Hero banner above or beside the title | Wide, ~2:1 to 3:1 given the `max-w-[860px]` content column |

**Fonts.** All three faces load via `next/font/google` in `src/app/layout.tsx`: `Syne` (display, weights 600/700/800, `--font-syne`), `Instrument_Sans` (body, weights 400/500/600, `--font-instrument`), `Space_Mono` (mono, weights 400/700, `--font-space-mono`) — self-hosted by Next, no external font-loading calls, no separate `font-display` override needed since `next/font` handles that itself.

**Tailwind token set** (`tailwind.config.ts`), to extend rather than duplicate in Phase 1:
```
colors:  bone #F2F1EC · ink #191913 · ink-soft #41403a · muted #8b8a80 ·
         card #FFFFFF · line #DEDCD2 · marigold #F5A300 · marigold-deep #D98E00 · live #FF3B30
radii:   card = 14px  (most components additionally use one-off arbitrary radii, e.g. rounded-[18px]/[20px]/[10px] in modals — no single radius scale is consistently applied)
shadows: no tokens defined — every shadow in the codebase is an inline arbitrary value (e.g. shadow-[0_14px_34px_-18px_rgba(25,25,19,0.28)]), repeated with slight variations across LiveStream/CategoryGrid/DirectoryGrid
animation: pulse2 keyframe (1.6s infinite) for the live-dot; ticker's 30s linear scroll defined ad hoc in globals.css, not in the Tailwind config
```
Given the contrast failures in P2-03, Phase 1 should treat `marigold-deep`, `muted`, and `live` as needing adjustment (or restriction to dark backgrounds) rather than copying them forward as-is for new text uses.

# deepanshutyagi.live — Full Handoff

**Written 18 Aug 2026. Owner: Deepanshu Tyagi.**

This file is self-contained. It is the complete state of the project and replaces any
prior context. Hand it to a fresh Claude session (Cowork or Claude Code) and it should
be able to pick up without asking you to re-explain anything.

---

# START HERE — the one thing outstanding

Branch **`phase-2-ux-fixes`**, commit **`bc79444`**, is committed locally and **has never
been pushed**. It contains three bug fixes and two design changes (detail in Phase 2
below). `tsc` and `lint` pass. **`npm run build` has never been run on it** — the session
that wrote it was sandboxed without access to `fonts.googleapis.com`, and this branch
introduces a new Google font, so that is exactly the case that could not be tested.

Nothing else should start until that branch is built, pushed, previewed and merged.

## How to use this file

**In a new Cowork session:** attach this file, connect the folder
`/Users/deepanshutyagi/Documents/claude/dtlive`, and say "read DTLIVE-HANDOFF.md, we're
continuing this." Note the Cowork sandbox cannot build or push (see Environment limits) —
it is good for reading, editing and committing only.

**In Claude Code (your own terminal):** a copy of this file lives at the repo root as
`DTLIVE-HANDOFF.md` (untracked). Start with the prompt in the next section.

---

# The Claude Code prompt to run first

Paste this into Claude Code from inside the repo:

```
Read DTLIVE-HANDOFF.md in this repo first — it is the full project state.

Then do exactly this, and nothing beyond it:

1. Confirm the branch state before touching anything: verify HEAD of
   phase-2-ux-fixes is bc79444, that main is c5c8459, and show me
   `git diff main..phase-2-ux-fixes --stat`. Stop and tell me if any of that
   does not match.

2. Run the real gates on that branch, in order, and report each result verbatim:
   - npx tsc --noEmit
   - npm run build
   - npm run lint
   The build is the one that matters — it is the first time next/font will try to
   fetch Bricolage Grotesque. Lint must come back with exactly the 2 known
   pre-existing @next/next/no-img-element warnings and no new ones. If the build
   fails, do not attempt a fix without telling me what failed first.

3. If all three pass, push the branch: `git push -u origin phase-2-ux-fixes`.
   Then find the resulting Vercel preview deployment for that branch, confirm it
   reaches Ready, and give me the preview URL. Use the Vercel CLI if it is
   available; otherwise tell me and I will check the dashboard myself.

4. STOP THERE. Do not merge to main. I need to review the preview on desktop and
   phone first. I will tell you to merge in a separate message.

Constraints are in the "Environment limits and hard rules" section of the handoff
file. The important ones: the local .env points at the PRODUCTION database and is
SELECT-only; do not commit .claude/, PHASE-0-AUDIT-BRIEF.md, PRELAUNCH_FIXES.md or
_to_delete/; you may delete _to_delete/ and run git gc.
```

## What to check on the preview yourself

Nobody but you can do this part.

1. Open a paid course, click Enroll — is the modal centred on **desktop**? (It used to
   hang off the top of the screen.)
2. Type into the fields — is the text **black**? (It used to go white as you typed.)
3. Repeat both on your **phone**.
4. Does Bricolage Grotesque look right at the huge homepage headline size? Pure taste
   call — if it doesn't, say so and it can be swapped again cheaply.
5. Scroll to the new homepage category sections — is it clear, or too long?
6. While you're on the phone: look at an item detail page's hero image against a
   portrait photo. See the open question in "Image system" below.

## Then merge

```
Preview looks good. Merge phase-2-ux-fixes into main with --no-ff, push, and
confirm the production deployment builds from the new merge SHA. Report the
deployment ID and the SHA it built from.
```

**Immediately after that deploys:** open Claude 01 in `/admin/items` and confirm the date
reads **20 Aug, 6:00 pm**. It was edited while the timezone drift bug was live, so the
stored value may be 5h30m off. Now that the field is honest, whatever it shows is true.

---

# What this project is

Storefront / marketplace hub at **deepanshutyagi.live**. Separate from the portfolio at
deepanshutyagi.me. Homepage is a draggable "live stream" carousel of whatever is currently
active — courses, workshops, agency, shop, ventures — driven by live/featured toggles in a
custom `/admin` panel. Full spec: `deepanshutyagi-live-PRD.md` in the repo.

Local repo: `/Users/deepanshutyagi/Documents/claude/dtlive`

## Stack

- Next.js 14.2.35, App Router, TypeScript, Tailwind
- Neon Postgres, **raw SQL** via `@neondatabase/serverless` — **no Prisma**.
  `src/lib/db.ts`, `src/lib/items.ts`, `src/lib/admin-repo.ts`
- Payments: **Cashfree, sandbox mode**. `src/lib/cashfree.ts`
- Admin auth: single-user, cookie-based, custom. `src/lib/auth.ts` → `getAdminSession()`
- Email: **Resend**. `src/lib/email.ts`, `src/lib/order-notifications.ts`. Verified sending
  domain `operations.deepanshutyagi.live` (Tokyo region). Free tier 100/day, 3,000/month.
- Images: Vercel Blob store `dtlive1-images` (public, IAD1), `@vercel/blob@2.8.0`
- Analytics: `@vercel/analytics@^2.0.1` + `@vercel/speed-insights@^2.0.0`, mounted in
  `src/app/layout.tsx`. Confirmed collecting as of 18 Aug.
- Fonts: **Bricolage Grotesque** (display) + Instrument Sans (body) + Space Mono (mono),
  all via `next/font/google`. Syne was dropped on 18 Aug — it reads as the default
  "AI landing page" typeface, which was the exact complaint.
- Vercel project `dtlive1` · GitHub `deepanshutyagi86/dtlive` · domain via name.com
- Colour tokens: bone `#F2F1EC` background, ink `#191913`, marigold `#F5A300` /
  `#D98E00`, live-red `#FF3B30`

## Environment variables

Production + Preview have: `RESEND_API_KEY`, `RESEND_FROM`
(`Deepanshu Tyagi <orders@operations.deepanshutyagi.live>`), `BLOB_READ_WRITE_TOKEN`,
and the Neon set.

**`CASHFREE_WEBHOOK_SECRET` is still MISSING** — this is P0-04 and it is the last broken
thing in the payment path. `META_PIXEL_ID` / `META_CAPI_TOKEN` are absent by choice.

---

# Commit history

**Production = `main` = `c5c8459`.** Deployment `dpl_Ei7oyWhpE36kBg7QbhvQpxi5fKrz`, Ready.

| Commit | What |
|---|---|
| `073f28f` | Hardening merge — closed P0-01 + P0-03 |
| `5f88a42` | Admin leads: phone/email display, wa.me + tel links, CSV export |
| `85a4794` | Stage 1 — full image system |
| (merge) | Stage 2/2b — hero, spotlight, ticker; desktop wheel scroll |
| `afba18c` | Notifications, ESLint config, settings-driven hero + email copy |
| `e672216` | Stages 3/4 — images on category, directory and item detail pages |
| `e2d1ef2` | Stage 5 — checkout/register modals + consistency sweep (`phase-1-modals`, `3ec38bd`) |
| `880f7b3` | Placeholder text darkened, rephrased as "e.g. …" examples (`2bf420e`) |
| `c5c8459` | Vercel Analytics + Speed Insights mounted in layout — **production HEAD** |
| `bc79444` | **Phase 2 — UNPUSHED. Branch `phase-2-ux-fixes`.** |

Untracked and deliberately uncommitted: `.claude/`, `PHASE-0-AUDIT-BRIEF.md`,
`PRELAUNCH_FIXES.md`, `_to_delete/`, and this file.

---

# Phase 2 — what is sitting in `bc79444`

Five changes. Three of them are bugs found from screenshots on 18 Aug.

## 1. CheckoutModal now portals to `document.body`

RegisterModal already did; CheckoutModal did not. That one omission caused **two
unrelated-looking symptoms**:

- **Position.** Both checkout triggers sit inside a `position: fixed` bar, and the desktop
  nav uses `backdrop-blur-md`. A `backdrop-filter` makes that element the containing block
  for any `position: fixed` descendant — so `fixed inset-0` resolved against a ~50px-tall
  nav, and the modal centred itself on the nav instead of the viewport, hanging off the top
  of the screen.
- **Colour.** The mobile bottom bar sets `text-bone`. The inputs never set their own text
  colour, so typed text inherited near-white on a bone panel, while the explicitly-set
  `placeholder-ink-soft` stayed dark. Hence "black when empty, invisible when you type".

Only courses and paid workshops were affected, because free workshops open RegisterModal.

**Rule going forward: any modal overlay must be portalled.** An inline `fixed` overlay is
one `backdrop-blur` / `transform` / `filter` ancestor away from silently breaking, and
inherits text colour from wherever its trigger happens to live. Both modals now also set
`text-ink` explicitly on the panel and inputs so neither can inherit its way back.

## 2. The admin workshop date was corrupting itself

`datetime-local` speaks **local wall-clock time**; `details.date` is stored as **UTC ISO**.
The field did `details.date.slice(0,16)`, feeding UTC digits into a field that reads them
as local — so in IST it displayed 5h30m early. And because the displayed value is what gets
saved, **every open-and-save shifted the real workshop another 5h30m earlier.**

Now converts through `getTimezoneOffset()` in both directions —
`toLocalInputValue` / `fromLocalInputValue`, defined at the top of `ItemForm.tsx`.
Clearing the field also used to throw (`new Date("").toISOString()` is a RangeError);
it yields `""` now.

## 3. Font swap

Syne → Bricolage Grotesque, variable (wght 200–800), **no `weight` array** so
`font-bold` / `font-extrabold` resolve to real instances rather than synthesised ones.
Body and mono untouched. Also updated the raw `var(--font-syne)` inside `LegalPage.tsx`,
which sits outside Tailwind's `font-display` class.

## 4. Spotlight is image-led

It already carried the featured item's slug and category but was never handed
`thumbnail` / `imageFocal`. Now it is — rendered in the right column above the countdown,
capped at `max-w-[320px]` so it supports the headline rather than competing with it.

Separately: **a featured course no longer shows a countdown at all.** The old fallback
counted down to `Date.now() + 6 days` — an invented deadline that silently reset on every
page load. Only workshops, which have a real start time, get a clock.

## 5. Homepage doors are now labelled category sections

Each of the five categories gets an eyebrow, a plain-English explanation of what the
category *is*, a live count, a "See all →" link, and a two-column grid of its actual items —
so the whole catalogue is visible without navigating. The homepage now shows each item
twice (carousel + section); that is intentional.

## New file: `src/components/ItemCard.tsx`

There were three near-identical copies of the card markup (CategoryGrid, DirectoryGrid, and
nearly a fourth in Doors). The differences were drift, not design. All three now render
`ItemCard`; grid column counts stay per-surface via the `sizes` prop.

One behaviour change fell out of merging them: a workshop marked "unlimited registration"
no longer prints "20 seats left" on its card — false scarcity, and the detail page already
got this right.

## Gates status on this branch

- `npx tsc --noEmit` — clean
- `npm run lint` — clean at the 2 known warnings, zero new
- `npm run build` — **NOT RUN.** This is the whole reason for the prompt above.

---

# What is proven working, and what is not

## Proven on 18 Aug ✅

- **Emails work end to end.** Two sandbox purchases on the live domain each produced a
  correct "Payment confirmed — <item>" email from `orders@operations.deepanshutyagi.live`,
  with correct name / amount / order-id substitution, delivered to two different Gmail
  accounts. A Claude 01 free registration produced its "Got your details" lead email.
  `/admin/orders` shows both orders as PAID. This was the single highest-risk unknown on
  the project and it is now closed.
- **A sandbox purchase completes end to end.** Order reaches PAID on the live domain.
- **Analytics is collecting.** 3 visitors / 17 page views on 18 Aug, referrers
  `payments-test.cashfree.com` and `sandbox.cashfree.com`, 71% desktop / 29% mobile.

## Not proven ❌

- **The seat decrement.** It lives *only* in the Cashfree webhook, and the webhook still
  500s because `CASHFREE_WEBHOOK_SECRET` is missing. The two PAID orders decremented
  nothing. Harmless while Claude 01 is unlimited; it matters the moment a seated workshop
  sells.

---

# How the pieces work

## Editable in `/admin/settings` — no deploy needed

`heroCopy` {eyebrow, line1, line2, subline} · `emailCopy` {paidBuyer, paidAdmin, leadBuyer,
leadAdmin} each {subject, body} · `ticker` · `testimonials` · `notifyEmail` · `footerLinks`.

Blank fields fall back to code defaults individually. Email placeholders —
`{name} {firstName} {item} {amount} {orderId} {email} {phone}` — are substituted at send;
missing values render as `""`, and all substituted values are HTML-escaped.

> **A code push CANNOT change anything in that list. The DB row wins.** If copy on the live
> site isn't matching the code, this is why.

## Image system — the three tokens

All in `src/components/ItemImage.tsx`, single source of truth:

- `ITEM_IMAGE_ASPECT_CLASS = "aspect-[3/2]"` — cards (carousel, all grids, spotlight, modals)
- `ITEM_DETAIL_HERO_ASPECT_CLASS = "aspect-[16/9]"` — item detail hero
- `ITEM_IMAGE_OBJECT_POSITION_CLASS = "object-top"` — default crop anchor

`ItemImage` takes an `aspectClassName` prop, defaulting to the card token. **Do not try to
override the ratio via `className`** — Tailwind utility conflicts resolve by stylesheet
order, not prop order, so it's a coin flip.

> **OPEN QUESTION:** 16:9 is the widest ratio in the system and most source photos are
> portrait phone shots — a 3:4 portrait keeps under half its height at 16:9. This has never
> been reviewed on an actual phone. If detail heroes look squeezed, change that one token
> to `3/2` or `4/3`.

## Image system — mechanics

- `ItemPlaceholder.tsx` renders five category treatments from a deterministic per-slug hash,
  used whenever an item has no thumbnail.
- Upload: `src/app/api/admin/upload/route.ts`, `handleUpload` from `@vercel/blob/client` —
  **client** uploads. `onBeforeGenerateToken` calls `getAdminSession()` and throws if absent.
  jpeg/png/webp only, server-side size cap, `addRandomSuffix`.
- Compression: `src/lib/image-compress.ts` — canvas, ≤1600px longest edge, WebP ~0.82. EXIF
  handled via `createImageBitmap(file, { imageOrientation: "from-image" })`.
- Focal point: `details.imageFocal = {x, y}` (0–100) inside the existing JSONB — no schema
  change. Absent → falls back to `object-top`.
- **Every surface must pass BOTH `thumbnail` AND `details.imageFocal` through.** Since Phase 2
  the card surfaces all route through `ItemCard`, so that is one place instead of three.
  Still wired separately: the carousel, the detail hero, both modals, and the spotlight.
- **No blob deletion.** Replacing an image orphans the old blob. Accepted leak.

## Modals

Stage 5 (`e2d1ef2`) was a presentation-only redesign. **Payment and submit logic is
byte-for-byte unchanged** — `pay()`, the fetch body, the Cashfree SDK `checkout()` call,
form state, validation, every error message, `register()`, its `fbq()` call, and the success
copy were all explicitly untouched. If a payment bug appears, neither Stage 5 nor Phase 2 is
the cause.

- Panels: `rounded-card`, `max-h-[90dvh]`, flex-none image+close header above a scrolling
  body, page scroll locked while open, 44px close target.
- `src/lib/useModalBehavior.ts` (shared): Escape closes, focus moves to the first focusable
  element on open, Tab/Shift+Tab trapped inside the panel, focus returns to the trigger on
  close. The focusable list is re-queried on every Tab rather than cached, because
  RegisterModal swaps form → success without closing.
- Both are portalled as of `bc79444`.

## Notifications

Four emails, all copy editable in settings: paid-buyer, paid-admin, lead-buyer, lead-admin.

- Shared `sendPaidOrderNotifications(order)` is called from **both** the webhook and the
  `/order/confirmed` fallback. **Only the fallback actually runs today** (webhook 500s), and
  the fallback is what the successful 18 Aug tests exercised.
- Refresh cannot resend: the fallback only runs when `status === "pending"` and sets `paid`
  before returning.
- Every send is in its own try/catch. A Resend failure can never make the webhook return
  non-2xx (Cashfree would retry forever) or fail a lead insert.
- Missing `RESEND_API_KEY` / `RESEND_FROM` → `console.warn` and return, never throws.
- `notifyEmail` blank → falls back to `footerLinks.email` → null → **admin alert skipped
  silently. If admin alerts seem broken, check this first.**
- No idempotency column — relies on the same non-atomic status guard as seats (P1-01).

## Payment path

- Signature scheme confirmed correct:
  `Base64(HMAC-SHA256(x-webhook-timestamp + rawBody, secret))`, raw body via `req.text()`
  before any parse. Matches the Cashfree spec exactly.
- `CASHFREE_WEBHOOK_SECRET` is the **sandbox Client Secret Key**. Cashfree PG has no
  separate per-endpoint webhook secret.
- Missing secret → throws → 500. Fails **closed**. 500 is the correct status (retryable),
  not 401.
- The seat decrement lives ONLY in the webhook.
- Cashfree sandbox keeps its own webhook list, separate from production. Confirm an endpoint
  exists there at all before trusting any test.

## Analytics

Confirmed collecting. **One open issue:** `layout.tsx` imports `Analytics` from
`@vercel/analytics/react`, but Vercel documents `@vercel/analytics/next` for App Router
(`/react` is the create-react-app entry). Verified in `node_modules`: `dist/next` imports
`next/navigation` and runs `computeRoute(pathname, pathParams)`; `dist/react` has zero
occurrences of `computeRoute`.

Visible effect already in the dashboard — `/items/ai-at-work` and
`/admin/items/c1958df6-…` appear as raw URLs instead of grouping under `/items/[slug]` and
`/admin/items/[id]`. **One-line fix, not yet made.** Fold it into whatever ships after
Phase 2; it was deliberately left out so the preview shows exactly what gets reviewed.
`SpeedInsights` is already imported correctly.

---

# Audit status

Tracked in `docs/AUDIT-REPORT.md`. **P0-01 and P0-03 are CLOSED.**

- **P0-02, partially addressed.** Claude 01 now has a date (Thu 20 Aug, 6:00 pm IST) and the
  site renders it correctly. The date was edited while the drift bug was live, so **re-check
  the stored time in /admin once `bc79444` is deployed.** Which other items are seed content
  is still unanswered. The leads against Claude 01 are Deepanshu's own test submissions, not
  real customers.
- **P0-04, OPEN, blocked on Cashfree.** `CASHFREE_WEBHOOK_SECRET` absent, webhook 500s
  everywhere. Payments and emails work anyway via the fallback; the seat decrement does not.
- **P1-01, open.** The webhook's outer `order.status !== "paid"` guard is non-atomic. Both
  notification call sites and the seat decrement depend on it. Fix with an idempotency
  column once migrations against production become possible.

---

# Environment limits and hard rules

## The Cowork device sandbox cannot build or push

If a future session runs inside Cowork rather than your terminal, it will hit all of these:

- The proxy **403s `fonts.googleapis.com` and `fonts.gstatic.com`**, so `next/font` cannot
  fetch any family not already cached in `.next`. A *new* font is exactly the failing case.
- The proxy **403s `github.com`**, so no push.
- Each shell call is a fresh PID namespace capped around **45 seconds**, so backgrounding a
  long build does not survive between calls.
- It **cannot `unlink`**, so git leaves a stale `.git/index.lock` after any index write.
  Symptom: "Another git process seems to be running". `mv` it aside and retry. A `git gc`
  from your own terminal clears the stray `.git/objects/**/tmp_obj_*` files.
- It has **no git identity** — commits from there need `-c user.name=… -c user.email=…`.

**Practical consequence:** `tsc` and `lint` can run from a Cowork session; `npm run build`
and `git push` must happen in your own terminal.

## Hard rules

- **The local `.env` points at the PRODUCTION Neon database. SELECT only.** Never
  `INSERT` / `UPDATE` / `DELETE` / `DROP` / `TRUNCATE`, never `db:push`, never `db:seed`.
  **This blocks all migrations — design around it.**
- Anything editable in `/admin/settings` cannot be changed by a deploy. The DB row wins.
- Real gates: `npx tsc --noEmit` + `npm run build`. `npm run lint` too — 2 known warnings,
  **zero new is the bar**.
- Switching branches leaves a stale `.next/types` referencing routes that don't exist on the
  new branch. If tsc complains about a file you know isn't there, clear `.next` first.

## Smaller gotchas

- Vercel "Sensitive" vars → `vercel env pull` writes the literal string `[SENSITIVE]`.
  `BLOB_READ_WRITE_TOKEN` is Production+Preview only, so a plain (Development) pull misses it.
- Resend shows an API key's full value **once**, at creation. Lost = delete and recreate.
- `/api/admin/upload` is POST-only. A GET returns 405 — that proves nothing about the auth
  gate, since the framework rejects the method before auth runs.
- Google Drive and ChatGPT image URLs do **not** work as image sources. Test with
  `https://picsum.photos/800/600`.
- The admin item image field is at `/admin/items` → open an item → "Thumbnail URL
  (optional)". **Not** on the list view.
- Cashfree sandbox test card: `4111 1111 1111 1111`, CVV `123`, any future expiry, OTP `123456`.
- `CASHFREE_ENV` / `NEXT_PUBLIC_CASHFREE_ENV` live in `.env`, not `.env.local`.
- **Solved, do not relitigate:** the git LibreSSL/Keychain problem (Homebrew git + PAT) and
  the silent `db:push`/`db:seed` failure (`node -r dotenv/config ... tsx`).

---

# Known gaps — accepted, not bugs

- **Meta Pixel:** vars absent, so the Pixel never loads and CAPI never fires. The privacy
  policy already correctly discloses `_fbc`/`_fbp` — **do not revert that.**
- `<MetaPixelPurchase>` fires on every load of `/order/confirmed` — a real P1 the moment
  `META_PIXEL_ID` is set.
- `npm audit` warnings (Next.js version, postcss, nanoid) are pre-existing or transitive.
- Homepage social-proof numbers and testimonials have never been verified as real vs seeded.
- No blob deletion; replacing an image orphans the old one.

---

# Everything remaining, in order

1. **Build, push, preview, review, merge `phase-2-ux-fixes`.** See START HERE.
2. **After deploying**, re-open Claude 01 in `/admin` and confirm the date reads
   20 Aug 6:00 pm — it was edited while the drift bug was live.
3. Trim the ticker to three claims in `/admin/settings` (the DB still holds five).
4. Upload photos and set focal points on the remaining items.
5. Review the 16:9 detail hero on a phone against a portrait photo; retune the token if tight.
6. Close P0-02 properly: confirm Claude 01 is really happening, and identify which other
   items are seed content.
7. **Blocked on Cashfree:** get `CASHFREE_WEBHOOK_SECRET`, register a Sandbox webhook
   endpoint, re-run a purchase, and confirm **the seat decrement** — the one part of the
   payment path the 18 Aug tests could not prove.
8. Small code, fold into the next commit: analytics import →
   `@vercel/analytics/next`.

## Still unbuilt / deferred

- Spotlight is now image-led, but nothing else on the homepage is.
- GST invoice / PDF receipt — the webhook TODO still stands. Copy no longer promises it.
- WhatsApp notifications via Twilio — not built. Copy no longer promises them.
- Vyrelle physical e-commerce — planned, not live.
- Flagged during the Stage 5 sweep, still undecided: `admin/(auth)/login` and
  `admin/(dashboard)/layout` use `min-h-screen` (100vh, not dvh) — lower risk than the
  modals were, since it's normal document flow rather than a fixed overlay that can clip.
  And the admin panel's own input/button styling was never cross-checked against the public
  card language — different context, probably intentional.

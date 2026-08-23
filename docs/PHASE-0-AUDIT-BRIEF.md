# PHASE 0 — Pre-Redesign System Audit
**Repo:** `deepanshutyagi86/dtlive` · **Site:** deepanshutyagi.live · **Executor:** Claude Code

---

## RULES OF ENGAGEMENT — read before touching anything

1. **This is READ-ONLY.** Do not fix, refactor, rename, reformat, or "improve while I'm here." You are finding problems, not solving them.
2. **The only file you may create is `docs/AUDIT-REPORT.md`.** Plus throwaway scripts in `/tmp` that you delete afterwards.
3. **Database: `SELECT` only.** No `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, no `db:push`, no `db:seed`. There is real order history in this database.
4. **Do not touch `.env` / `.env.local`,** do not print secret values into the report (host names and boolean "is set / is missing" only).
5. **Cashfree stays in SANDBOX.** Production keys are deliberately deferred by the owner. Do not suggest flipping them as a "fix" — log it in the Known Gaps section instead.
6. **Every finding needs evidence.** `file:line` plus the actual command output that proves it. If you're inferring rather than observing, say so explicitly with the word `ASSUMED`.
7. **If a check needs a real browser, a real phone, or a Vercel/Cashfree dashboard,** don't guess and don't skip — mark it `MANUAL` and write the exact click-path or steps into the MANUAL CHECKS section for the owner to run.
8. **Severity scale:**
   - `P0` — broken in production, or risks money/data loss/security
   - `P1` — a real user hits this and gets a bad or confusing outcome
   - `P2` — polish, inconsistency, tech debt with a real cost
   - `P3` — nice to have
9. **One commit at the end**, message: `docs: phase 0 system audit report`. Nothing else committed.

---

## SECTION 0 — Git & deploy reconciliation

There was a `prelaunch-hardening` branch with roughly a dozen security commits. Establish **what is actually deployed** before auditing anything else.

```bash
git status
git branch -a
git log --oneline -25
git log --oneline main..prelaunch-hardening 2>/dev/null | cat
git log --oneline prelaunch-hardening..main 2>/dev/null | cat
git log -1 --format='%H %ci %s' main
```

Report:
- Current branch, and whether the working tree is dirty (list any uncommitted/untracked files)
- Commits on `prelaunch-hardening` **not** in `main` (these are hardening fixes that may never have shipped) — list each one
- Commits on `main` not in `prelaunch-hardening`
- The HEAD commit of `main` with its date

**If any hardening commit is unmerged, that is an automatic P0** — flag it by name.

---

## SECTION 1 — Build & type integrity

```bash
node -v && npm -v
npx tsc --noEmit
npm run lint
npm run build
```

Report:
- Every TypeScript error (full text) — any error is P0
- Every lint warning, grouped by rule, with counts
- Whether the build succeeds, total build time
- The route table Next prints at the end of `build` — copy it verbatim into the report; note anything unexpectedly `ƒ (Dynamic)` or unexpectedly static
- Any `npm` peer-dependency or deprecation warnings

---

## SECTION 2 — Route inventory & dead links

1. Enumerate every route from the `src/app` tree: path, file, `dynamic` export setting, and whether it is auth-guarded.
2. Grep every internal link and cross-check it against that list:

```bash
grep -rn 'href="/' src --include=*.tsx --include=*.ts | sort
```

3. Verify the `/portfolio` and `/portfolio/:path*` redirects in `next.config.js` still point at a URL that resolves (`curl -sI` the destination).
4. List every `/api/*` route with its HTTP methods.

Report as a table: `Route | File | Rendering | Auth | Status`. Any `href` pointing at a route that does not exist is **P1**. Any link to an external site that returns 4xx/5xx is **P1**.

---

## SECTION 3 — Data-layer truth check (SELECT only)

Write a throwaway script at `/tmp/audit-db.ts`, run it with the same pattern `package.json` uses for db scripts (`node -r dotenv/config node_modules/.bin/tsx /tmp/audit-db.ts`), then **delete it**. Do not add it to the repo.

It must report:

**Counts**
- items total / live / featured, broken down by category
- orders by status (`pending` / `paid` / `failed`), and total paid amount
- leads total, and how many in the last 30 days

**Integrity problems** — each row found is a finding:
- More than one item with `featured = true` (which one does the homepage actually pick? check the ORDER BY in `getFeaturedItem`)
- `live = true` items with an empty `description`
- **Workshops that are `live` with a `details.date` in the past**
- **Workshops that are `live` with `seatsLeft <= 0` and `unlimitedSeats` not set**
- Courses/workshops that are `live` with `price` of 0 where that looks unintentional (list them, let the owner decide)
- **`shop` / `venture` items that are `live` but have an empty `externalUrl`** — trace `externalFor()` in `src/lib/homepage.ts`: if it returns null, the card links to `/items/[slug]`, and `src/app/items/[slug]/page.tsx` calls `notFound()` for any category that isn't course/workshop. Confirm whether this produces a live 404 on the homepage. If yes → **P0**.
- Orders whose `item_id` no longer resolves to an existing item
- `live = true` items with a null/empty `thumbnail` (not a bug today — this is the Phase 1 input, see Section 9)
- Items whose `details` JSON is missing fields the UI reads for that category (compare against `emptyDetails()` in `src/app/admin/(dashboard)/items/[id]/ItemForm.tsx`)

---

## SECTION 4 — Public flows: code trace + local run

Start the dev server and actually hit these. Use `curl -s -o /dev/null -w "%{http_code}"` for status codes and `curl -s | head` where you need markup.

For each of: **paid course**, **paid workshop**, **free workshop (price 0)**, **shop item**, **venture item** — pick a real live slug from Section 3 and record:
- `GET /` → 200, and does the item appear in the stream?
- `GET /items/<slug>` → status code
- What the CTA button is and what it opens

Then trace, in code, and report on:
- **Empty states.** What does the homepage render if zero items are live? If no item is featured? Read `src/app/page.tsx` — is `LiveStream` with an empty array safe (check the `items.length === 0` early return in the effect and whether the marquee collapses)?
- **The lead/registration path** for free workshops — does a submission actually land in `leads`?
- **Form validation** — what happens on empty name / malformed email / non-Indian phone number? Is validation server-side or only client-side?
- **404 handling** — is there a custom `not-found.tsx`? What does a bad slug look like to a user?
- **Error handling** — is there an `error.tsx`? What does the user see if the DB is unreachable?

---

## SECTION 5 — Payment integrity (sandbox, trace only — do not modify)

Read `src/lib/cashfree.ts`, the checkout API route, and `src/app/api/webhooks/cashfree/route.ts`. Answer each explicitly:

1. **Is the charged amount derived server-side from the DB**, or is it read from the client request body? If the client can influence price → **P0**.
2. **Is the webhook signature verified** before the payload is trusted? Show the line.
3. **Is the webhook idempotent** on Cashfree retries? Cashfree retries. Trace what happens when the same payload arrives twice — especially the seat decrement and the Meta CAPI send (`meta_purchase_sent_at` looks like the guard for the latter — confirm, and check whether seats have an equivalent guard).
4. **Where does the seat decrement happen**, and is it a single atomic SQL statement or a read-then-write?
5. **Can a sold-out or past-dated workshop still create an order?** Trace the checkout route's pre-checks.
6. **Order status transitions** — enumerate every code path that writes `orders.status`. Note the `/order/confirmed` fallback path and whether it can race the webhook.
7. **Confirm `CASHFREE_ENV` / `NEXT_PUBLIC_CASHFREE_ENV` are both SANDBOX** and that the client SDK mode is driven by the public one.
8. **Log the receipt/notification TODO** in the webhook — do not implement it.

---

## SECTION 6 — Admin & auth surface

Build a table of **every** route under `src/app/admin/**` and **every** route under `src/app/api/**`:

`Route | Method | Calls getAdminSession()? | Behaviour if unauthenticated`

Any mutating API route that does not check the session is **P0**. Verify by actually curling them logged-out:

```bash
curl -s -o /dev/null -w "%{http_code} " http://localhost:3000/api/items
```

Also report:
- Session cookie flags in `src/lib/auth.ts`: `httpOnly`, `secure`, `sameSite`, `maxAge` — is there an expiry?
- Is there rate limiting on `/admin/login`? Where?
- Does any admin page leak buyer PII (email/phone) into a client component or a `console.log`?
- Does `/admin/diagnostics` print `DATABASE_URL` beyond the hostname?

---

## SECTION 7 — Responsive & accessibility baseline

This section directly feeds Phase 1, so be thorough and specific.

- Grep for hard-coded pixel widths that can overflow a 360px viewport:
  ```bash
  grep -rn 'w-\[\|max-w-\[\|min-w-\[\|text-\[' src/components src/app --include=*.tsx | sort
  ```
  List every value that exceeds ~340px without a responsive counterpart.
- `src/components/LiveStream.tsx`: check the touch handling — are `touchstart`/`touchmove` listeners passive or non-passive, is `preventDefault` called, and **can a user scroll the page vertically while their thumb is over the carousel?** If the carousel traps vertical scroll on mobile that is **P1**.
- Does the homepage produce horizontal page scroll at 360px? Check for anything wider than the viewport outside the intentional carousel.
- Tap targets: list interactive elements whose rendered size is likely under 44×44px (the admin toggles, the nav links, the card CTAs).
- Accessibility grep: `<img>` without `alt`, buttons/links whose only content is an icon or arrow character, form inputs without an associated `<label>`.
- The hero is `text-[46px]` on mobile and `text-[104px]` on desktop — note where the jump happens and whether anything breaks between 360px and 768px.
- Colour contrast: check `text-muted` and `text-ink-soft` against the bone `#F2F1EC` background. Report the computed ratios against WCAG AA (4.5:1 body, 3:1 large text). Anything failing is **P2**.
- Is `prefers-reduced-motion` respected everywhere there's motion (carousel, live-dot pulse, hover transforms)?

---

## SECTION 8 — SEO, metadata & social preview

- Does the root layout set `metadata`? Is `metadataBase` set? (Without it, relative OG image URLs break.)
- Is there a default OG image? What does a link to the homepage look like when pasted into WhatsApp/Instagram DM right now? If there's no OG image at all → **P1**, since this is a link-shared storefront.
- favicon / `apple-icon` / `icon` present in `src/app`?
- `robots.txt` and `sitemap.ts` — present or absent?
- Do item detail pages set a canonical URL, and does it point at `deepanshutyagi.live`?
- Is the site currently indexable (no stray `noindex`)?

---

## SECTION 9 — Visual asset readiness (input for Phase 1)

This is reconnaissance, not a bug hunt. Report plainly:

1. Confirm or refute: **the `thumbnail` column is written by the admin form and read only by `generateMetadata` on item detail pages — no card, no spotlight, no grid actually renders it.** Grep for every consumer of `thumbnail` / `item.thumbnail` and list them with `file:line`.
2. Inventory `/public` — every file, its size, and whether anything references it.
3. Confirm `next.config.js` `images.remotePatterns` allows `https://**` and note whether `next/image` is imported anywhere at all in the codebase.
4. List every component that currently renders a card, tile, or hero: `LiveStream`, `Spotlight`, `Doors`, `DirectoryGrid`, `Testimonials`, item detail page. For each, note **where an image would slot in** and what aspect ratio the current layout implies.
5. Report the font stack actually loaded (`font-display`, `font-mono`) and how — Google Fonts, `next/font`, or system fallback.
6. Report the full Tailwind token set from `tailwind.config.*` — colours, radii, shadows — so Phase 1 extends the existing system instead of inventing a parallel one.

---

## SECTION 10 — Known gaps register (record only, do NOT fix)

State each with current status and where the code hook lives:
- Cashfree production keys — deferred by owner, sandbox intentional
- Post-payment email / WhatsApp notification — TODO in the webhook; the order-confirmed page may claim a receipt was sent that isn't
- GST invoice / PDF receipt
- Custom domain `deepanshutyagi.live` — report what `curl -sI https://deepanshutyagi.live` returns
- Vyrelle physical commerce — not built

For the second item specifically: **check whether `/order/confirmed` tells the user a receipt/email is on its way.** If it does and nothing sends, that's a **P1 honesty bug**, not a P3 feature gap.

---

## OUTPUT — `docs/AUDIT-REPORT.md`

Structure it exactly like this:

```
# Phase 0 Audit — <date>
Commit audited: <sha>  ·  Branch: <branch>

## Verdict
<2–3 sentences: is this safe to redesign on top of, or does something need fixing first?>

## Summary
| Severity | Count |
| P0 | n |
| P1 | n |
| P2 | n |
| P3 | n |

## Findings
### [P0-01] <short title>
- **Area:** <section>
- **Where:** `src/path/file.tsx:123`
- **Evidence:**
  ```
  <actual command output or code excerpt>
  ```
- **Impact:** <what a real user or the business experiences>
- **Fix (do not implement):** <one or two lines>
- **Effort:** S / M / L

## Manual checks for the owner
<numbered, with exact click-paths or steps — see below>

## Known gaps (accepted, not bugs)

## Phase 1 readiness notes
<the Section 9 reconnaissance, written as input to the redesign>
```

Order findings by severity, then by section. Number them `P0-01`, `P1-01`, etc.

**When done:** print to the terminal the path to the report, the severity summary table, and the P0 titles only. Then commit.

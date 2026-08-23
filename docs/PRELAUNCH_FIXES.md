# PRELAUNCH_FIXES.md — implementation brief for Claude Code

Repo: `dtlive` (Next.js 14 App Router, TypeScript, Tailwind, Neon Postgres via `@neondatabase/serverless`, Cashfree).

This brief closes 3 P0 security/legal blockers and 8 P1 issues found in a pre-launch audit. Implement **all sections in order**. Each section is self-contained and ends with its own commit.

---

## Ground rules

1. **Do not refactor anything not named in this brief.** No file moves, no dependency additions, no formatting-only changes to untouched lines.
2. **Do not add any npm packages.** Every fix here uses what's already installed.
3. **Do not run `npm run db:seed` or `npm run db:push`** at any point. No schema or data changes are required by this brief.
4. After each section: `npx tsc --noEmit` must pass before you commit that section.
5. After the final section: `npm run build` must succeed.
6. One commit per section, using the commit message given at the end of each section.
7. If a code block below doesn't match the file exactly (whitespace, an intervening edit), adapt to the real file rather than forcing the literal text — but preserve the exact semantics described.
8. Work on a branch: `git checkout -b prelaunch-hardening` before starting.

---

## Section 1 — [P0] Verify admin session on every dashboard page

**Problem.** `src/middleware.ts` only checks that the `dt_admin_session` cookie is *present*, not that it's validly signed (Edge runtime can't use Node `crypto`). The middleware's comment claims every admin page re-verifies server-side via `getAdminSession()`. That is false: only `/admin/diagnostics` does. `/admin/orders` and `/admin/leads` are server components that query Postgres and render buyer names, emails, phone numbers and order amounts **before any client JS runs**. Anyone sending `Cookie: dt_admin_session=anything` currently gets the full customer list.

**Fix.** Verify once in the `(dashboard)` route-group layout, which wraps every admin page except the login page (that lives in the `(auth)` group).

### File: `src/app/admin/(dashboard)/layout.tsx`

Add these two imports at the top, alongside the existing ones:

```ts
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
```

Change the component from sync to async and add the guard as its first statement. The JSX body is **unchanged** — only the signature and the two new lines before `return`:

```tsx
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Edge middleware can only check that the session cookie exists — it
  // can't verify the HMAC. This is the real lock: it runs on every page in
  // the (dashboard) group before any of them query the database.
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    // ... existing JSX, entirely unchanged ...
  );
}
```

Also add `export const dynamic = "force-dynamic";` at the top of this file (below the imports) so the layout is never statically evaluated.

### File: `src/middleware.ts`

The comment is now the only thing that's wrong. Replace this line:

```
// use Node's `crypto` module for the full HMAC check). Every admin page
// and API route re-verifies the signature server-side via getAdminSession()
// before doing anything real, so this is a fast redirect, not the real lock.
```

with:

```
// use Node's `crypto` module for the full HMAC check). The (dashboard)
// layout and every admin API route re-verify the signature server-side via
// getAdminSession() before doing anything real, so this is a fast redirect,
// not the real lock.
```

### Leave alone

Do **not** remove the existing `getAdminSession()` check in `src/app/admin/(dashboard)/diagnostics/page.tsx`. Defence in depth is intentional here.

**Commit:** `security: verify admin session in dashboard layout (P0)`

---

## Section 2 — [P0] Stop unauthenticated seat draining on paid workshops

**Problem.** `POST /api/leads` is public and ends with an unconditional seat decrement for any workshop:

```ts
if (item && item.category === "workshop") {
  await decrementWorkshopSeats(item.id);
}
```

The free-registration flow is only gated in the UI (`items/[slug]/page.tsx` computes `isFreeWorkshop` from `price === 0`). The API never re-checks price, and never checks `live`. Since `itemId` is rendered into the public page HTML as a prop to `RegisterModal`/`CheckoutModal`, anyone can POST a **paid** or **unpublished** workshop's id and drive `seatsLeft` to zero without paying.

### File: `src/app/api/leads/route.ts`

**Edit 1.** Immediately after this existing line:

```ts
const item = itemId ? await getItemById(itemId) : null;
```

insert:

```ts
// An itemId that doesn't resolve to a live item is either a stale page or
// someone poking the endpoint directly — either way, don't touch it.
if (itemId && (!item || !item.live)) {
  return NextResponse.json({ error: "This item is not available." }, { status: 404 });
}
```

**Edit 2.** Replace the decrement block near the end of the handler:

```ts
if (item && item.category === "workshop") {
  await decrementWorkshopSeats(item.id);
}
```

with:

```ts
// Only the free-registration flow decrements here. Paid workshops decrement
// in the Cashfree webhook, on confirmed payment — otherwise anyone could
// zero out a paid workshop's seats by POSTing to this public endpoint.
const isFreeWorkshop =
  item?.category === "workshop" && (item.details as WorkshopDetails).price === 0;

if (isFreeWorkshop) {
  await decrementWorkshopSeats(item!.id);
}
```

`WorkshopDetails` is already imported in this file — don't re-import it.

**Commit:** `security: gate lead-flow seat decrement to free, live workshops (P0)`

---

## Section 3 — [P1] Use the atomic seat decrement in the Cashfree webhook

**Problem.** `src/app/api/webhooks/cashfree/route.ts` does a read-modify-write against a stale snapshot:

```ts
const details = order.item.details as WorkshopDetails;
if (details.seatsLeft > 0) {
  await updateItem(order.itemId, { details: { ...details, seatsLeft: details.seatsLeft - 1 } });
}
```

Two bugs: (a) lost update — two concurrent webhooks both read `seatsLeft: 5` and both write `4`, so two sales produce one decrement; (b) it rewrites the **entire `details` JSONB blob**, so any admin edit to the agenda/price/registration fields made between the webhook's read and its write is silently clobbered.

`decrementWorkshopSeats()` in `src/lib/admin-repo.ts` already does this correctly as a single atomic `jsonb_set` UPDATE guarded by `WHERE (details->>'seatsLeft')::int > 0`. The webhook just never calls it. **Do not modify `decrementWorkshopSeats` — it is correct as written.**

### File: `src/app/api/webhooks/cashfree/route.ts`

**Edit 1.** Change the `admin-repo` import — swap `updateItem` for `decrementWorkshopSeats`:

```ts
import { claimMetaPurchaseEvent, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
```

**Edit 2.** Replace the whole workshop block with:

```ts
if (order.item.category === "workshop") {
  // Atomic conditional decrement — safe under Cashfree webhook retries and
  // concurrent purchases, and it won't clobber concurrent admin edits to
  // the rest of the details blob.
  await decrementWorkshopSeats(order.itemId);
}
```

**Edit 3.** The `import type { WorkshopDetails } from "@/lib/types";` line is now unused. Remove it. (Confirm with `npx tsc --noEmit` — nothing else in this file should reference it.)

Keep the `// TODO: generate the PDF receipt here …` comment. That work is still outstanding.

**Commit:** `fix: use atomic seat decrement in Cashfree webhook`

---

## Section 4 — [P1] Reject sold-out and non-purchasable items at checkout

**Problem.** `src/app/api/checkout/create-order/route.ts` validates the item exists, is `live`, and is a course/workshop — but never checks `seatsLeft`. A workshop at `seatsLeft: 0` still takes the customer's money, forcing a manual refund. Separately, `amount * 100` produces a float for any non-integer price (`19.99 * 100 === 1998.9999999999998`) and `orders.amount` is an `INTEGER` column.

### File: `src/app/api/checkout/create-order/route.ts`

**Edit 1.** After the existing item validation and after `const amount = details.price;`, insert:

```ts
if (!Number.isFinite(amount) || amount <= 0) {
  return NextResponse.json(
    { error: "This item isn't purchasable right now." },
    { status: 400 }
  );
}

if (item.category === "workshop") {
  const w = details as WorkshopDetails;
  if (!w.unlimitedSeats && (w.seatsLeft ?? 0) <= 0) {
    return NextResponse.json({ error: "This workshop is sold out." }, { status: 409 });
  }
}
```

Note this is a best-effort check, not a seat hold — two buyers can still pass it simultaneously for the last seat. That's the documented v1 position. It exists to stop sales on workshops that have been sold out for days.

**Edit 2.** Change the amount conversion in the `createOrder({ ... })` call:

```ts
amount: Math.round(amount * 100), // store in paise
```

**Edit 3.** Delete this now-inverted stale comment — the decrement already lives in the webhook, so this describes the opposite of the current design:

```ts
// TODO: move workshop seat decrement to the webhook handler once
// payment is confirmed, to avoid holding seats for abandoned checkouts.
```

**Commit:** `fix: reject sold-out and zero-price items at checkout; round paise`

---

## Section 5 — [P1] Rate-limit the public write endpoints and admin login

**Problem.** `POST /api/leads`, `POST /api/checkout/create-order` and `POST /api/admin/login` are all unauthenticated, all write to Postgres, and checkout additionally calls Cashfree's API on every hit. Nothing throttles any of them: lead spam, orphaned pending orders, Cashfree quota burn, and unlimited password guessing.

### New file: `src/lib/rate-limit.ts`

```ts
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
```

### File: `src/app/api/leads/route.ts`

Import it and add the check as the **first statement** in `POST`, before `req.json()`:

```ts
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
```

```ts
export async function POST(req: NextRequest) {
  if (!rateLimit(`leads:${clientIpFrom(req)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const { itemId, answers, fbc, fbp, eventSourceUrl } = await req.json();
  // ... rest unchanged
```

### File: `src/app/api/checkout/create-order/route.ts`

Same import. Add as the first statement inside the existing `try` block, before `req.json()`:

```ts
if (!rateLimit(`checkout:${clientIpFrom(req)}`, 5, 60_000)) {
  return NextResponse.json(
    { error: "Too many requests. Please wait a minute and try again." },
    { status: 429 }
  );
}
```

### File: `src/app/api/admin/login/route.ts`

Same import. Add as the first statement in `POST`, before `req.json()`:

```ts
if (!rateLimit(`login:${clientIpFrom(req)}`, 5, 15 * 60_000)) {
  return NextResponse.json(
    { error: "Too many attempts. Try again in a few minutes." },
    { status: 429 }
  );
}
```

**Commit:** `security: rate-limit public write endpoints and admin login`

---

## Section 6 — [P1] Make the admin session token expire

**Problem.** `src/lib/auth.ts` signs `base64url(email) + "." + HMAC(secret, email)`. The token is a pure function of the email address, so it never changes and never expires. The cookie's 14-day `maxAge` is a browser hint only — a token captured from the network stays valid forever. Changing `ADMIN_PASSWORD_HASH` does not invalidate existing sessions; only rotating `ADMIN_SESSION_SECRET` does.

**Fix.** Bake an issue timestamp into the signed payload and enforce it in `verify()`.

### File: `src/lib/auth.ts`

Replace the existing `sign` and `verify` functions (leave `secret()`, `verifyPassword`, `createSessionCookieValue`, `getAdminSession` and the exported constants exactly as they are):

```ts
// Signed token = base64url("email:issuedAtMs").hmac — no external session
// store needed for a single admin user. The timestamp is inside the signed
// payload (not just the cookie's maxAge) so a captured token actually
// stops working after SESSION_MAX_AGE instead of living forever.
function sign(email: string) {
  const payload = `${email}:${Date.now()}`;
  const hmac = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${hmac}`;
}

function verify(token: string): string | null {
  const [b64, hmac] = token.split(".");
  if (!b64 || !hmac) return null;

  const payload = Buffer.from(b64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");

  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  // Split on the LAST colon — email addresses can't contain one, but this
  // is robust regardless.
  const idx = payload.lastIndexOf(":");
  if (idx === -1) return null;

  const email = payload.slice(0, idx);
  const issuedAt = Number(payload.slice(idx + 1));
  if (!email || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return null;

  return email;
}
```

**Expected side effect:** this invalidates the currently-active admin session. After deploying, log in again at `/admin/login`. That's the intended behaviour, not a bug — mention it in the commit body.

**Commit:** `security: expire admin session tokens after 14 days`

---

## Section 7 — [P0] Correct the Privacy Policy to match what the code actually sends

**Problem.** `src/app/privacy/page.tsx` states *"We do not share your data with advertisers"* and lists only Cashfree, Vercel and Neon as recipients. But `src/lib/meta-capi.ts` sends to Meta, server-to-server: SHA-256 hashed email and phone, the `fbc`/`fbp` cookies, the **raw** client IP, the user agent, the source URL, and (for purchases) the order value. The Meta Pixel in `src/app/layout.tsx` also loads on every page view. `db/schema.sql` persists `client_ip` and `client_user_agent` on both `orders` and `leads`.

This is a live misrepresentation in a published legal document on a site that takes payments.

**Do not change any tracking code.** This section only corrects the disclosure.

### File: `src/app/privacy/page.tsx`

**Edit 1.** In section 1 (*What we collect*), add this as a new final `<li>` in the list:

```tsx
<li>
  <strong>Advertising &amp; analytics:</strong> we use the Meta Pixel, which sets
  cookies in your browser so we can measure whether an ad led to a purchase or a
  registration. You can opt out through your browser settings or your Meta ad
  preferences.
</li>
```

**Edit 2.** Replace the whole of section 3 (*Who we share data with*) with:

```tsx
<h2>3. Who we share data with</h2>
<p>
  We share the minimum data necessary with: <strong>Cashfree Payments</strong>{" "}
  (to process your payment); infrastructure providers (<strong>Vercel</strong>{" "}
  for hosting and <strong>Neon</strong> for database storage) who hold this
  Site&apos;s data on our behalf under their own security practices; and{" "}
  <strong>Meta Platforms</strong>, to measure how our advertising performs. What
  goes to Meta is limited to a one-way encrypted (hashed) form of your email
  address and phone number, your IP address, your browser type, and the page you
  were on. We never send Meta your name, your payment details, or the content of
  anything you write to us. We do not sell your personal data to anyone.
</p>
```

**Edit 3.** Bump the `updated` prop on the `<LegalPage>` element in this file to today's date, in the same `"4 August 2026"` format already used. A changed policy carrying a stale date is its own compliance problem.

**Leave `src/lib/legal.ts` and the other legal pages untouched.**

**Commit:** `legal: disclose Meta Pixel/CAPI data sharing in privacy policy (P0)`

---

## Section 8 — [P1] Stop promising receipts the code doesn't send

**Problem.** There is no mail dependency in `package.json` and no code path anywhere that sends email. The GST PDF receipt is still a `TODO` in the webhook. Meanwhile the UI promises both. A buyer currently pays and receives nothing but an on-screen message.

Until transactional email ships (tracked separately — do **not** attempt it in this brief), the copy must not overpromise.

### File: `src/components/CheckoutModal.tsx`

Replace the trust line under the pay button:

```tsx
🔒 Secured by Cashfree · GST invoice · instant receipt
```

with:

```tsx
🔒 Secured by Cashfree · GST-registered seller
```

### File: `src/app/order/confirmed/page.tsx`

In the `paid` branch, replace:

```tsx
{order.item.title} — receipt sent to {order.buyerEmail}. See you there.
```

with:

```tsx
{order.item.title} — we&apos;ll email your access details and GST invoice to{" "}
{order.buyerEmail} shortly. See you there.
```

**Commit:** `copy: don't promise automated receipts before email ships`

---

## Section 9 — [P1] Document the Meta env vars

**Problem.** `META_PIXEL_ID` and `META_CAPI_TOKEN` are read by `src/lib/meta-capi.ts` and `src/app/layout.tsx` but appear in neither `.env.example` nor the README. A fresh clone or a new Vercel environment silently ships with tracking disabled — `meta-capi.ts` just `console.warn`s and returns, so nothing visibly breaks and you'd find out weeks later from missing conversion data.

### File: `.env.example`

Append:

```bash
# --- Meta Pixel + Conversions API ---
# Optional. If either is unset, the Pixel isn't injected and server-side
# CAPI events are skipped with a console warning — nothing else breaks.
META_PIXEL_ID=""
META_CAPI_TOKEN=""
```

### File: `README.md`

In section 1 (*Local setup*), add a bullet to the list of values to fill in:

```md
- **META_PIXEL_ID** / **META_CAPI_TOKEN** — optional; from Meta Events
  Manager. Leave blank to run without any tracking.
```

**Commit:** `docs: document META_PIXEL_ID and META_CAPI_TOKEN`

---

## Section 10 — [P1] Guard the destructive seed script

**Problem.** `db/seed.ts` opens with four unconditional `DELETE FROM` statements against `leads`, `orders`, `items` and `settings`, targeting whatever `DATABASE_URL` is in `.env`/`.env.local`. One stale local env pointing at production destroys real order history.

### File: `db/seed.ts`

Insert this at the very start of `main()`, before the first `DELETE`:

```ts
const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "unknown";
  }
})();

if (!process.env.ALLOW_DESTRUCTIVE_SEED) {
  console.error(
    `\nRefusing to seed.\n` +
      `This DELETES every item, order, lead and setting in the target database.\n` +
      `Target host: ${host}\n\n` +
      `If that is really what you want:\n` +
      `  ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed\n`
  );
  process.exit(1);
}

console.warn(`\n⚠️  Destructive seed against ${host} — 3 seconds to Ctrl-C…\n`);
await new Promise((r) => setTimeout(r, 3000));
```

`main()` is already `async`, so the top-level `await` is fine here.

**Do not run the seed script to test this.** Verifying that it refuses is enough:

```bash
npm run db:seed
```

should print the refusal and exit non-zero.

**Commit:** `safety: require ALLOW_DESTRUCTIVE_SEED to run db:seed`

---

## Section 11 — [P2] Add security response headers

**Problem.** No security headers are set. Most relevant: the checkout modal is currently embeddable in an iframe on any domain, which is a clickjacking surface on a payment flow.

### File: `next.config.js`

Add a `headers()` function alongside the existing `redirects()`, inside `nextConfig`:

```js
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
```

**Do not add a Content-Security-Policy.** The Meta Pixel uses an inline script and Cashfree injects its own frames — a strict CSP needs dedicated testing time and would risk breaking checkout. Out of scope here.

Leave `images.remotePatterns` alone for now; tightening it is tracked separately.

**Commit:** `security: add HSTS, frame, referrer and content-type headers`

---

## Final verification

Run all of these and report the output. Do not push if any fail.

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Then start the dev server and confirm the two P0 fixes actually hold:

```bash
npm run dev
```

In a second terminal:

```bash
# Must print 307 (redirect to login), NOT 200
curl -s -o /dev/null -w "forged cookie  -> %{http_code}\n" \
  -H "Cookie: dt_admin_session=not-even-close" http://localhost:3000/admin/orders

curl -s -o /dev/null -w "no cookie      -> %{http_code}\n" \
  http://localhost:3000/admin/leads

# Must print 404 (unknown item rejected), NOT 201
curl -s -o /dev/null -w "bogus itemId   -> %{http_code}\n" \
  -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{"itemId":"00000000-0000-0000-0000-000000000000","answers":{"name":"t","email":"t@t.com","phone":"1"}}'

# Sixth call in a minute must print 429
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "login attempt $i -> %{http_code}\n" \
    -X POST http://localhost:3000/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@example.com","password":"wrong"}'
done
```

Also log in at `http://localhost:3000/admin/login` with the real credentials and click through Dashboard → Items → Leads → Orders → Settings → Diagnostics to confirm nothing regressed for the legitimate admin.

## Then stop

Push the branch and report back — do **not** merge to `main` yourself:

```bash
git push -u origin prelaunch-hardening
```

Summarise: which sections landed, anything that didn't match this brief and how you adapted, and the output of the verification commands.

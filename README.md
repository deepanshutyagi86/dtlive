# deepanshutyagi.live

The storefront/marketplace hub — courses, workshops, agency services, shop
links and ventures, all controlled from one admin panel. See
`deepanshutyagi-live-PRD.md` for the full spec this was built against.

## Stack

- **Next.js 14** (App Router, TypeScript, Tailwind)
- **Postgres via Neon** — through Vercel's Storage tab. (Note: "Vercel
  Postgres" itself was discontinued in 2025; it's now a native Neon
  integration in the Vercel Marketplace. Same Storage tab, same
  experience, different SDK under the hood — `@neondatabase/serverless`.)
- **Cashfree** — sandbox by default, swap to production via env vars
- Single-admin auth — no external auth service needed

## 1. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- **DATABASE_URL** — see step 2 below
- **ADMIN_EMAIL** / **ADMIN_PASSWORD_HASH** — generate the hash with:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('your-chosen-password', 10))"
  ```
- **ADMIN_SESSION_SECRET** — any long random string
- **CASHFREE_APP_ID** / **CASHFREE_SECRET_KEY** — from your Cashfree
  sandbox dashboard (cashfree.com → Developers → API Keys). Leave
  `CASHFREE_ENV="SANDBOX"` until you're ready to go live.

## 2. Database

1. In your Vercel project → **Storage** tab → **Create Database** →
   choose the **Neon** (Postgres) integration.
2. Vercel injects `DATABASE_URL` automatically for deployed environments.
   For local dev, copy it from the Storage tab into your `.env`.
3. Create the tables:
   ```bash
   npm run db:push
   ```
4. Load example content (courses/workshops/ventures you can edit or
   delete from the admin panel):
   ```bash
   npm run db:seed
   ```

## 3. Run it

```bash
npm run dev
```

- Site: http://localhost:3000
- Admin: http://localhost:3000/admin/login (use the email/password you hashed above)

## 4. Cashfree — going from sandbox to live

Nothing in the code needs to change. When you're ready:

1. Get production keys from your Cashfree dashboard
2. Update in Vercel's environment variables: `CASHFREE_APP_ID`,
   `CASHFREE_SECRET_KEY`, `CASHFREE_ENV=PRODUCTION`,
   `NEXT_PUBLIC_CASHFREE_ENV=PRODUCTION`, `CASHFREE_WEBHOOK_SECRET`
3. In the Cashfree dashboard, point your webhook URL to
   `https://deepanshutyagi.live/api/webhooks/cashfree`

## 5. Deploying + connecting the domain

1. Push this repo to GitHub, import it into Vercel
2. Add the Neon integration (step 2) and all env vars from `.env.example`
   in the Vercel project settings
3. In Vercel → your project → **Domains**, add `deepanshutyagi.live` and
   follow the DNS instructions to point it there from name.com

## 6. Day-to-day use

Everything after this is just the admin panel:

- **`/admin/items`** — add/edit any course, workshop, agency package,
  shop listing, or venture. Flip **Live** to show it on the public site,
  flip **Featured** to put it in the homepage Spotlight with a countdown.
- **`/admin/leads`** — anyone who submits an inquiry form lands here.
- **`/admin/orders`** — every paid/pending order, synced via the
  Cashfree webhook.
- **`/admin/settings`** — edit the ticker text, testimonials, and your
  WhatsApp/social links without touching code.

## Known v1 simplifications (documented, not hidden)

- **PDF receipts**: the webhook marks orders paid but doesn't yet
  generate the GST PDF receipt your old `/courses` flow had — there's a
  `TODO` at that exact spot in `src/app/api/webhooks/cashfree/route.ts`.
- **Seat holding**: workshop seats decrement on webhook confirmation, not
  at checkout start — an abandoned checkout won't hold a seat, but two
  people finishing payment in the same second could theoretically both
  get the last seat. Fine for the volume you're at; worth a proper lock
  if a workshop ever sells out in seconds.
- **Admin auth** is intentionally minimal (single user, signed cookie,
  no session store) — right for one admin, would need real sessions
  (e.g. NextAuth) if you ever add a second admin user.

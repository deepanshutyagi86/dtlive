-- Run this once against your Vercel Postgres database (via the Vercel
-- dashboard's Query tab, or `npm run db:migrate`).

CREATE TABLE IF NOT EXISTS items (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  thumbnail    TEXT,
  description  TEXT NOT NULL DEFAULT '',
  category     TEXT NOT NULL CHECK (category IN ('course','workshop','agency','shop','venture')),
  live         BOOLEAN NOT NULL DEFAULT false,
  featured     BOOLEAN NOT NULL DEFAULT false,
  "order"      INTEGER NOT NULL DEFAULT 0,
  details      JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS items_category_live_idx ON items(category, live);

CREATE TABLE IF NOT EXISTS orders (
  id                  TEXT PRIMARY KEY,
  item_id             TEXT NOT NULL REFERENCES items(id),
  buyer_name          TEXT NOT NULL,
  buyer_email         TEXT NOT NULL,
  buyer_phone         TEXT NOT NULL,
  amount              INTEGER NOT NULL,
  cashfree_order_id   TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  receipt_url         TEXT,
  -- Captured client-side at checkout so the server-to-server Cashfree
  -- webhook (which never sees the buyer's browser) can still send a
  -- fully-matched Meta Conversions API Purchase event.
  fbc                 TEXT,
  fbp                 TEXT,
  client_ip           TEXT,
  client_user_agent   TEXT,
  event_source_url    TEXT,
  -- Set the moment the webhook successfully claims this order for a Meta
  -- CAPI Purchase send. The webhook is the only writer of this column —
  -- it's what lets it fire the event exactly once even if Cashfree retries
  -- the webhook or the /order/confirmed fallback flips `status` first.
  meta_purchase_sent_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent for databases created before the Meta CAPI columns existed.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_user_agent TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS event_source_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS meta_purchase_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  contact     TEXT NOT NULL,
  message     TEXT,
  item_id     TEXT REFERENCES items(id),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent for databases created before free-registration (Lead) support
-- existed. `contact` is kept as-is for backward compat; new registrations
-- populate email/phone directly instead. Mirrors the Meta CAPI columns
-- already on `orders`.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fbp TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_ip TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_user_agent TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_source_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta_lead_sent_at TIMESTAMPTZ;

-- Holds any registrationFields answers beyond name/email/phone, as
-- {fieldKey: value}. email/phone columns above stay populated from
-- whichever registrationFields have type "email"/"tel", for CAPI matching.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS answers JSONB;

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);

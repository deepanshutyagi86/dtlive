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
  id                 TEXT PRIMARY KEY,
  item_id            TEXT NOT NULL REFERENCES items(id),
  buyer_name         TEXT NOT NULL,
  buyer_email        TEXT NOT NULL,
  buyer_phone        TEXT NOT NULL,
  amount             INTEGER NOT NULL,
  cashfree_order_id  TEXT UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  receipt_url        TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  contact     TEXT NOT NULL,
  message     TEXT,
  item_id     TEXT REFERENCES items(id),
  status      TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);

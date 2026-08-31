# Migrations

Every schema change lives here, newest last, with the exact SQL to paste
into the Neon SQL editor. There is no migration runner: `db/migrate.ts`
pushes the whole schema and is not safe against production data.

**Rules for anything added to this file**
- Additive only. A new nullable column or a new table. Never a `DROP`, never
  a `NOT NULL` on an existing table, never a rename.
- The application must work *before* the migration is run, not only after.
  Ship the code first, run the SQL when you're ready.

---

## 001 — `orders.tax_details` (GST snapshot + buyer GSTIN)

**Run this when you want to turn on business (B2B) invoices, or as soon as
you switch GST on.** Until you run it, the site works exactly as it does
now — the B2B switch in Settings stays greyed out and explains why.

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_details JSONB;
```

That's the whole migration. It is additive, nullable, takes effect
instantly, and cannot affect a single existing row.

**What it stores.** For each new order, a frozen record of the tax that was
actually charged:

```json
{
  "ratePercent": 18,
  "mode": "exclusive",
  "listPrice": 6999,
  "discount": 0,
  "taxableValue": 6999,
  "taxTotal": 1259.82,
  "cgst": 629.91,
  "sgst": 629.91,
  "igst": 0,
  "buyerGstin": "27ABCDE1234F1Z5",
  "buyerLegalName": "Acme Pvt Ltd",
  "buyerStateCode": "27",
  "buyerStateName": "Maharashtra"
}
```

**Why it has to be stored rather than recomputed.** A tax invoice is a legal
record of a past transaction. If the invoice recalculated from whatever the
settings say today, raising your GST rate from 18% to 20% would silently
rewrite every invoice you had ever issued — including ones already filed.
The snapshot makes each invoice permanent.

**How the code behaves before and after:**

| | Before the migration | After |
|---|---|---|
| Checkout | Works. GST is still charged correctly. | Works, and the split is saved. |
| Invoices | Computed from the amount paid and today's rate. | Read from the frozen snapshot. |
| B2B GSTIN | Switch is disabled, with an explanation. | Switch works. |

The check is cached per serverless instance, so the switch turns itself on
within a few minutes of you running the SQL. **No deploy needed.**

**To confirm it worked:**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'tax_details';
```

One row back means you're done.

---

## 002 — `leads.source` and `orders.source` (where a registration came from)

**Run this when you want the /live webinar page to report per-session
numbers.** Until you run it, /live works completely — people register, people
pay, everything is saved — but every registration looks the same as one from
an ordinary product page, and the Registrations tab in /admin/live says so
rather than showing an empty table and letting you think nobody signed up.

```sql
ALTER TABLE leads  ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT;
```

Additive, nullable, instant, and it cannot affect a single existing row.

**What it stores.** A short tag naming the surface a person came through.
Today the only writer is the webinar page, which writes `live:<session-slug>`
— e.g. `live:aug-31-ai-webinar`. Existing rows stay NULL, which reads as
"came in the ordinary way", and that is the correct answer for all of them.

**Why a column and not the `answers` JSON blob.** `orders` has no equivalent
blob, so leads and orders would have had to record the same fact two
different ways, and the one query that matters — *everyone who registered
OR bought from this webinar* — would have had to be written twice and kept
in agreement forever.

**How the code behaves before and after:**

| | Before the migration | After |
|---|---|---|
| /live page | Works. | Works. |
| Registering from /live | Saved. Source dropped. | Saved with the session tag. |
| Buying from /live | Saved, charged correctly. | Saved with the session tag. |
| Admin → Live → Registrations | Explains the migration hasn't run. | Lists that session's people. |

The check is cached per serverless instance, so the tab starts working within
a few minutes of you running the SQL. **No deploy needed.**

**To confirm it worked:**

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'source' AND table_name IN ('leads', 'orders');
```

Two rows back means you're done.

import { sql, newId, toItem, toOrder, toLead, Item, Order, Lead, ItemRow, OrderRow, LeadRow } from "./db";
import { readTaxSnapshot, type OrderTaxSnapshot } from "./order-tax";

// Thrown by deleteItem() when the item is still referenced by orders/leads.
// The API route maps this to a 409 with the message shown directly to the
// admin, instead of the raw FK-violation error Postgres would otherwise throw.
export class DeleteBlockedError extends Error {}

// ---------- Items ----------

export async function listAllItems(): Promise<Item[]> {
  const { rows } = await sql<ItemRow>`SELECT * FROM items ORDER BY category ASC, "order" ASC`;
  return rows.map(toItem);
}

export interface ItemInput {
  title: string;
  slug: string;
  thumbnail?: string | null;
  description: string;
  category: Item["category"];
  live: boolean;
  featured: boolean;
  order: number;
  details: Record<string, unknown>;
}

export async function createItem(input: ItemInput): Promise<Item> {
  const id = newId();
  const { rows } = await sql<ItemRow>`
    INSERT INTO items (id, title, slug, thumbnail, description, category, live, featured, "order", details)
    VALUES (${id}, ${input.title}, ${input.slug}, ${input.thumbnail ?? null}, ${input.description},
            ${input.category}, ${input.live}, ${input.featured}, ${input.order}, ${JSON.stringify(input.details)})
    RETURNING *
  `;
  return toItem(rows[0]);
}

export async function updateItem(id: string, input: Partial<ItemInput>): Promise<Item | null> {
  const existing = await sql<ItemRow>`SELECT * FROM items WHERE id = ${id}`;
  if (existing.rows.length === 0) return null;
  const current = existing.rows[0];

  const merged: ItemRow = {
    ...current,
    title: input.title ?? current.title,
    slug: input.slug ?? current.slug,
    thumbnail: input.thumbnail !== undefined ? input.thumbnail : current.thumbnail,
    description: input.description ?? current.description,
    category: input.category ?? current.category,
    live: input.live !== undefined ? input.live : current.live,
    featured: input.featured !== undefined ? input.featured : current.featured,
    order: input.order !== undefined ? input.order : current.order,
    details: input.details !== undefined ? (input.details as Record<string, unknown>) : current.details,
  };

  const { rows } = await sql<ItemRow>`
    UPDATE items SET
      title = ${merged.title},
      slug = ${merged.slug},
      thumbnail = ${merged.thumbnail},
      description = ${merged.description},
      category = ${merged.category},
      live = ${merged.live},
      featured = ${merged.featured},
      "order" = ${merged.order},
      details = ${JSON.stringify(merged.details)},
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;
  return toItem(rows[0]);
}

// Orders/leads reference items via a plain FK (no ON DELETE CASCADE, on
// purpose) so a delete can never silently wipe real customer/registrant
// records. Instead, check for references up front and block with a message
// that tells the admin what to do (unpublish) rather than surfacing a raw
// FK-violation error.
export async function deleteItem(id: string): Promise<void> {
  const [{ rows: orderRows }, { rows: leadRows }] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM orders WHERE item_id = ${id}`,
    sql`SELECT COUNT(*)::int as count FROM leads WHERE item_id = ${id}`,
  ]);
  const orderCount = orderRows[0].count as number;
  const leadCount = leadRows[0].count as number;

  if (orderCount > 0) {
    throw new DeleteBlockedError(
      `Can't delete — ${orderCount} order${orderCount === 1 ? " is" : "s are"} linked to this item. Unpublish it (Live toggle off) instead to keep order history intact.`
    );
  }
  if (leadCount > 0) {
    throw new DeleteBlockedError(
      `Can't delete — ${leadCount} lead${leadCount === 1 ? " is" : "s are"} linked to this item. Unpublish it (Live toggle off) instead to keep lead history intact.`
    );
  }

  await sql`DELETE FROM items WHERE id = ${id}`;
}

export async function isSlugTaken(slug: string, excludingId?: string): Promise<boolean> {
  const { rows } = excludingId
    ? await sql`SELECT 1 FROM items WHERE slug = ${slug} AND id != ${excludingId}`
    : await sql`SELECT 1 FROM items WHERE slug = ${slug}`;
  return rows.length > 0;
}

// ---------- Orders ----------

export async function createOrder(input: {
  itemId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  amount: number;
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
  /**
   * The frozen tax split for this order. Only persisted once the
   * `tax_details` column exists (see docs/MIGRATIONS.md) — until then it is
   * dropped, and the invoice falls back to computing from the amount paid.
   * The order itself is created either way: a missing column must never
   * block a sale.
   */
  taxDetails?: OrderTaxSnapshot | null;
}): Promise<Order> {
  const id = newId();

  if (input.taxDetails && (await hasTaxDetailsColumn())) {
    const { rows } = await sql<OrderRow>`
      INSERT INTO orders (
        id, item_id, buyer_name, buyer_email, buyer_phone, amount, status,
        fbc, fbp, client_ip, client_user_agent, event_source_url, tax_details
      )
      VALUES (
        ${id}, ${input.itemId}, ${input.buyerName}, ${input.buyerEmail}, ${input.buyerPhone}, ${input.amount}, 'pending',
        ${input.fbc ?? null}, ${input.fbp ?? null}, ${input.clientIp ?? null}, ${input.clientUserAgent ?? null}, ${input.eventSourceUrl ?? null},
        ${JSON.stringify(input.taxDetails)}
      )
      RETURNING *
    `;
    return toOrder(rows[0]);
  }

  const { rows } = await sql<OrderRow>`
    INSERT INTO orders (
      id, item_id, buyer_name, buyer_email, buyer_phone, amount, status,
      fbc, fbp, client_ip, client_user_agent, event_source_url
    )
    VALUES (
      ${id}, ${input.itemId}, ${input.buyerName}, ${input.buyerEmail}, ${input.buyerPhone}, ${input.amount}, 'pending',
      ${input.fbc ?? null}, ${input.fbp ?? null}, ${input.clientIp ?? null}, ${input.clientUserAgent ?? null}, ${input.eventSourceUrl ?? null}
    )
    RETURNING *
  `;
  return toOrder(rows[0]);
}

// Cached per serverless instance. The answer only changes when someone runs
// a migration, so re-asking on every checkout would be a wasted round trip
// on the hot path — but caching a `false` forever would mean the column
// stays unused until the next cold start, which is the right trade: no
// deploy is needed, the feature just switches itself on within minutes of
// the ALTER.
let taxDetailsColumnExists: boolean | null = null;

export async function hasTaxDetailsColumn(): Promise<boolean> {
  if (taxDetailsColumnExists !== null) return taxDetailsColumnExists;
  try {
    const { rows } = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'tax_details'
      LIMIT 1
    `;
    taxDetailsColumnExists = rows.length > 0;
  } catch (err) {
    // Never let a schema probe break a checkout. Assuming "no" costs a
    // snapshot; assuming "yes" would make the INSERT fail and lose the sale.
    console.error("Could not check for orders.tax_details, assuming absent:", err);
    taxDetailsColumnExists = false;
  }
  return taxDetailsColumnExists;
}

// Same cached-probe pattern as hasTaxDetailsColumn above, for the
// `source` column that migration 002 adds to BOTH orders and leads.
// Probed on leads and assumed to speak for both, because the migration
// adds them together in one statement pair — checking each separately
// would double the round trips to learn the same fact.
let sourceColumnExists: boolean | null = null;

export async function hasSourceColumn(): Promise<boolean> {
  if (sourceColumnExists !== null) return sourceColumnExists;
  try {
    const { rows } = await sql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'leads' AND column_name = 'source'
      LIMIT 1
    `;
    sourceColumnExists = rows.length > 0;
  } catch (err) {
    console.error("Could not check for leads.source, assuming absent:", err);
    sourceColumnExists = false;
  }
  return sourceColumnExists;
}

/**
 * Records WHERE a lead or an order came from — `live:<slug>` for the
 * webinar page. This is what makes the Registrations tab in /admin/live
 * possible: without it every registration looks the same and a webinar
 * cannot be told apart from an ordinary Tuesday.
 *
 * Written as a follow-up UPDATE rather than as a column on the INSERT,
 * deliberately. The INSERTs above already fork on whether tax_details
 * exists; forking each of them again on `source` would give four nearly
 * identical INSERT statements per table, which is exactly how a column
 * ends up missing from one branch and nobody notices for a month.
 *
 * Attribution is not the money path. If this fails, the sale and the
 * registration have already happened and are already saved — the loss is
 * one row's worth of reporting, so it is logged and swallowed rather than
 * thrown, which would take a successful payment down with it.
 */
export async function tagSource(
  table: "leads" | "orders",
  id: string,
  source: string | null | undefined
): Promise<void> {
  if (!source) return;
  if (!(await hasSourceColumn())) return;
  try {
    if (table === "leads") {
      await sql`UPDATE leads SET source = ${source} WHERE id = ${id}`;
    } else {
      await sql`UPDATE orders SET source = ${source} WHERE id = ${id}`;
    }
  } catch (err) {
    console.error(`Could not tag ${table}.${id} with source "${source}":`, err);
  }
}

export async function setOrderCashfreeId(orderId: string, cashfreeOrderId: string): Promise<void> {
  await sql`UPDATE orders SET cashfree_order_id = ${cashfreeOrderId} WHERE id = ${orderId}`;
}

// Atomically claims the right to send this order's Meta CAPI Purchase
// event. Only the caller that flips meta_purchase_sent_at from NULL should
// send — this keeps the webhook the sole (and exactly-once) trigger even
// under Cashfree webhook retries or a concurrent /order/confirmed fallback.
export async function claimMetaPurchaseEvent(orderId: string): Promise<boolean> {
  const { rows } = await sql`
    UPDATE orders SET meta_purchase_sent_at = now()
    WHERE id = ${orderId} AND meta_purchase_sent_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

// item.slug is selected too: the confirmation page and the buyer email
// both link to /items/<slug>/calendar, and without it they had no way to
// build that URL from an order.
export async function getOrderById(
  id: string
): Promise<
  | (Order & {
      item: { title: string; slug: string; category: string; details: any };
      taxDetails: OrderTaxSnapshot | null;
    })
  | null
> {
  const { rows } = await sql`
    SELECT o.*, i.title as item_title, i.slug as item_slug, i.category as item_category, i.details as item_details
    FROM orders o JOIN items i ON i.id = o.item_id
    WHERE o.id = ${id}
  `;
  if (rows.length === 0) return null;
  const r: any = rows[0];
  return {
    ...toOrder(r),
    item: { title: r.item_title, slug: r.item_slug, category: r.item_category, details: r.item_details },
    // `SELECT o.*` returns the column when it exists and simply omits it
    // when the migration has not been run — readTaxSnapshot turns both the
    // missing case and a malformed one into null.
    taxDetails: readTaxSnapshot(r.tax_details),
  };
}

export async function setOrderStatus(id: string, status: Order["status"]): Promise<void> {
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

/**
 * The atomic replacement for the `order.status !== "paid"` read-then-branch
 * that all three paid paths used to share (audit P1-01). Postgres decides
 * the winner inside a single statement, so exactly one of
 * verify-payment / the Razorpay webhook / the /order/confirmed fallback
 * gets `true` for a given order no matter how they interleave.
 *
 * Everything that must happen once per paid order — the seat decrement,
 * the buyer and admin emails — belongs INSIDE the `if` this returns.
 *
 * `status <> 'paid'` rather than `status = 'pending'` on purpose: a
 * payment that first reported failed and then captured on retry must still
 * be claimable. A row already at 'paid' can never be re-claimed, which is
 * the whole point.
 */
export async function claimOrderPaid(id: string): Promise<boolean> {
  const { rows } = await sql`
    UPDATE orders SET status = 'paid'
    WHERE id = ${id} AND status <> 'paid'
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listOrders(limit = 100): Promise<(Order & { itemTitle: string; itemDetails: any })[]> {
  const { rows } = await sql`
    SELECT o.*, i.title as item_title, i.details as item_details
    FROM orders o JOIN items i ON i.id = o.item_id
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({ ...toOrder(r), itemTitle: r.item_title, itemDetails: r.item_details }));
}

export async function orderStats(monthStart: Date) {
  const { rows } = await sql`
    SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::int as total
    FROM orders WHERE status = 'paid' AND created_at >= ${monthStart.toISOString()}
  `;
  return { count: rows[0].count as number, totalPaise: rows[0].total as number };
}

// ---------- Leads ----------

export async function createLead(input: {
  name: string;
  contact: string;
  message?: string | null;
  itemId?: string | null;
  email?: string | null;
  phone?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string | null;
  answers?: Record<string, string> | null;
}): Promise<Lead> {
  const id = newId();
  const { rows } = await sql<LeadRow>`
    INSERT INTO leads (
      id, name, contact, message, item_id, status,
      email, phone, fbc, fbp, client_ip, client_user_agent, event_source_url, answers
    )
    VALUES (
      ${id}, ${input.name}, ${input.contact}, ${input.message ?? null}, ${input.itemId ?? null}, 'new',
      ${input.email ?? null}, ${input.phone ?? null}, ${input.fbc ?? null}, ${input.fbp ?? null},
      ${input.clientIp ?? null}, ${input.clientUserAgent ?? null}, ${input.eventSourceUrl ?? null},
      ${input.answers ? JSON.stringify(input.answers) : null}
    )
    RETURNING *
  `;
  return toLead(rows[0]);
}

// Atomic conditional decrement of a workshop's seatsLeft (stored inside the
// items.details JSONB blob, not a dedicated column). The WHERE guard means
// concurrent registrations can never drive it below 0, and it's a no-op
// (returns false) for non-workshops or once seats are exhausted.
export async function decrementWorkshopSeats(itemId: string): Promise<boolean> {
  const { rows } = await sql`
    UPDATE items
    SET details = jsonb_set(details, '{seatsLeft}', to_jsonb(((details->>'seatsLeft')::int - 1)))
    WHERE id = ${itemId}
      AND category = 'workshop'
      AND COALESCE((details->>'unlimitedSeats')::boolean, false) = false
      AND (details->>'seatsLeft')::int > 0
    RETURNING id
  `;
  return rows.length > 0;
}

// Same exactly-once pattern as claimMetaPurchaseEvent: guards against a
// double-send if this route ever gets retried (e.g. a client-side network
// retry re-hitting the same lead).
export async function claimMetaLeadEvent(leadId: string): Promise<boolean> {
  const { rows } = await sql`
    UPDATE leads SET meta_lead_sent_at = now()
    WHERE id = ${leadId} AND meta_lead_sent_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}

export async function listLeads(): Promise<(Lead & { itemTitle: string | null })[]> {
  const { rows } = await sql`
    SELECT l.*, i.title as item_title
    FROM leads l LEFT JOIN items i ON i.id = l.item_id
    ORDER BY l.created_at DESC
  `;
  return rows.map((r: any) => ({ ...toLead(r), itemTitle: r.item_title }));
}

export async function setLeadStatus(id: string, status: Lead["status"]): Promise<void> {
  await sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
}

export async function countRecentLeads(since: Date): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*)::int as count FROM leads WHERE created_at >= ${since.toISOString()}`;
  return rows[0].count as number;
}

export async function itemCounts(): Promise<{ live: number; total: number }> {
  const { rows } = await sql`SELECT COUNT(*)::int as total, COUNT(*) FILTER (WHERE live)::int as live FROM items`;
  return { live: rows[0].live as number, total: rows[0].total as number };
}

// ---------- Settings ----------

export async function getAllSettings(keys: string[]): Promise<Record<string, unknown>> {
  const { rows } = await sql`SELECT key, value FROM settings WHERE key = ANY(${keys})`;
  const result: Record<string, unknown> = {};
  for (const r of rows as any[]) result[r.key] = r.value;
  return result;
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  await sql`
    INSERT INTO settings (key, value) VALUES (${key}, ${JSON.stringify(value)})
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}
  `;
}

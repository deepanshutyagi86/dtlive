import { sql, newId, toItem, toOrder, toLead, Item, Order, Lead, ItemRow, OrderRow, LeadRow } from "./db";

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

export async function deleteItem(id: string): Promise<void> {
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
}): Promise<Order> {
  const id = newId();
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

export async function getOrderById(id: string): Promise<(Order & { item: { title: string; category: string; details: any } }) | null> {
  const { rows } = await sql`
    SELECT o.*, i.title as item_title, i.category as item_category, i.details as item_details
    FROM orders o JOIN items i ON i.id = o.item_id
    WHERE o.id = ${id}
  `;
  if (rows.length === 0) return null;
  const r: any = rows[0];
  return {
    ...toOrder(r),
    item: { title: r.item_title, category: r.item_category, details: r.item_details },
  };
}

export async function setOrderStatus(id: string, status: Order["status"]): Promise<void> {
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

export async function listOrders(limit = 100): Promise<(Order & { itemTitle: string })[]> {
  const { rows } = await sql`
    SELECT o.*, i.title as item_title
    FROM orders o JOIN items i ON i.id = o.item_id
    ORDER BY o.created_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r: any) => ({ ...toOrder(r), itemTitle: r.item_title }));
}

export async function orderStats(monthStart: Date) {
  const { rows } = await sql`
    SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::int as total
    FROM orders WHERE status = 'paid' AND created_at >= ${monthStart.toISOString()}
  `;
  return { count: rows[0].count as number, totalPaise: rows[0].total as number };
}

// ---------- Leads ----------

export async function createLead(input: { name: string; contact: string; message?: string | null; itemId?: string | null }): Promise<Lead> {
  const id = newId();
  const { rows } = await sql<LeadRow>`
    INSERT INTO leads (id, name, contact, message, item_id, status)
    VALUES (${id}, ${input.name}, ${input.contact}, ${input.message ?? null}, ${input.itemId ?? null}, 'new')
    RETURNING *
  `;
  return toLead(rows[0]);
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

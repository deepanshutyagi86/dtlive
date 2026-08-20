import { sql, toItem, Item, ItemRow } from "./db";

export async function getLiveStreamItems(): Promise<Item[]> {
  const { rows } = await sql<ItemRow>`
    SELECT * FROM items WHERE live = true ORDER BY "order" ASC
  `;
  return rows.map(toItem);
}

export async function getFeaturedItem(): Promise<Item | null> {
  const { rows } = await sql<ItemRow>`
    SELECT * FROM items WHERE live = true AND featured = true ORDER BY "order" ASC LIMIT 1
  `;
  return rows[0] ? toItem(rows[0]) : null;
}

export async function getItemsByCategory(category: Item["category"]): Promise<Item[]> {
  const { rows } = await sql<ItemRow>`
    SELECT * FROM items WHERE category = ${category} AND live = true ORDER BY "order" ASC
  `;
  return rows.map(toItem);
}

// Case-insensitive on purpose. Postgres string comparison is
// case-sensitive, so an item saved as "Claude-01" 404'd at the
// conventionally-lowercase /items/claude-01 that anyone would type or that
// a link shortener would produce (audit P2-07). New saves are normalised
// server-side, but that alone would BREAK every link already shared under
// the old casing - this makes both resolve, so the data can be fixed
// without stranding anyone.
export async function getItemBySlug(slug: string): Promise<Item | null> {
  const { rows } = await sql<ItemRow>`SELECT * FROM items WHERE lower(slug) = lower(${slug}) LIMIT 1`;
  return rows[0] ? toItem(rows[0]) : null;
}

export async function getItemById(id: string): Promise<Item | null> {
  const { rows } = await sql<ItemRow>`SELECT * FROM items WHERE id = ${id} LIMIT 1`;
  return rows[0] ? toItem(rows[0]) : null;
}

export async function getDoorCounts(): Promise<Record<string, number>> {
  const { rows } = await sql<{ category: string; count: string }>`
    SELECT category, COUNT(*) as count FROM items WHERE live = true GROUP BY category
  `;
  const counts: Record<string, number> = {};
  for (const r of rows) counts[r.category] = Number(r.count);
  return counts;
}

export async function getSetting<T = unknown>(key: string, fallback: T): Promise<T> {
  const { rows } = await sql<{ value: T }>`SELECT value FROM settings WHERE key = ${key} LIMIT 1`;
  return rows[0] ? rows[0].value : fallback;
}

// Where admin notification emails (new order, new lead) get sent. A
// dedicated notifyEmail setting takes priority; falls back to the same
// footerLinks.email already shown publicly if notifyEmail is unset/blank.
// Returns null if neither is configured — callers must treat that as
// "nothing to send to", not an error.
export async function getNotifyEmail(): Promise<string | null> {
  const [notifyEmail, footerLinks] = await Promise.all([
    getSetting<string>("notifyEmail", ""),
    getSetting<{ email?: string }>("footerLinks", {}),
  ]);
  return notifyEmail.trim() || footerLinks.email || null;
}

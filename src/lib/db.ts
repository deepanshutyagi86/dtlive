import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";

// fullResults:true makes this return {rows, rowCount, ...} just like the
// old @vercel/postgres `sql` did, so every call site below reads `.rows`
// exactly as before.
export const sql = neon(process.env.DATABASE_URL!, { fullResults: true }) as any;
export const newId = () => randomUUID();

// --- row shapes returned straight from Postgres (snake_case) ---
export interface ItemRow {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  description: string;
  category: "course" | "workshop" | "agency" | "shop" | "venture";
  live: boolean;
  featured: boolean;
  order: number;
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  item_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  amount: number;
  cashfree_order_id: string | null;
  status: "pending" | "paid" | "failed";
  receipt_url: string | null;
  created_at: string;
}

export interface LeadRow {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  item_id: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
}

// --- camelCase shapes used throughout the app ---
export interface Item {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
  description: string;
  category: ItemRow["category"];
  live: boolean;
  featured: boolean;
  order: number;
  details: any;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  itemId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  amount: number;
  cashfreeOrderId: string | null;
  status: OrderRow["status"];
  receiptUrl: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  contact: string;
  message: string | null;
  itemId: string | null;
  status: LeadRow["status"];
  createdAt: string;
}

export function toItem(r: ItemRow): Item {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    thumbnail: r.thumbnail,
    description: r.description,
    category: r.category,
    live: r.live,
    featured: r.featured,
    order: r.order,
    details: r.details,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    itemId: r.item_id,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerPhone: r.buyer_phone,
    amount: r.amount,
    cashfreeOrderId: r.cashfree_order_id,
    status: r.status,
    receiptUrl: r.receipt_url,
    createdAt: r.created_at,
  };
}

export function toLead(r: LeadRow): Lead {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact,
    message: r.message,
    itemId: r.item_id,
    status: r.status,
    createdAt: r.created_at,
  };
}

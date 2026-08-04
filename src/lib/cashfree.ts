// Minimal Cashfree Orders API (v2023-08-01) wrapper — no SDK dependency,
// just fetch, so it's easy to read and easy to swap sandbox -> production.

const BASE_URL =
  process.env.CASHFREE_ENV === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

function headers() {
  const appId = process.env.CASHFREE_APP_ID;
  const secret = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secret) {
    throw new Error("CASHFREE_APP_ID / CASHFREE_SECRET_KEY not set");
  }
  return {
    "Content-Type": "application/json",
    "x-api-version": "2023-08-01",
    "x-client-id": appId,
    "x-client-secret": secret,
  };
}

export interface CreateOrderInput {
  orderId: string; // our own internal id, e.g. the Order.id from Prisma
  amountRupees: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
}

export async function createCashfreeOrder(
  input: CreateOrderInput
): Promise<CashfreeOrderResponse> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amountRupees,
      order_currency: "INR",
      customer_details: {
        customer_id: input.buyerEmail.replace(/[^a-zA-Z0-9]/g, "_"),
        customer_name: input.buyerName,
        customer_email: input.buyerEmail,
        customer_phone: input.buyerPhone,
      },
      order_meta: {
        return_url: `${siteUrl}/order/confirmed?order_id=${input.orderId}`,
        notify_url: `${siteUrl}/api/webhooks/cashfree`,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cashfree create-order failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchCashfreeOrder(orderId: string) {
  const res = await fetch(`${BASE_URL}/orders/${orderId}`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cashfree fetch-order failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Cashfree signs webhook payloads with the webhook secret from your
// dashboard. Verify this before trusting a webhook body.
// Docs: https://www.cashfree.com/docs/payments/online/webhooks
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const secret = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!secret) throw new Error("CASHFREE_WEBHOOK_SECRET not set");
  const payload = timestamp + rawBody;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64");

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false — an invalid-length signature is unambiguously invalid, so it's
  // safe to short-circuit before the constant-time comparison.
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

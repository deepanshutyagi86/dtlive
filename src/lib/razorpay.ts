// Minimal Razorpay Orders API wrapper — no SDK dependency, just fetch, so
// it's easy to read and matches the shape of the old src/lib/cashfree.ts.
import crypto from "crypto";

const BASE_URL = "https://api.razorpay.com/v1";

function headers() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
  };
}

export interface CreateOrderInput {
  orderId: string; // our own internal order id — travels to Razorpay as `receipt`
  amountPaise: number;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

export async function createRazorpayOrder(
  input: CreateOrderInput
): Promise<RazorpayOrderResponse> {
  const res = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.orderId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay create-order failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function fetchRazorpayOrderPayments(razorpayOrderId: string) {
  const res = await fetch(`${BASE_URL}/orders/${razorpayOrderId}/payments`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay fetch-order-payments failed: ${res.status} ${body}`);
  }
  return res.json();
}

// Verifies the signature the browser's Razorpay `handler` callback hands
// back after a successful payment. Keyed with the KEY SECRET — this is a
// different secret and a different payload shape to the webhook signature
// below; do not merge the two.
export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET not set");
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  // timingSafeEqual throws on mismatched lengths rather than returning
  // false — an invalid-length signature is unambiguously invalid, so it's
  // safe to short-circuit before the constant-time comparison.
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

// Razorpay signs webhook payloads with the webhook secret configured in
// the dashboard. Verify this before trusting a webhook body.
// Docs: https://razorpay.com/docs/webhooks/validate-test/
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not set");
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

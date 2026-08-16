import { NextRequest, NextResponse } from "next/server";
import { claimMetaPurchaseEvent, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";

  try {
    const valid = verifyCashfreeWebhookSignature(rawBody, timestamp, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    console.error("Webhook signature check failed:", err);
    return NextResponse.json({ error: "Signature verification unavailable" }, { status: 500 });
  }

  const payload = JSON.parse(rawBody);
  const orderId: string | undefined = payload?.data?.order?.order_id;
  const orderStatus: string | undefined =
    payload?.data?.order?.order_status ?? payload?.data?.payment?.payment_status;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order_id in payload" }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  }

  const isPaid = orderStatus === "PAID" || orderStatus === "SUCCESS";

  if (isPaid) {
    if (order.status !== "paid") {
      await setOrderStatus(order.id, "paid");

      if (order.item.category === "workshop") {
        // Atomic conditional decrement — safe under Cashfree webhook retries and
        // concurrent purchases, and it won't clobber concurrent admin edits to
        // the rest of the details blob.
        await decrementWorkshopSeats(order.itemId);
      }

      // TODO: generate the PDF receipt here (GST included, matching the
      // existing /courses flow) and store its URL on the order, then
      // optionally email/WhatsApp it to the buyer.

      // Idempotency note: this whole block is guarded only by the
      // `order.status !== "paid"` check above — the same non-atomic guard
      // decrementWorkshopSeats already sat behind (audit P1-01: a status
      // read-then-write, not a claimed-column pattern like
      // meta_purchase_sent_at). A concurrent webhook retry — or the
      // /order/confirmed fallback page hitting the same order at nearly
      // the same time, see sendPaidOrderNotifications — landing in the
      // narrow window before setOrderStatus's write is visible could in
      // theory re-enter this block and send a duplicate email. Adding a
      // notification_sent_at column (same pattern as meta_purchase_sent_at)
      // would close that gap, but that's a migration against production and
      // is explicitly out of scope here — do it when P1-01 is fixed.
      await sendPaidOrderNotifications(order);
    }

    // Claimed independently of the status flip above: the /order/confirmed
    // fallback may have already marked this order "paid" while polling
    // Cashfree directly, but it never sends the Purchase event itself —
    // this webhook is the only place that does, exactly once.
    if (await claimMetaPurchaseEvent(order.id)) {
      await sendMetaPurchaseEvent(order);
    }
  } else if (orderStatus === "FAILED" || orderStatus === "CANCELLED") {
    await setOrderStatus(order.id, "failed");
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { claimMetaPurchaseEvent, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";

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

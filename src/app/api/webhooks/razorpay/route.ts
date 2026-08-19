import { NextRequest, NextResponse } from "next/server";
import { claimMetaPurchaseEvent, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";

// BACKUP path to "paid" — /api/checkout/verify-payment is primary. Events
// can arrive out of order and more than once; the `order.status !== "paid"`
// guard below is what makes that safe.
export async function POST(req: NextRequest) {
  // Signature verification is over the exact raw bytes — read as text
  // before any parse, a parse-then-restringify will not match.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  try {
    const valid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    console.error("Razorpay webhook signature check failed:", err);
    return NextResponse.json({ error: "Signature verification unavailable" }, { status: 500 });
  }

  const payload = JSON.parse(rawBody);
  const event: string | undefined = payload?.event;

  if (event === "payment.captured") {
    const orderId: string | undefined = payload?.payload?.order?.entity?.receipt;
    if (!orderId) {
      console.error("Razorpay webhook: payment.captured missing receipt:", rawBody.slice(0, 500));
      return NextResponse.json({ ok: true });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Unknown order" }, { status: 404 });
    }

    if (order.status !== "paid") {
      await setOrderStatus(order.id, "paid");

      if (order.item.category === "workshop") {
        // Atomic conditional decrement — safe under webhook retries and a
        // concurrent verify-payment call for the same order.
        await decrementWorkshopSeats(order.itemId);
      }

      // Idempotency note: guarded only by the `order.status !== "paid"`
      // check above — same non-atomic guard verify-payment and the
      // /order/confirmed fallback use (audit P1-01). See the matching
      // note in verify-payment/route.ts.
      await sendPaidOrderNotifications(order);
    }

    // Claimed independently of the status flip above: whichever of the
    // three paths gets here first sends the Purchase event, exactly once.
    if (await claimMetaPurchaseEvent(order.id)) {
      await sendMetaPurchaseEvent(order);
    }
  } else if (event === "payment.failed") {
    const orderId: string | undefined = payload?.payload?.order?.entity?.receipt;
    if (!orderId) {
      console.error("Razorpay webhook: payment.failed missing receipt:", rawBody.slice(0, 500));
      return NextResponse.json({ ok: true });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Unknown order" }, { status: 404 });
    }

    // A captured payment must never be clobbered by a later failed event
    // for a retried attempt.
    if (order.status !== "paid") {
      await setOrderStatus(order.id, "failed");
    }
  }

  return NextResponse.json({ ok: true });
}

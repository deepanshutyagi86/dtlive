import { NextRequest, NextResponse } from "next/server";
import { claimMetaPurchaseEvent, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";

// PRIMARY path to "paid" — called by the browser's Razorpay `handler`
// callback immediately after a successful popup payment. This is the
// security boundary: the signature proves the browser isn't just claiming
// a payment happened. The webhook (src/app/api/webhooks/razorpay/route.ts)
// and the /order/confirmed poll fallback both run the identical
// status-guarded block as backups.
export async function POST(req: NextRequest) {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature, orderId } = await req.json();

    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature || !orderId) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const valid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Unknown order" }, { status: 404 });
    }

    if (order.status !== "paid") {
      await setOrderStatus(order.id, "paid");

      if (order.item.category === "workshop") {
        // Atomic conditional decrement — safe under a concurrent webhook
        // delivery or /order/confirmed fallback hitting the same order.
        await decrementWorkshopSeats(order.itemId);
      }

      // Idempotency note: this whole block is guarded only by the
      // `order.status !== "paid"` check above, the same non-atomic guard
      // the webhook and the /order/confirmed fallback use (audit P1-01).
      // A genuine race between this route and one of the other two paths
      // landing at nearly the same moment could in theory double-send a
      // notification. Adding a notification_sent_at column would close
      // that gap, but that's a migration against production and out of
      // scope here.
      await sendPaidOrderNotifications(order);
    }

    // Claimed independently of the status flip above: whichever of the
    // three paths gets here first sends the Purchase event, exactly once.
    if (await claimMetaPurchaseEvent(order.id)) {
      await sendMetaPurchaseEvent(order);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("verify-payment error:", err);
    return NextResponse.json({ error: "Could not verify payment. Please try again." }, { status: 500 });
  }
}

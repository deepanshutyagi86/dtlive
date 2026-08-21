import { NextRequest, NextResponse } from "next/server";
import { claimMetaPurchaseEvent, claimOrderPaid, decrementWorkshopSeats, getOrderById } from "@/lib/admin-repo";
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

    // SECURITY, load-bearing. The signature only proves that
    // razorpayOrderId/razorpayPaymentId is a genuine Razorpay pair — it says
    // nothing about WHICH of our orders it belongs to, and both that pair
    // and `orderId` arrive in the same request body.
    //
    // Without this check, anyone could buy the cheapest item on the site,
    // keep the valid {order_id, payment_id, signature} triple, then create
    // an order for the most expensive course and replay the cheap triple
    // against it. claimOrderPaid would succeed, the seat would decrement,
    // the confirmation would send and a GST invoice would be issued for
    // money that never arrived.
    //
    // The column is still named cashfree_order_id for historical reasons;
    // it holds whichever gateway's order ID, set in create-order.
    if (!order.cashfreeOrderId || order.cashfreeOrderId !== razorpayOrderId) {
      console.error(
        "verify-payment: razorpay order mismatch for order", order.id,
        "expected", order.cashfreeOrderId, "got", razorpayOrderId
      );
      return NextResponse.json({ error: "Payment does not match this order." }, { status: 400 });
    }

    // Atomic claim, not a read-then-branch. Exactly one of the three paid
    // paths wins this UPDATE for a given order, so the seat decrement and
    // the notification emails below can never double-fire under a race
    // with the webhook or the /order/confirmed fallback (audit P1-01,
    // now closed without needing a new column).
    if (await claimOrderPaid(order.id)) {
      // Each step is guarded separately. The claim above has ALREADY
      // committed, so a throw here is unrecoverable: the webhook retry and
      // the /order/confirmed fallback would both get `false` from
      // claimOrderPaid forever, and the buyer would never receive their
      // confirmation. Log and continue instead — a seat count the admin can
      // correct by hand beats a silent no-email.
      if (order.item.category === "workshop") {
        try {
          await decrementWorkshopSeats(order.itemId);
        } catch (err) {
          console.error("Seat decrement failed for paid order", order.id, err);
        }
      }
      try {
        await sendPaidOrderNotifications({ ...order, status: "paid" });
      } catch (err) {
        console.error("Paid order notifications failed for", order.id, err);
      }
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

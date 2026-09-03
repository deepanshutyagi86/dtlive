import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { claimMetaPurchaseEvent, claimOrderPaid, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
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

    // Same atomic claim as verify-payment — see claimOrderPaid in
    // admin-repo.ts. Webhook retries and a concurrent verify-payment call
    // for the same order both land here safely.
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
    // Razorpay's webhook delivery has its own retry/timeout expectations —
    // fired via waitUntil rather than awaited, same reasoning as
    // verify-payment, so a slow graph.facebook.com response can't turn
    // into a slow (or retried) webhook ack.
    if (await claimMetaPurchaseEvent(order.id)) {
      waitUntil(
        sendMetaPurchaseEvent(order).catch((err) => {
          console.error("Meta CAPI Purchase event failed for order", order.id, err);
        })
      );
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

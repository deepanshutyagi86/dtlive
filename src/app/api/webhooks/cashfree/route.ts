import { NextRequest, NextResponse } from "next/server";
import { claimMetaPurchaseEvent, decrementWorkshopSeats, getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { verifyCashfreeWebhookSignature } from "@/lib/cashfree";
import { sendMetaPurchaseEvent } from "@/lib/meta-capi";
import { sendEmail, emailHtml } from "@/lib/email";
import { getNotifyEmail } from "@/lib/items";

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
      // meta_purchase_sent_at). A concurrent webhook retry landing in the
      // narrow window before setOrderStatus's write is visible could in
      // theory re-enter this block and send a duplicate email. Adding a
      // notification_sent_at column (same pattern as meta_purchase_sent_at)
      // would close that gap, but that's a migration against production and
      // is explicitly out of scope here — do it when P1-01 is fixed.

      const amountLabel = `₹${order.amount / 100}`;
      const buyerFirstName = order.buyerName.split(" ")[0];

      try {
        await sendEmail({
          to: order.buyerEmail,
          subject: `Payment confirmed — ${order.item.title}`,
          text: `Hi ${buyerFirstName},

Payment received for ${order.item.title} — thanks for joining.

Amount: ${amountLabel}
Order ID: ${order.id}

I'll be in touch directly if there's anything else you need before it starts. See you there.

— Deepanshu`,
          html: emailHtml(`
            <p style="margin:0 0 16px;font-size:20px;font-weight:800;">Payment confirmed</p>
            <p style="margin:0 0 16px;line-height:1.6;">Hi ${buyerFirstName}, payment received for <b>${order.item.title}</b> — thanks for joining.</p>
            <table style="width:100%;border-top:1px solid #DEDCD2;margin-top:8px;padding-top:16px;font-size:14px;">
              <tr><td style="color:#8b8a80;padding:4px 0;">Amount</td><td style="text-align:right;font-weight:700;">${amountLabel}</td></tr>
              <tr><td style="color:#8b8a80;padding:4px 0;">Order ID</td><td style="text-align:right;font-family:monospace;font-size:12px;">${order.id}</td></tr>
            </table>
            <p style="margin:20px 0 0;line-height:1.6;">I'll be in touch directly if there's anything else you need before it starts. See you there.</p>
            <p style="margin:20px 0 0;">— Deepanshu</p>
          `),
        });
      } catch (err) {
        console.error("Webhook: buyer confirmation email failed:", err);
      }

      try {
        const notifyEmail = await getNotifyEmail();
        if (notifyEmail) {
          await sendEmail({
            to: notifyEmail,
            subject: `New order — ${order.item.title} (${amountLabel})`,
            text: `New paid order.

Item: ${order.item.title}
Amount: ${amountLabel}
Order ID: ${order.id}

Buyer
Name: ${order.buyerName}
Email: ${order.buyerEmail}
Phone: ${order.buyerPhone}`,
            html: emailHtml(`
              <p style="margin:0 0 16px;font-size:20px;font-weight:800;">New order</p>
              <table style="width:100%;font-size:14px;">
                <tr><td style="color:#8b8a80;padding:4px 0;">Item</td><td style="text-align:right;">${order.item.title}</td></tr>
                <tr><td style="color:#8b8a80;padding:4px 0;">Amount</td><td style="text-align:right;font-weight:700;">${amountLabel}</td></tr>
                <tr><td style="color:#8b8a80;padding:4px 0;">Order ID</td><td style="text-align:right;font-family:monospace;font-size:12px;">${order.id}</td></tr>
              </table>
              <table style="width:100%;border-top:1px solid #DEDCD2;margin-top:16px;padding-top:16px;font-size:14px;">
                <tr><td style="color:#8b8a80;padding:4px 0;">Name</td><td style="text-align:right;">${order.buyerName}</td></tr>
                <tr><td style="color:#8b8a80;padding:4px 0;">Email</td><td style="text-align:right;">${order.buyerEmail}</td></tr>
                <tr><td style="color:#8b8a80;padding:4px 0;">Phone</td><td style="text-align:right;">${order.buyerPhone}</td></tr>
              </table>
            `),
          });
        }
      } catch (err) {
        console.error("Webhook: admin order alert email failed:", err);
      }
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

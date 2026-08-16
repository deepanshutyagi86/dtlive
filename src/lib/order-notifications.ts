// Shared by both places an order can transition to "paid": the Cashfree
// webhook (src/app/api/webhooks/cashfree/route.ts) and the /order/confirmed
// page's fallback poll (src/app/order/confirmed/page.tsx, needed because
// CASHFREE_WEBHOOK_SECRET isn't configured in production yet — audit
// P0-04 — so the webhook 500s and never actually runs there). One
// function, one copy of the copy, called from both call sites.
import type { Order } from "./db";
import { sendEmail, emailHtml } from "./email";
import { getNotifyEmail } from "./items";

type PaidOrder = Order & { item: { title: string; category: string; details: any } };

export async function sendPaidOrderNotifications(order: PaidOrder): Promise<void> {
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
    console.error("Paid order: buyer confirmation email failed:", err);
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
    console.error("Paid order: admin alert email failed:", err);
  }
}

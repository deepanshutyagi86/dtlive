// Shared by both places an order can transition to "paid": the Cashfree
// webhook (src/app/api/webhooks/cashfree/route.ts) and the /order/confirmed
// page's fallback poll (src/app/order/confirmed/page.tsx, needed because
// CASHFREE_WEBHOOK_SECRET isn't configured in production yet — audit
// P0-04 — so the webhook 500s and never actually runs there). One
// function, one copy of the copy, called from both call sites.
import type { Order } from "./db";
import { sendEmail } from "./email";
import { getNotifyEmail, getSetting } from "./items";
import { DEFAULT_EMAIL_COPY, resolveTemplate, renderTemplate } from "./email-templates";
import type { EmailCopy } from "./email-templates";

type PaidOrder = Order & { item: { title: string; category: string; details: any } };

export async function sendPaidOrderNotifications(order: PaidOrder): Promise<void> {
  const emailCopy = await getSetting<EmailCopy>("emailCopy", {});
  const amountLabel = `₹${order.amount / 100}`;
  const buyerFirstName = order.buyerName.split(" ")[0];

  const values = {
    name: order.buyerName,
    firstName: buyerFirstName,
    item: order.item.title,
    amount: amountLabel,
    orderId: order.id,
    email: order.buyerEmail,
    phone: order.buyerPhone,
  };

  try {
    const template = resolveTemplate(emailCopy.paidBuyer, DEFAULT_EMAIL_COPY.paidBuyer);
    const rendered = renderTemplate(template, values);
    await sendEmail({ to: order.buyerEmail, ...rendered });
  } catch (err) {
    console.error("Paid order: buyer confirmation email failed:", err);
  }

  try {
    const notifyEmail = await getNotifyEmail();
    if (notifyEmail) {
      const template = resolveTemplate(emailCopy.paidAdmin, DEFAULT_EMAIL_COPY.paidAdmin);
      const rendered = renderTemplate(template, values);
      await sendEmail({ to: notifyEmail, ...rendered });
    }
  } catch (err) {
    console.error("Paid order: admin alert email failed:", err);
  }
}

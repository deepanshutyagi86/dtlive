// Shared by all three places an order can transition to "paid": the
// primary /api/checkout/verify-payment route (fired by the Razorpay
// popup's handler callback right after payment), the Razorpay webhook
// (src/app/api/webhooks/razorpay/route.ts, backup), and the
// /order/confirmed page's fallback poll (src/app/order/confirmed/page.tsx,
// for the case where the buyer's browser dies between the charge and the
// verify call). One function, one copy of the copy, called from all three
// call sites.
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

// Shared by all three places an order can transition to "paid": the
// primary /api/checkout/verify-payment route (fired by the Razorpay
// popup's handler callback right after payment), the Razorpay webhook
// (src/app/api/webhooks/razorpay/route.ts, backup), and the
// /order/confirmed page's fallback poll (src/app/order/confirmed/page.tsx,
// for the case where the buyer's browser dies between the charge and the
// verify call). One function, one copy of the copy, called from all three
// call sites — and all three now reach it only through claimOrderPaid, so
// it runs exactly once per order.
import type { Order } from "./db";
import { sendEmail } from "./email";
import { getNotifyEmail, getSetting } from "./items";
import { getAllAdPages, getEmailSender, getInvoiceSettings, invoiceAppliesTo, SITE_URL } from "./site-settings";
import { adSourceTag } from "./settings-types";
import { DEFAULT_EMAIL_COPY, resolveTemplate, renderTemplate } from "./email-templates";
import type { EmailCopy } from "./email-templates";
import type { WorkshopDetails } from "./types";
import { SITE_TZ } from "./dates";
import { formatRupees } from "./tax";

type PaidOrder = Order & { item: { title: string; slug: string; category: string; details: any } };

export async function sendPaidOrderNotifications(order: PaidOrder): Promise<void> {
  // Neither of these reads may take the emails down with it. The order is
  // already marked paid by the time this runs, so a settings hiccup that
  // threw here would cost the buyer their confirmation entirely — far
  // worse than sending the default copy, or sending without an invoice
  // link. Each failure degrades to its default and is logged.
  const [emailCopy, invoiceSettings] = await Promise.all([
    getSetting<EmailCopy>("emailCopy", {}).catch((err) => {
      console.error("Paid order: emailCopy read failed, using defaults.", err);
      return {} as EmailCopy;
    }),
    getInvoiceSettings().catch((err) => {
      console.error("Paid order: invoice settings read failed, omitting invoice link.", err);
      return null;
    }),
  ]);

  // Indian grouping, and paise only when there are any — a GST total
  // of 8258.82 must not render as "₹8258.82" in a confirmation email.
  const amountLabel = `₹${formatRupees(order.amount / 100)}`;
  const buyerFirstName = order.buyerName.split(" ")[0];

  // Joining details live on the item, so every workshop and course can
  // carry its own group link, session link and note without a deploy.
  const d = (order.item.details ?? {}) as WorkshopDetails & {
    joining?: { groupUrl?: string; meetingUrl?: string; note?: string };
  };
  const joining = d.joining ?? {};
  const isWorkshop = order.item.category === "workshop";

  const dateLabel =
    isWorkshop && d.date && !Number.isNaN(new Date(d.date).getTime())
      ? new Date(d.date).toLocaleString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: SITE_TZ,
        }) + " IST"
      : "";

  // Resolved the same way /order/confirmed resolves it, from the order's
  // own `source` tag — nothing here is supplied by the browser.
  let campaignGroupUrl = "";
  if (order.source?.startsWith("ad:")) {
    try {
      const pages = await getAllAdPages();
      const match = pages.find((p) => adSourceTag(p.slug) === order.source);
      if (match?.groupUrl) campaignGroupUrl = match.groupUrl;
    } catch (err) {
      // Attribution lookup must never cost a buyer their confirmation
      // email — fall back to the item's own link.
      console.error("Paid order: could not resolve the campaign group link:", err);
    }
  }

  // One lookup, used for the footer on both emails and as the Reply-To.
  const sender = await getEmailSender().catch(() => undefined);

  const values = {
    name: order.buyerName,
    firstName: buyerFirstName,
    item: order.item.title,
    amount: amountLabel,
    orderId: order.id,
    email: order.buyerEmail,
    phone: order.buyerPhone,
    date: dateLabel,
    // The campaign's own group link wins over the item's for a buyer who
    // came through an ad page. Without this, the confirmation PAGE sent
    // them to one group and the confirmation EMAIL to another — the two
    // surfaces disagreeing about the same next step.
    groupUrl: campaignGroupUrl || joining.groupUrl || "",
    meetingUrl: joining.meetingUrl ?? "",
    calendarUrl: isWorkshop && d.date ? `${SITE_URL}/items/${order.item.slug}/calendar` : "",
    invoiceUrl:
      invoiceSettings && invoiceAppliesTo(invoiceSettings, order.item.details)
        ? `${SITE_URL}/order/${order.id}/invoice`
        : "",
    joiningNote: joining.note ?? "",
  };

  try {
    const template = resolveTemplate(emailCopy.paidBuyer, DEFAULT_EMAIL_COPY.paidBuyer);
    const rendered = renderTemplate(template, values, sender);
    const sent = await sendEmail({ to: order.buyerEmail, ...rendered, replyTo: sender?.email });
    // Logged against the ORDER ID. A paying customer who never got a
    // receipt is a support problem, and "which order was it" is the first
    // question — a bare provider error in the console cannot answer it.
    if (!sent.ok) {
      console.error(`Paid order ${order.id}: buyer confirmation NOT sent to ${order.buyerEmail} — ${sent.error}`);
    }
  } catch (err) {
    console.error("Paid order: buyer confirmation email failed:", err);
  }

  try {
    const notifyEmail = await getNotifyEmail();
    if (notifyEmail) {
      const template = resolveTemplate(emailCopy.paidAdmin, DEFAULT_EMAIL_COPY.paidAdmin);
      const rendered = renderTemplate(template, values, sender);
      const sent = await sendEmail({ to: notifyEmail, ...rendered, replyTo: sender?.email });
      if (!sent.ok) {
        console.error(`Paid order ${order.id}: admin alert NOT sent to ${notifyEmail} — ${sent.error}`);
      }
    }
  } catch (err) {
    console.error("Paid order: admin alert email failed:", err);
  }
}

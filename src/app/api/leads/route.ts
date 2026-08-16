import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { claimMetaLeadEvent, createLead, decrementWorkshopSeats, listLeads } from "@/lib/admin-repo";
import { sendMetaLeadEvent } from "@/lib/meta-capi";
import { getItemById, getNotifyEmail } from "@/lib/items";
import { DEFAULT_REGISTRATION_FIELDS } from "@/lib/types";
import type { WorkshopDetails } from "@/lib/types";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { sendEmail, emailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!rateLimit(`leads:${clientIpFrom(req)}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const { itemId, answers, fbc, fbp, eventSourceUrl } = await req.json();
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "Missing form answers." }, { status: 400 });
  }

  const item = itemId ? await getItemById(itemId) : null;

  // An itemId that doesn't resolve to a live item is either a stale page or
  // someone poking the endpoint directly — either way, don't touch it.
  if (itemId && (!item || !item.live)) {
    return NextResponse.json({ error: "This item is not available." }, { status: 404 });
  }

  const details = item?.details as WorkshopDetails | undefined;
  const fields =
    details?.registrationFields && details.registrationFields.length > 0
      ? details.registrationFields
      : DEFAULT_REGISTRATION_FIELDS;

  for (const f of fields) {
    if (f.required && !String(answers[f.key] ?? "").trim()) {
      return NextResponse.json({ error: `"${f.label}" is required.` }, { status: 400 });
    }
  }

  // Known columns are resolved by field *type* (not key) so a relabeled or
  // renamed email/phone field still lands in the dedicated columns Meta
  // CAPI matching relies on. "name" is the one key-based exception — it's
  // the person's identity, not a contact channel. Everything else goes
  // into `answers` JSONB.
  const nameField = fields.find((f) => f.key === "name");
  const emailField = fields.find((f) => f.type === "email");
  const phoneField = fields.find((f) => f.type === "tel");

  const email = emailField ? String(answers[emailField.key] ?? "").trim() || null : null;
  const phone = phoneField ? String(answers[phoneField.key] ?? "").trim() || null : null;
  const name = (nameField ? answers[nameField.key] : null) || email || phone || "Unknown";

  if (!email && !phone) {
    return NextResponse.json({ error: "At least one contact field (email or phone) is required." }, { status: 400 });
  }

  const extraAnswers: Record<string, string> = {};
  for (const f of fields) {
    if (f.key === nameField?.key || f === emailField || f === phoneField) continue;
    if (answers[f.key] !== undefined && answers[f.key] !== "") extraAnswers[f.key] = String(answers[f.key]);
  }

  // x-forwarded-for can carry a "client, proxy1, proxy2" chain — the first
  // entry is the registrant's IP, which is what Meta expects.
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const clientUserAgent = req.headers.get("user-agent");

  const lead = await createLead({
    name,
    contact: email || phone || name,
    itemId: itemId || null,
    email,
    phone,
    fbc: typeof fbc === "string" ? fbc : null,
    fbp: typeof fbp === "string" ? fbp : null,
    clientIp,
    clientUserAgent,
    eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl : null,
    answers: Object.keys(extraAnswers).length > 0 ? extraAnswers : null,
  });

  if (await claimMetaLeadEvent(lead.id)) {
    await sendMetaLeadEvent(lead);
  }

  // itemId is optional (a general enquiry has none) — every place below
  // that reads item.title has to handle item being null without printing
  // "undefined".
  const itemLabel = item
    ? item.category === "workshop"
      ? `registering for ${item.title}`
      : `reaching out about ${item.title}`
    : "getting in touch";

  if (lead.email) {
    try {
      const firstName = lead.name.split(" ")[0];
      await sendEmail({
        to: lead.email,
        subject: item ? `You're in — ${item.title}` : "Got your message",
        text: `Hi ${firstName},

Thanks for ${itemLabel}. I've got your details and will follow up directly.

— Deepanshu`,
        html: emailHtml(`
          <p style="margin:0 0 16px;font-size:20px;font-weight:800;">Got it 🎉</p>
          <p style="margin:0 0 16px;line-height:1.6;">Hi ${firstName}, thanks for ${itemLabel}. I've got your details and will follow up directly.</p>
          <p style="margin:20px 0 0;">— Deepanshu</p>
        `),
      });
    } catch (err) {
      console.error("Leads: registrant confirmation email failed:", err);
    }
  }

  try {
    const notifyEmail = await getNotifyEmail();
    if (notifyEmail) {
      const itemTitle = item?.title ?? "General enquiry";
      await sendEmail({
        to: notifyEmail,
        subject: `New lead — ${itemTitle}`,
        text: `New lead.

Item: ${itemTitle}

Name: ${lead.name}
Email: ${lead.email ?? "—"}
Phone: ${lead.phone ?? "—"}`,
        html: emailHtml(`
          <p style="margin:0 0 16px;font-size:20px;font-weight:800;">New lead</p>
          <table style="width:100%;font-size:14px;">
            <tr><td style="color:#8b8a80;padding:4px 0;">Item</td><td style="text-align:right;">${itemTitle}</td></tr>
          </table>
          <table style="width:100%;border-top:1px solid #DEDCD2;margin-top:16px;padding-top:16px;font-size:14px;">
            <tr><td style="color:#8b8a80;padding:4px 0;">Name</td><td style="text-align:right;">${lead.name}</td></tr>
            <tr><td style="color:#8b8a80;padding:4px 0;">Email</td><td style="text-align:right;">${lead.email ?? "—"}</td></tr>
            <tr><td style="color:#8b8a80;padding:4px 0;">Phone</td><td style="text-align:right;">${lead.phone ?? "—"}</td></tr>
          </table>
        `),
      });
    }
  } catch (err) {
    console.error("Leads: admin alert email failed:", err);
  }

  // Only the free-registration flow decrements here. Paid workshops decrement
  // in the Cashfree webhook, on confirmed payment — otherwise anyone could
  // zero out a paid workshop's seats by POSTing to this public endpoint.
  const isFreeWorkshop =
    item?.category === "workshop" && (item.details as WorkshopDetails).price === 0;

  if (isFreeWorkshop) {
    await decrementWorkshopSeats(item!.id);
  }

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await listLeads();
  return NextResponse.json(leads);
}

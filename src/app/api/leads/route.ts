import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { claimMetaLeadEvent, createLead, decrementWorkshopSeats, listLeads } from "@/lib/admin-repo";
import { sendMetaLeadEvent } from "@/lib/meta-capi";
import { getItemById, getNotifyEmail, getSetting } from "@/lib/items";
import { DEFAULT_REGISTRATION_FIELDS } from "@/lib/types";
import type { WorkshopDetails } from "@/lib/types";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { DEFAULT_EMAIL_COPY, resolveTemplate, renderTemplate } from "@/lib/email-templates";
import type { EmailCopy } from "@/lib/email-templates";

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

  const emailCopy = await getSetting<EmailCopy>("emailCopy", {});
  // itemId is optional (a general enquiry has none) — leadValues.item is ""
  // in that case, and the {item} token in either template below already
  // renders as an empty string rather than "undefined" (see substitute()
  // in email-templates.ts).
  const leadValues = {
    name: lead.name,
    firstName: lead.name.split(" ")[0],
    item: item?.title ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
  };

  if (lead.email) {
    try {
      const template = resolveTemplate(emailCopy.leadBuyer, DEFAULT_EMAIL_COPY.leadBuyer);
      const rendered = renderTemplate(template, leadValues);
      await sendEmail({ to: lead.email, ...rendered });
    } catch (err) {
      console.error("Leads: registrant confirmation email failed:", err);
    }
  }

  try {
    const notifyEmail = await getNotifyEmail();
    if (notifyEmail) {
      const template = resolveTemplate(emailCopy.leadAdmin, DEFAULT_EMAIL_COPY.leadAdmin);
      const rendered = renderTemplate(template, leadValues);
      await sendEmail({ to: notifyEmail, ...rendered });
    }
  } catch (err) {
    console.error("Leads: admin alert email failed:", err);
  }

  // Only the free-registration flow decrements here. Paid workshops decrement
  // on the Razorpay verify-payment / webhook paths, on confirmed payment —
  // otherwise anyone could zero out a paid workshop's seats by POSTing to
  // this public endpoint.
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

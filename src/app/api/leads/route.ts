import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { claimMetaLeadEvent, createLead, decrementWorkshopSeats, listLeads, tagAttribution, tagSource } from "@/lib/admin-repo";
import { sendMetaLeadEvent } from "@/lib/meta-capi";
import { getItemById, getNotifyEmail, getSetting } from "@/lib/items";
import { adSourceFor, getEmailSender, liveSourceFor } from "@/lib/site-settings";
import { sanitiseAttribution } from "@/lib/attribution";
import { DEFAULT_REGISTRATION_FIELDS } from "@/lib/types";
import type { WorkshopDetails } from "@/lib/types";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { isValidEmail, isValidPhone, normalisePhone } from "@/lib/validate";
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

  const { itemId, answers, fbc, fbp, eventSourceUrl, liveSession, liveBlockId, adPage, attribution } = await req.json();
  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "Missing form answers." }, { status: 400 });
  }

  const item = itemId ? await getItemById(itemId) : null;

  // An itemId that doesn't resolve to a live item is either a stale page or
  // someone poking the endpoint directly — either way, don't touch it.
  if (itemId && (!item || !item.live)) {
    return NextResponse.json({ error: "This item is not available." }, { status: 404 });
  }

  // A workshop that has already started must stop accepting registrations.
  // Nothing checked this before, so a stale shared link kept collecting
  // people for a session that had happened (audit P1-02).
  const workshopDetails = item?.category === "workshop" ? (item.details as WorkshopDetails) : null;
  const isFreeWorkshopItem = !!workshopDetails && workshopDetails.price === 0;

  if (workshopDetails?.date) {
    const startsAt = new Date(workshopDetails.date).getTime();
    if (!Number.isNaN(startsAt) && startsAt < Date.now()) {
      return NextResponse.json(
        { error: "This workshop has already started — registration is closed." },
        { status: 409 }
      );
    }
  }

  // Checked here rather than only at decrement time, so a full workshop
  // rejects the registration instead of creating a lead, emailing Meta,
  // emailing the person, and telling them "You're in" while the seat count
  // silently refused to move.
  if (isFreeWorkshopItem && !workshopDetails!.unlimitedSeats && (workshopDetails!.seatsLeft ?? 0) <= 0) {
    return NextResponse.json({ error: "This one is full — all seats are taken." }, { status: 409 });
  }

  const details = workshopDetails ?? (item?.details as WorkshopDetails | undefined);
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

  // Same reasoning as the checkout route: `type="email"` on the input is
  // decoration, because the form posts from a click handler and never runs
  // native validation. This is the only place the rule is actually
  // enforced.
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "That email doesn't look right — check for a typo." }, { status: 400 });
  }
  if (phone && !isValidPhone(phone)) {
    return NextResponse.json(
      { error: "That phone number doesn't look right — 10 digits, or include the country code." },
      { status: 400 }
    );
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
    phone: phone ? normalisePhone(phone) : null,
    fbc: typeof fbc === "string" ? fbc : null,
    fbp: typeof fbp === "string" ? fbp : null,
    clientIp,
    clientUserAgent,
    eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl : null,
    answers: Object.keys(extraAnswers).length > 0 ? extraAnswers : null,
  });

  // Which webinar this registration came from, when it came from one.
  // Verified server-side against the settings row rather than believed:
  // a stale link can't keep tagging people onto a session that has ended.
  const liveTag = itemId
    ? (await liveSourceFor(itemId, liveSession, liveBlockId)) ?? (await adSourceFor(itemId, adPage))
    : null;
  if (liveTag) await tagSource("leads", lead.id, liveTag);
  await tagAttribution("leads", lead.id, sanitiseAttribution(attribution));

  if (await claimMetaLeadEvent(lead.id)) {
    await sendMetaLeadEvent(lead);
  }

  const emailCopy = await getSetting<EmailCopy>("emailCopy", {});
  // Identity footer + Reply-To, same as the paid-order emails. Swallowed
  // on failure: a missing footer must never cost someone their
  // registration confirmation.
  const emailSender = await getEmailSender().catch(() => undefined);
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
      const rendered = renderTemplate(template, leadValues, emailSender);
      const sent = await sendEmail({ to: lead.email, ...rendered, replyTo: emailSender?.email });
      // Logged against the LEAD ID, same reasoning as the paid-order path:
      // sendEmail reports why now, and a bare console line with no id is
      // not something a registrant's "I never got a confirmation" support
      // message can be matched back to.
      if (!sent.ok) {
        console.error(`Lead ${lead.id}: registrant confirmation NOT sent to ${lead.email} — ${sent.error}`);
      }
    } catch (err) {
      console.error("Leads: registrant confirmation email failed:", err);
    }
  }

  try {
    const notifyEmail = await getNotifyEmail();
    if (notifyEmail) {
      const template = resolveTemplate(emailCopy.leadAdmin, DEFAULT_EMAIL_COPY.leadAdmin);
      const rendered = renderTemplate(template, leadValues, emailSender);
      const sent = await sendEmail({ to: notifyEmail, ...rendered, replyTo: emailSender?.email });
      if (!sent.ok) {
        console.error(`Lead ${lead.id}: admin alert NOT sent to ${notifyEmail} — ${sent.error}`);
      }
    }
  } catch (err) {
    console.error("Leads: admin alert email failed:", err);
  }

  // Only the free-registration flow decrements here. Paid workshops decrement
  // on the Razorpay verify-payment / webhook paths, on confirmed payment —
  // otherwise anyone could zero out a paid workshop's seats by POSTing to
  // this public endpoint.
  // decrementWorkshopSeats returns false when the workshop is full or
  // unlimited. The seats check above is the real gate; this is the last
  // word, and it is logged rather than surfaced because the lead has
  // already been created and the person already has their email — telling
  // them "actually, no" at this point would be worse than one seat of
  // drift that the admin can correct.
  if (isFreeWorkshopItem) {
    const decremented = await decrementWorkshopSeats(item!.id);
    if (!decremented && !workshopDetails!.unlimitedSeats) {
      console.error("Leads: seat decrement did not apply for item", item!.id, "- check seatsLeft.");
    }
  }

  return NextResponse.json({ ok: true, id: lead.id }, { status: 201 });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leads = await listLeads();
  return NextResponse.json(leads);
}

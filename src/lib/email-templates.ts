// Admin-editable email copy. Each template is plain text with {token}
// placeholders — the admin never authors HTML directly (matches "no heavy
// HTML template framework"); the HTML body is derived from the same plain
// text via emailHtml()'s wrapper plus a simple paragraph/line-break split.
import { emailHtml, emailTextFooter, type EmailSender } from "./email";

export interface EmailTemplate {
  subject: string;
  body: string;
}

export interface EmailCopy {
  paidBuyer?: Partial<EmailTemplate>;
  paidAdmin?: Partial<EmailTemplate>;
  leadBuyer?: Partial<EmailTemplate>;
  leadAdmin?: Partial<EmailTemplate>;
}

// The full set of tokens every template may use. A token with no value for
// a given send renders as an empty string — never the literal "{token}"
// and never "undefined".
export type PlaceholderKey =
  | "name"
  | "firstName"
  | "item"
  | "amount"
  | "orderId"
  | "email"
  | "phone"
  // Joining + post-purchase tokens. Each resolves to "" when the item has
  // no such detail configured, so a template that uses {groupUrl} on an
  // item with no group link renders a blank rather than a broken link —
  // the same rule every other token already followed.
  | "date"
  | "groupUrl"
  | "meetingUrl"
  | "calendarUrl"
  | "invoiceUrl"
  | "joiningNote";
export type PlaceholderValues = Partial<Record<PlaceholderKey, string>>;

export const PLACEHOLDER_KEYS: PlaceholderKey[] = [
  "name",
  "firstName",
  "item",
  "amount",
  "orderId",
  "email",
  "phone",
  "date",
  "groupUrl",
  "meetingUrl",
  "calendarUrl",
  "invoiceUrl",
  "joiningNote",
];

export const DEFAULT_EMAIL_COPY: Record<"paidBuyer" | "paidAdmin" | "leadBuyer" | "leadAdmin", EmailTemplate> = {
  paidBuyer: {
    subject: "Payment confirmed — {item}",
    body: `Hi {firstName},

Payment received for {item} — thanks for joining.

Amount: {amount}
Order ID: {orderId}

I'll be in touch directly if there's anything else you need before it starts. See you there.

— Deepanshu`,
  },
  paidAdmin: {
    subject: "New order — {item} ({amount})",
    body: `New paid order.

Item: {item}
Amount: {amount}
Order ID: {orderId}

Buyer
Name: {name}
Email: {email}
Phone: {phone}`,
  },
  leadBuyer: {
    subject: "Got your details",
    body: `Hi {firstName},

Thanks for getting in touch. I've got your details and will follow up directly.

Re: {item}

— Deepanshu`,
  },
  leadAdmin: {
    subject: "New lead",
    body: `New lead.

Item: {item}

Name: {name}
Email: {email}
Phone: {phone}`,
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Flat {token} substitution. `escape` is true only for the HTML body pass —
// the surrounding admin-authored template text is trusted, but every
// interpolated value (buyer name, email, item title, ...) is escaped there
// so a crafted buyer-supplied value can't inject markup into the email.
function substitute(template: string, values: PlaceholderValues, escape: boolean): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = values[key as PlaceholderKey];
    if (value === undefined || value === null || value === "") return "";
    return escape ? escapeHtml(value) : value;
  });
}

// Blank admin-edited fields fall back to the code default, independently
// per field (editing just the subject and leaving body blank keeps the
// default body).
export function resolveTemplate(
  configured: Partial<EmailTemplate> | undefined,
  fallback: EmailTemplate
): EmailTemplate {
  return {
    subject: configured?.subject?.trim() || fallback.subject,
    body: configured?.body?.trim() || fallback.body,
  };
}

export function renderTemplate(
  template: EmailTemplate,
  values: PlaceholderValues,
  /** Who is sending. Appended as an identity footer to BOTH the HTML and
   *  the text part — see emailHtml() for why that is a deliverability
   *  concern and not decoration. */
  sender?: EmailSender
): { subject: string; text: string; html: string } {
  // Subjects go out as a raw header field — strip any stray newline from a
  // substituted value rather than let it split into extra header lines.
  const subject = substitute(template.subject, values, false).replace(/[\r\n]+/g, " ");
  const text = substitute(template.body, values, false) + emailTextFooter(sender);
  const htmlBody = substitute(template.body, values, true)
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 16px;line-height:1.6;">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return { subject, text, html: emailHtml(htmlBody, sender) };
}

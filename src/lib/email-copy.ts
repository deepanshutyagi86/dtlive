// Email COPY: the templates, the tokens, and the substitution rules.
//
// WHY THIS IS A SEPARATE MODULE FROM email-templates.ts
// email-templates.ts imports ./email, which imports the Resend SDK. The
// admin settings form is a "use client" component and needs the defaults
// and the token list to render its editor — importing them from
// email-templates.ts would drag the mail SDK into the browser bundle.
// So everything the client also needs lives here, with ZERO imports, the
// same rule settings-types.ts and settings-sections.ts already follow:
// shared DATA never lives in a component file, and a client-safe module
// never imports a server one.
//
// Before this existed the admin form carried its own hand-copied duplicate
// of DEFAULT_EMAIL_COPY with a comment asking a human to keep the two in
// sync. It had already drifted: six of the thirteen tokens the server
// actually substitutes were missing from the list the panel advertised, so
// {invoiceUrl}, {groupUrl}, {meetingUrl}, {calendarUrl}, {date} and
// {joiningNote} all worked at send time while the UI said they did not
// exist. One definition, imported by both, is the fix.

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

export type EmailTemplateKey = "paidBuyer" | "paidAdmin" | "leadBuyer" | "leadAdmin";

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

/** One-line description of each token, shown in the admin editor. */
export const PLACEHOLDER_HELP: Record<PlaceholderKey, string> = {
  name: "Buyer's full name, as they typed it",
  firstName: "First word of the name — for the greeting",
  item: "Title of the course, workshop or service",
  amount: "What they paid, formatted (₹27, ₹6,999)",
  orderId: "The order's ID — quote it in support replies",
  email: "Buyer's email address",
  phone: "Buyer's phone number",
  date: "Workshop date and time in IST. Empty for anything undated",
  groupUrl: "WhatsApp group link. The ad campaign's own group wins over the item's",
  meetingUrl: "Live session / Zoom link set on the item",
  calendarUrl: "Add-to-calendar link. Workshops with a date only",
  invoiceUrl: "GST invoice link. Empty unless invoices are on for this item",
  joiningNote: "Free-text joining note set on the item",
};

export const DEFAULT_EMAIL_COPY: Record<EmailTemplateKey, EmailTemplate> = {
  paidBuyer: {
    subject: "Payment confirmed — {item}",
    body: `Hi {firstName},

Payment received for {item} — thanks for joining.

Amount: {amount}
Order ID: {orderId}

{?groupUrl}Join the group so you don't miss the joining link:
{groupUrl}

{/groupUrl}{?invoiceUrl}Your GST invoice: {invoiceUrl}

{/invoiceUrl}I'll be in touch directly if there's anything else you need before it starts. See you there.

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
Phone: {phone}
{?invoiceUrl}
Invoice: {invoiceUrl}{/invoiceUrl}`,
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

export const EMAIL_TEMPLATE_META: Record<
  EmailTemplateKey,
  { title: string; blurb: string; placeholders: PlaceholderKey[] }
> = {
  paidBuyer: {
    title: "Paid order — to the buyer",
    blurb: "Sent the moment an order is confirmed paid.",
    placeholders: [
      "firstName",
      "name",
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
    ],
  },
  paidAdmin: {
    title: "Paid order — to you",
    blurb: "Sent to the notification address below, same trigger.",
    placeholders: [
      "firstName",
      "name",
      "item",
      "amount",
      "orderId",
      "email",
      "phone",
      "date",
      "invoiceUrl",
    ],
  },
  leadBuyer: {
    title: "New lead — to the registrant",
    blurb: "Sent after a free registration or enquiry, if they gave an email.",
    placeholders: ["firstName", "name", "item", "email", "phone", "date", "groupUrl", "meetingUrl", "joiningNote"],
  },
  leadAdmin: {
    title: "New lead — to you",
    blurb: "Sent to the notification address below, same trigger.",
    placeholders: ["firstName", "name", "item", "email", "phone", "date"],
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

// An optional block: {?token} ... {/token}
//
// Kept when the token has a value, removed entirely when it does not.
// This exists because a bare token is not enough for anything with a
// LABEL in front of it. "Your GST invoice: {invoiceUrl}" on an item with
// invoices switched off sends the buyer a line reading "Your GST invoice:"
// followed by nothing — which looks like the site is broken. Every token
// that can legitimately be empty (invoiceUrl, groupUrl, meetingUrl,
// calendarUrl, date, joiningNote) has that problem.
//
// Not nestable, deliberately: this is copy for four short emails, not a
// template language, and a backreference match is something a reader can
// verify at a glance.
const BLOCK_RE = /\{\?(\w+)\}([\s\S]*?)\{\/\1\}\n?/g;
const ORPHAN_MARKER_RE = /\{[?/]\w+\}/g;
const TOKEN_RE = /\{(\w+)\}/g;

function hasValue(values: PlaceholderValues, key: string): boolean {
  const v = values[key as PlaceholderKey];
  return typeof v === "string" && v.trim() !== "";
}

/**
 * Flat {token} substitution plus {?token}…{/token} optional blocks.
 *
 * `escape` is true only for the HTML body pass — the surrounding
 * admin-authored template text is trusted, but every interpolated value
 * (buyer name, email, item title, …) is escaped there so a crafted
 * buyer-supplied value can't inject markup into the email.
 */
export function substitute(template: string, values: PlaceholderValues, escape: boolean): string {
  // Blocks first, so a removed block takes its tokens with it.
  const withBlocks = template.replace(BLOCK_RE, (_match, key: string, inner: string) =>
    hasValue(values, key) ? inner : ""
  );

  // A block opened and never closed would otherwise leak "{?groupUrl}"
  // into a customer's inbox. Drop any marker that survived.
  const cleaned = withBlocks.replace(ORPHAN_MARKER_RE, "");

  return cleaned.replace(TOKEN_RE, (_match, key: string) => {
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

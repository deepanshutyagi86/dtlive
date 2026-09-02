// Rendering an admin-edited template into a sendable email.
//
// The copy itself — the defaults, the token list, the substitution rules —
// lives in ./email-copy, which has zero imports so the admin settings form
// can import it too. This module is the SERVER half: it adds the HTML
// wrapper and the sender identity footer, both of which come from ./email
// and pull in the Resend SDK.
//
// Everything ./email-copy exports is re-exported here, so the existing
// server call sites (order-notifications, api/leads) keep their imports.
import { emailHtml, emailTextFooter, type EmailSender } from "./email";
import { substitute, type PlaceholderValues } from "./email-copy";
import type { EmailTemplate } from "./email-copy";

export {
  DEFAULT_EMAIL_COPY,
  EMAIL_TEMPLATE_META,
  PLACEHOLDER_KEYS,
  PLACEHOLDER_HELP,
  resolveTemplate,
  substitute,
} from "./email-copy";
export type {
  EmailCopy,
  EmailTemplate,
  EmailTemplateKey,
  PlaceholderKey,
  PlaceholderValues,
} from "./email-copy";

/**
 * Removes the hole an omitted optional block leaves behind.
 *
 * A block that sat on its own line between two paragraphs leaves three or
 * more consecutive newlines when it is dropped, which the HTML pass then
 * renders as an empty <p>. Collapsing to exactly one blank line is what a
 * reader would have typed, and it also trims the trailing whitespace a
 * block at the very end leaves.
 */
function tidy(body: string): string {
  return body.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
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
  const subject = substitute(template.subject, values, false).replace(/[\r\n]+/g, " ").trim();

  const text = tidy(substitute(template.body, values, false)) + emailTextFooter(sender);

  const htmlBody = tidy(substitute(template.body, values, true))
    .split("\n\n")
    .map((para) => `<p style="margin:0 0 16px;line-height:1.6;">${para.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return { subject, text, html: emailHtml(htmlBody, sender) };
}

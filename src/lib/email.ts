// Thin transactional-email wrapper over Resend. Same no-op pattern as
// sendMetaPurchaseEvent/sendMetaLeadEvent in meta-capi.ts: a missing key is
// a configuration gap, never a reason to fail the request that triggered
// the send, so this warns and returns instead of throwing.
import { Resend } from "resend";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * A real, monitored address a recipient can reply to.
   *
   * Set on every send, deliberately. A transactional message from a
   * subdomain nobody can write back to is one of the signals Gmail reads
   * as machine-generated bulk mail, and a receipt that can't be replied
   * to is bad service anyway — someone whose payment went wrong should be
   * able to hit reply, not hunt for a contact page.
   */
  replyTo?: string;
}

/** Who is sending, in the footer of every email. */
export interface EmailSender {
  tradeName: string;
  address: string;
  email: string;
  phone: string;
  siteUrl: string;
}

// Minimal shared chrome — a bordered card on the site's bone background,
// brand tokens only. Deliberately plain: no template framework, just a
// string.
//
// The FOOTER is not decoration. A very short message carrying a money
// amount and an order id, with no identifiable sender, is structurally
// what a phishing email looks like — and Gmail's stated reason for
// filing these as spam was that they resembled known spam. A real trading
// name, a postal address, a phone number and a link to the site are the
// signals that separate a receipt from a scam, to a filter and to a
// person reading it.
export function emailHtml(bodyHtml: string, sender?: EmailSender): string {
  const footer = sender
    ? `<div style="max-width:480px;margin:16px auto 0;padding:0 8px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8b8a80;">
    <div style="color:#4a4a42;font-weight:600;">${sender.tradeName}</div>
    <div>${sender.address}</div>
    <div>${sender.email} · ${sender.phone}</div>
    <div style="margin-top:6px;"><a href="${sender.siteUrl}" style="color:#8A5A00;">${sender.siteUrl.replace(/^https?:\/\//, "")}</a></div>
    <div style="margin-top:10px;">You're receiving this because you bought or registered for something on this site.</div>
  </div>`
    : "";

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F2F1EC;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #DEDCD2;border-radius:14px;padding:32px;color:#191913;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#8b8a80;margin-bottom:20px;">DT.live</div>
    ${bodyHtml}
  </div>${footer}
</div>`;
}

/** The same footer for the plain-text part. Kept in step with the HTML
 *  one: a message whose text and HTML halves say different things is
 *  itself a spam signal. */
export function emailTextFooter(sender?: EmailSender): string {
  if (!sender) return "";
  return `\n\n—\n${sender.tradeName}\n${sender.address}\n${sender.email} · ${sender.phone}\n${sender.siteUrl}\n\nYou're receiving this because you bought or registered for something on this site.`;
}

/**
 * The result of one attempted send.
 *
 * sendEmail still never throws — a mail failure must not fail a payment
 * that has already been taken. But it now REPORTS, because the previous
 * version swallowed the reason entirely: a real order was paid for, both
 * emails failed, and the only trace was a console line on a serverless
 * function nobody reads. From the outside it looked like the feature had
 * never been built.
 */
export interface SendEmailResult {
  ok: boolean;
  /** Why it failed, in words a human can act on. */
  error?: string;
}

/** Whether email is configured at all — read by the admin diagnostics
 *  page so a missing key is visible before an order depends on it. */
export function emailConfig(): { configured: boolean; from: string | null } {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? null;
  return { configured: Boolean(apiKey && from), from };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    const error = "RESEND_API_KEY or RESEND_FROM is not set on this deployment.";
    console.warn(`Resend: ${error} Skipping email "${input.subject}"`);
    return { ok: false, error };
  }

  const resend = new Resend(apiKey);
  try {
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (error) {
      // Resend's most common rejection by far is an unverified sending
      // domain, and its message says so — so it is passed through rather
      // than flattened into "send failed".
      const message = `${error.name ?? "error"}: ${error.message ?? String(error)}`;
      console.error(`Resend: send failed for "${input.subject}" to ${input.to}:`, error);
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Resend: send request failed for "${input.subject}" to ${input.to}:`, err);
    return { ok: false, error: message };
  }
}

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
}

// Minimal shared chrome — a bordered card on the site's bone background,
// brand tokens only. Table-based for basic email-client compatibility,
// but deliberately plain: no template framework, just a string.
export function emailHtml(bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F2F1EC;padding:32px 16px;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #DEDCD2;border-radius:14px;padding:32px;color:#191913;">
    <div style="font-family:monospace;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;color:#8b8a80;margin-bottom:20px;">DT.live</div>
    ${bodyHtml}
  </div>
</div>`;
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

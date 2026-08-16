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

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.warn(`Resend: RESEND_API_KEY/RESEND_FROM not configured, skipping email "${input.subject}"`);
    return;
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
      console.error(`Resend: send failed for "${input.subject}":`, error);
    }
  } catch (err) {
    console.error(`Resend: send request failed for "${input.subject}":`, err);
  }
}

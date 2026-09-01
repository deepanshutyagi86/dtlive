import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { emailConfig, emailHtml, sendEmail } from "@/lib/email";
import { getNotifyEmail } from "@/lib/items";

/**
 * Sends one real email and reports exactly what happened.
 *
 * This exists because a paid order produced no email and no visible
 * error: sendEmail swallowed the reason, so from the admin panel the
 * feature was indistinguishable from one that had never been built. The
 * cost of finding that out was a real customer not getting a receipt.
 *
 * The single most common cause is a sending domain that isn't verified
 * with Resend — the provider rejects the send and says so, and that
 * message is passed through here verbatim rather than summarised.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { configured, from } = emailConfig();
  if (!configured) {
    return NextResponse.json({
      ok: false,
      error:
        "RESEND_API_KEY or RESEND_FROM is missing on this deployment. Add both in Vercel → Settings → Environment Variables (Production), then redeploy.",
      from,
    });
  }

  let to: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    to = typeof body.to === "string" && body.to.trim() ? body.to.trim() : null;
  } catch {
    /* no body is fine — fall back to the notification address */
  }
  to = to ?? (await getNotifyEmail());

  if (!to) {
    return NextResponse.json({
      ok: false,
      error: "No address to send to. Set one in Emails → Notifications, or type one here.",
      from,
    });
  }

  const stamp = new Date().toISOString();
  const result = await sendEmail({
    to,
    subject: "Test email from DT.live",
    text: `This is a test from your admin panel.\n\nIf you're reading this, order and registration emails will send.\n\nSent ${stamp}\nFrom ${from}`,
    html: emailHtml(
      `<p style="margin:0 0 12px;font-size:16px;">This is a test from your admin panel.</p>
       <p style="margin:0 0 12px;font-size:15px;color:#4a4a42;">If you're reading this, order and registration emails will send.</p>
       <p style="margin:0;font-family:monospace;font-size:12px;color:#8b8a80;">${stamp}<br/>from ${from}</p>`
    ),
  });

  return NextResponse.json({ ...result, to, from });
}

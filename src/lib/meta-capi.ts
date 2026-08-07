// Server-side Meta Conversions API — fires the Purchase event that mirrors
// the browser-side fbq('track', 'Purchase', ...) call on the confirmation
// page. Sharing the same event_id (the order id) across both lets Meta
// deduplicate them into a single conversion.
// Docs: https://developers.facebook.com/docs/marketing-api/conversions-api

import { createHash } from "crypto";
import type { Order, Lead } from "./db";

const GRAPH_VERSION = "v21.0";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hashEmail(email: string): string {
  return sha256(email.trim().toLowerCase());
}

// Meta expects digits only, including country code, no leading '+' or '0's.
// Buyers here are assumed India-based (site charges in INR) unless they
// already typed a country code.
function hashPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return sha256(withCountryCode);
}

export async function sendMetaPurchaseEvent(order: Order): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI: META_PIXEL_ID/META_CAPI_TOKEN not configured, skipping Purchase event");
    return;
  }

  const userData: Record<string, unknown> = {
    em: [hashEmail(order.buyerEmail)],
    ph: [hashPhone(order.buyerPhone)],
  };
  if (order.fbc) userData.fbc = order.fbc;
  if (order.fbp) userData.fbp = order.fbp;
  if (order.clientIp) userData.client_ip_address = order.clientIp;
  if (order.clientUserAgent) userData.client_user_agent = order.clientUserAgent;

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.id,
        action_source: "website",
        event_source_url: order.eventSourceUrl ?? undefined,
        user_data: userData,
        custom_data: {
          value: order.amount / 100,
          currency: "INR",
        },
      },
    ],
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: accessToken }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Meta CAPI Purchase event failed:", res.status, body);
    }
  } catch (err) {
    console.error("Meta CAPI Purchase event request failed:", err);
  }
}

// Fires for free workshop/course registrations — a Lead, never a Purchase.
// Keeping this separate from sendMetaPurchaseEvent (rather than a shared
// "value: 0" call) stops free registrations from polluting the ad
// account's purchase-optimization signal.
export async function sendMetaLeadEvent(lead: Lead): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn("Meta CAPI: META_PIXEL_ID/META_CAPI_TOKEN not configured, skipping Lead event");
    return;
  }

  const userData: Record<string, unknown> = {};
  if (lead.email) userData.em = [hashEmail(lead.email)];
  if (lead.phone) userData.ph = [hashPhone(lead.phone)];
  if (lead.fbc) userData.fbc = lead.fbc;
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.clientIp) userData.client_ip_address = lead.clientIp;
  if (lead.clientUserAgent) userData.client_user_agent = lead.clientUserAgent;

  const payload = {
    data: [
      {
        event_name: "Lead",
        event_time: Math.floor(Date.now() / 1000),
        event_id: lead.id,
        action_source: "website",
        event_source_url: lead.eventSourceUrl ?? undefined,
        user_data: userData,
      },
    ],
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, access_token: accessToken }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Meta CAPI Lead event failed:", res.status, body);
    }
  } catch (err) {
    console.error("Meta CAPI Lead event request failed:", err);
  }
}

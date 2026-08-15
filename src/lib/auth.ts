import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "dt_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s) throw new Error("ADMIN_SESSION_SECRET is not set");
  return s;
}

// Signed token = base64url("email:issuedAtMs").hmac — no external session
// store needed for a single admin user. The timestamp is inside the signed
// payload (not just the cookie's maxAge) so a captured token actually
// stops working after SESSION_MAX_AGE instead of living forever.
function sign(email: string) {
  const payload = `${email}:${Date.now()}`;
  const hmac = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${hmac}`;
}

function verify(token: string): string | null {
  const [b64, hmac] = token.split(".");
  if (!b64 || !hmac) return null;

  const payload = Buffer.from(b64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");

  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  // Split on the LAST colon — email addresses can't contain one, but this
  // is robust regardless.
  const idx = payload.lastIndexOf(":");
  if (idx === -1) return null;

  const email = payload.slice(0, idx);
  const issuedAt = Number(payload.slice(idx + 1));
  if (!email || !Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > SESSION_MAX_AGE * 1000) return null;

  return email;
}

export async function verifyPassword(plain: string) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) throw new Error("ADMIN_PASSWORD_HASH is not set");
  return bcrypt.compare(plain, hash);
}

export function createSessionCookieValue(email: string) {
  return sign(email);
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE;

export async function getAdminSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verify(token);
}

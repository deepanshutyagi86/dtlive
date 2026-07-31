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

// Signed token = base64(email).hmac  — no external session store needed
// for a single admin user. Good enough for v1; swap for NextAuth/Lucia
// later if you ever add more than one admin.
function sign(email: string) {
  const hmac = crypto.createHmac("sha256", secret()).update(email).digest("hex");
  return `${Buffer.from(email).toString("base64url")}.${hmac}`;
}

function verify(token: string): string | null {
  const [b64, hmac] = token.split(".");
  if (!b64 || !hmac) return null;
  const email = Buffer.from(b64, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret()).update(email).digest("hex");
  const a = Buffer.from(hmac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
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

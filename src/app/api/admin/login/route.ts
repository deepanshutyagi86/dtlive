import { NextRequest, NextResponse } from "next/server";
import { createSessionCookieValue, verifyPassword, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`login:${clientIpFrom(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const { email, password } = await req.json();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!email || !password || email !== adminEmail) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const ok = await verifyPassword(password);
  if (!ok) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionCookieValue(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}

import { NextRequest, NextResponse } from "next/server";

// Lightweight gate: just checks the cookie is present (Edge runtime can't
// use Node's `crypto` module for the full HMAC check). The (dashboard)
// layout and every admin API route re-verify the signature server-side via
// getAdminSession() before doing anything real, so this is a fast redirect,
// not the real lock.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const hasCookie = req.cookies.has("dt_admin_session");
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

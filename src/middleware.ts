import { NextRequest, NextResponse } from "next/server";

const PORTFOLIO_ORIGIN = "https://deepanshu-one.vercel.app";

// Lightweight gate: just checks the cookie is present (Edge runtime can't
// use Node's `crypto` module for the full HMAC check). The (dashboard)
// layout and every admin API route re-verify the signature server-side via
// getAdminSession() before doing anything real, so this is a fast redirect,
// not the real lock.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Proxy /portfolio to the standalone portfolio deployment so it renders
  // under this domain instead of visitors landing on deepanshu-one.vercel.app.
  // This has to be exact-pathname string matching, not a next.config.js
  // redirects()/rewrites() `source` (see next.config.js for why): the
  // portfolio's own HTML references its assets with relative paths
  // ("assets/images/..."), so "/portfolio" vs "/portfolio/" has to be exactly
  // right or every image 404s.
  if (pathname === "/portfolio") {
    // A plain URL, not req.nextUrl.clone(): NextURL silently re-strips the
    // trailing slash we're about to add, per the site's default
    // trailingSlash:false, even with skipTrailingSlashRedirect set — that
    // only suppresses the *automatic* redirect, not NextURL's own
    // normalization of a pathname we set ourselves.
    const url = new URL(req.url);
    url.pathname = "/portfolio/";
    return NextResponse.redirect(url, 308);
  }
  if (pathname === "/portfolio/" || pathname.startsWith("/portfolio/")) {
    const target = new URL(PORTFOLIO_ORIGIN);
    target.pathname = pathname.slice("/portfolio".length);
    target.search = req.nextUrl.search;
    return NextResponse.rewrite(target);
  }

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
  matcher: ["/admin", "/admin/:path*", "/portfolio", "/portfolio/:path*"],
};

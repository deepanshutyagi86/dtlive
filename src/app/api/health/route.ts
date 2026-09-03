import { NextResponse } from "next/server";
import { META_PIXEL_ID_CLIENT, META_PIXEL_ID_SERVER } from "@/lib/meta-config";

// Public, unauthenticated diagnostic endpoint — see DEPLOY.md.
//
// The one thing this repo could never answer in one request before: "what
// commit is actually live, and is the Meta Pixel wired correctly?" Every
// prior stale-deploy incident (env var reached production, code didn't;
// Meta Pixel work committed for two sessions and never once served) would
// have been caught immediately by comparing this endpoint's `commit`
// against `git rev-parse --short HEAD` — that comparison is now
// npm run verify:live / verify:local.
//
// force-dynamic: this must reflect the RUNNING deployment's env at request
// time, never a value baked into a cached response. A stale health check
// is worse than no health check — it's a health check that lies.
export const dynamic = "force-dynamic";

function last4(id: string): string {
  return id ? id.slice(-4) : "";
}

export async function GET() {
  const clientId = META_PIXEL_ID_CLIENT;
  const serverId = META_PIXEL_ID_SERVER;

  const body = {
    commit: process.env.NEXT_PUBLIC_COMMIT_SHA ?? "local",
    builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? null,
    env: process.env.VERCEL_ENV ?? "development",
    pixel: {
      clientIdSet: !!clientId,
      serverIdSet: !!serverId,
      // The dedup-killer check: if both are set but disagree, Meta cannot
      // match a browser Purchase to its server-side CAPI mirror by
      // event_id, and BOTH get counted. See src/lib/meta-config.ts.
      idsMatch: !!clientId && !!serverId && clientId === serverId,
      // Never the full ID — just enough to eyeball "yes, that's the new
      // one" against Events Manager without exposing it wholesale.
      idSuffix: last4(clientId || serverId),
    },
    capi: {
      tokenSet: !!process.env.META_CAPI_TOKEN,
    },
    razorpay: {
      keyIdSet: !!process.env.RAZORPAY_KEY_ID,
      secretSet: !!process.env.RAZORPAY_KEY_SECRET,
      webhookSecretSet: !!process.env.RAZORPAY_WEBHOOK_SECRET,
    },
    db: {
      urlSet: !!process.env.DATABASE_URL,
    },
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

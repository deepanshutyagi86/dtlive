import LiveSessionView, { liveMetadata } from "./LiveSessionView";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// /live is an alias for whichever session is marked active — the link you
// put in a bio or an ad and never have to change between webinars.
export async function generateMetadata(): Promise<Metadata> {
  return liveMetadata();
}

export default async function LivePage() {
  return <LiveSessionView />;
}

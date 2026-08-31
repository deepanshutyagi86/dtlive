import LiveSessionView, { liveMetadata } from "../LiveSessionView";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

// The permanent URL for one specific webinar. Still works after the
// session stops being the active one, which is what turns a finished
// webinar into a replay page rather than a dead link.
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  return liveMetadata(params.slug);
}

export default async function LiveSlugPage({ params }: { params: { slug: string } }) {
  return <LiveSessionView slug={params.slug} />;
}

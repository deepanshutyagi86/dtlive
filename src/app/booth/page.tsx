import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import BoothRoom from "@/components/booth/BoothRoom";
import { isOptimisableImage } from "@/lib/image-hosts";
import { parsePlaylistId } from "@/lib/booth";
import { getSetting } from "@/lib/items";
import { activeSet, getBio, getBoothSettings, getNav, SITE_URL } from "@/lib/site-settings";
import { getPlaylistTimeline } from "@/lib/youtube";

// Never static: the whole point is that "now" is read fresh on every
// request so a visitor's position is computed against the real clock, not
// baked into a build.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const booth = await getBoothSettings();
  const set = activeSet(booth);
  if (!booth.enabled || !set) return {};
  return {
    title: booth.heading,
    description: booth.blurb,
    alternates: { canonical: "/booth" },
    openGraph: {
      type: "website",
      title: booth.heading,
      description: booth.blurb,
      url: `${SITE_URL}/booth`,
    },
  };
}

export default async function BoothPage() {
  const [booth, footerLinks, nav, bio] = await Promise.all([
    getBoothSettings(),
    getSetting<FooterLinks>("footerLinks", {}),
    getNav(),
    getBio(),
  ]);

  // Same question the nav link and generateMetadata already asked: a
  // reachable /booth must never disagree with activeSet() about whether
  // there's a room here.
  const set = activeSet(booth);
  if (!booth.enabled || !set) notFound();

  // activeSet() already guarantees this parses — re-parsing here just gets
  // the actual ID string rather than re-deriving "is it live" logic.
  const playlistId = parsePlaylistId(set.youtubePlaylistUrl)!;

  // Captured once, here, and handed to the client as a prop — the client
  // corrects for the gap to its own clock rather than trusting its own
  // Date.now() outright. See BoothRoom.tsx.
  const serverNowMs = Date.now();

  // PATH B, if a key is configured: real per-track durations + titles,
  // cached in lib/youtube.ts so this never hits the API on every render.
  // A null here is a normal state (no key, or a failed fetch) — the client
  // falls back to PATH A's deterministic approximation entirely on its own.
  const timeline = await getPlaylistTimeline(playlistId);
  const durations = timeline ? timeline.tracks.map((t) => t.durationSec) : null;
  const titles = timeline ? timeline.tracks.map((t) => t.title) : set.tracklist.length > 0 ? set.tracklist : null;

  return (
    <>
      <Nav nav={nav} />

      <BoothRoom
        heading={booth.heading}
        blurb={booth.blurb}
        serverNowMs={serverNowMs}
        startedAtIso={set.startedAtIso}
        avgTrackSec={set.avgTrackSec}
        bpm={set.bpm}
        playlistId={playlistId}
        setTitle={set.title}
        durations={durations}
        titles={titles}
      />

      {booth.gearImageUrl && (
        <section className="max-w-[1100px] mx-auto px-5 py-24">
          <div className="relative w-full aspect-[16/9] rounded-card overflow-hidden border border-line bg-card">
            <Image
              src={booth.gearImageUrl}
              alt={booth.gearCaption || ""}
              fill
              sizes="(min-width: 1100px) 1100px, 100vw"
              unoptimized={!isOptimisableImage(booth.gearImageUrl)}
              className="object-cover"
            />
          </div>
          {booth.gearCaption && <p className="mt-3 text-sm text-muted">{booth.gearCaption}</p>}
        </section>
      )}

      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

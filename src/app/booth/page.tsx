import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import BoothScene from "@/components/booth/BoothScene";
import BoothRoom from "@/components/booth/BoothRoom";
import { isOptimisableImage } from "@/lib/image-hosts";
import { mixcloudEmbedSrc, parseTracklist } from "@/lib/booth";
import { getSetting } from "@/lib/items";
import { activeMix, getBio, getBoothSettings, getNav, SITE_URL } from "@/lib/site-settings";

// Never static: the whole point is that "now" is read fresh on every
// request so a visitor's position is computed against the real clock, not
// baked into a build.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const booth = await getBoothSettings();
  const mix = activeMix(booth);
  if (!booth.enabled || !mix) return {};
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
  // reachable /booth must never disagree with activeMix() about whether
  // there's a room here.
  const mix = activeMix(booth);
  if (!booth.enabled || !mix) notFound();

  // Captured once, here, and handed to the client as a prop — the client
  // corrects for the gap to its own clock rather than trusting its own
  // Date.now() outright. See BoothRoom.tsx.
  const serverNowMs = Date.now();
  const tracks = parseTracklist(mix.tracklist);
  const embedSrc = mixcloudEmbedSrc(mix.mixcloudUrl);

  return (
    <>
      <Nav nav={nav} />

      {/* The one place on the site that goes near-black — deliberate
          rupture, marigold stays the accent. data-nav-dark flips the sticky
          bar dark the same way Footer and the item page's closed CTA
          already do; no second mechanism needed. */}
      <section data-nav-dark className="relative min-h-[560px] bg-[#08080B] text-white overflow-hidden">
        <BoothScene bpm={mix.bpm} />
        <div className="relative z-[1] max-w-[900px] mx-auto px-5 pt-[150px] pb-24 text-center">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/60 mb-3">
            Deepanshu Tyagi Live
          </p>
          <h1 className="font-display font-extrabold text-[42px] md:text-[72px] tracking-tight leading-[1.02]">
            {booth.heading}
          </h1>
          <p className="mt-4 max-w-[520px] mx-auto text-[17px] leading-relaxed text-white/70">{booth.blurb}</p>
        </div>
      </section>

      <BoothRoom
        serverNowMs={serverNowMs}
        startedAtIso={mix.startedAtIso}
        durationSec={mix.durationSec}
        tracks={tracks}
        mixTitle={mix.title}
        embedSrc={embedSrc}
      />

      {booth.gearImageUrl && (
        <section className="max-w-[1100px] mx-auto px-5 pb-24">
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

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Footer, { FooterLinks } from "@/components/Footer";
import LiveBoard from "@/components/live/LiveBoard";
import { getItemById, getSetting } from "@/lib/items";
import {
  getBusinessSettings,
  getLiveSettings,
  getTaxSettingsForDisplay,
  SITE_URL,
} from "@/lib/site-settings";
import { activeLiveSession, liveSessionBySlug, type LiveSession } from "@/lib/settings-types";
import { publicLiveSession } from "@/lib/live-public";
import { DEFAULT_REGISTRATION_FIELDS, type RegistrationField } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";
import type { Metadata } from "next";

// Nothing on this page may be cached. Its entire reason for existing is
// that it changes while people are looking at it.
export const dynamic = "force-dynamic";

/** Shared by /live and /live/[slug] so the two can never drift apart. */
export async function resolveSession(slug?: string): Promise<{ session: LiveSession; holdingLine: string }> {
  const settings = await getLiveSettings();
  const session = slug ? liveSessionBySlug(settings, slug) : activeLiveSession(settings);
  // Covers the master switch being off, an unknown slug, and /live with no
  // session marked active. All three are "there is no webinar page here".
  if (!session) notFound();
  return { session, holdingLine: settings.holdingLine };
}

export async function liveMetadata(slug?: string): Promise<Metadata> {
  const settings = await getLiveSettings();
  const session = slug ? liveSessionBySlug(settings, slug) : activeLiveSession(settings);
  if (!session) return {};
  return {
    title: session.title,
    description: session.subtitle,
    alternates: { canonical: `/live/${session.slug}` },
    // A webinar page is pasted into WhatsApp and Instagram far more than
    // it is found in a search result, so the card matters and the index
    // does not. noindex also keeps a finished webinar's prices out of
    // Google long after the room has emptied.
    robots: { index: false, follow: true },
    openGraph: {
      type: "website",
      title: session.title,
      description: session.subtitle,
      url: `${SITE_URL}/live/${session.slug}`,
      images: session.heroImageUrl ? [session.heroImageUrl] : [],
    },
  };
}

function formatStart(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: SITE_TZ,
    }) + " IST"
  );
}

export default async function LiveSessionView({ slug }: { slug?: string }) {
  const { session, holdingLine } = await resolveSession(slug);

  const [publicSession, tax, business, footerLinks] = await Promise.all([
    publicLiveSession(session, holdingLine),
    getTaxSettingsForDisplay(),
    getBusinessSettings(),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);

  // Resolved here rather than inside LiveBoard: the registration form's
  // shape lives in each item's details, and a client component cannot
  // read the database. Only the currently-visible blocks are looked up,
  // so a hidden block leaks nothing, not even its item's form.
  const registrationFields: Record<string, RegistrationField[] | undefined> = {};
  await Promise.all(
    publicSession.blocks
      .filter((b) => b.kind === "register")
      .map(async (b) => {
        const item = await getItemById(b.itemId);
        const fields = (item?.details as { registrationFields?: RegistrationField[] })?.registrationFields;
        registrationFields[b.itemId] = fields && fields.length > 0 ? fields : DEFAULT_REGISTRATION_FIELDS;
      })
  );

  const startLabel = session.startsAtIso ? formatStart(session.startsAtIso) : "";

  return (
    <>
      {/* No <Nav>. This page has one job and every link off it is a way to
          not do that job — the logo goes home and nothing else leaves. */}
      <header className="border-b border-ink">
        <div className="max-w-[1100px] mx-auto px-5 md:px-8 h-[64px] flex items-center justify-between">
          <Link href="/" className="font-display font-extrabold text-[17px]">
            DT<span className="text-marigold-ink">.live</span>
          </Link>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-live-ink">
            <span className="w-2 h-2 rounded-full bg-live live-dot" />
            LIVE
          </span>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-5 md:px-8 py-12 md:py-16">
        {session.heroImageUrl && (
          <div className="relative w-full aspect-[16/7] rounded-card overflow-hidden border border-ink mb-9">
            <Image
              src={session.heroImageUrl}
              alt=""
              fill
              priority
              sizes="(max-width: 1100px) 100vw, 1100px"
              className="object-cover"
              style={
                session.imageFocal
                  ? { objectPosition: `${session.imageFocal.x}% ${session.imageFocal.y}%` }
                  : undefined
              }
            />
          </div>
        )}

        <h1 className="font-display font-extrabold text-[38px] md:text-[60px] tracking-tight leading-[1.03]">
          {session.title}
        </h1>
        {session.subtitle && (
          <p className="text-[18px] leading-relaxed text-ink-soft mt-4 max-w-[640px]">{session.subtitle}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          {startLabel && (
            <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">{startLabel}</span>
          )}
          {session.joinUrl && (
            <a
              href={session.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full hover:bg-ink hover:text-bone transition-colors"
            >
              Join the room →
            </a>
          )}
        </div>

        <div className="mt-12">
          <LiveBoard
            initial={publicSession}
            tax={tax}
            gstin={business.gstin}
            registrationFields={registrationFields}
          />
        </div>
      </main>

      <Footer links={footerLinks} />
    </>
  );
}

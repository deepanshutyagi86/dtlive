"use client";
import { useEffect, useState } from "react";
import { boothPosition, currentTrack, formatTimecode, type BoothTrack } from "@/lib/booth";

// This is what makes the clock visible. Without a running timecode and a
// highlighted current track, the sync is invisible and the whole "everyone
// drops in at the same second" idea is lost on a visitor — they'd have no
// way to tell this room isn't just a player that happened to autoplay.
export default function BoothRoom({
  serverNowMs,
  startedAtIso,
  durationSec,
  tracks,
  mixTitle,
  embedSrc,
}: {
  serverNowMs: number;
  startedAtIso: string;
  durationSec: number;
  tracks: BoothTrack[];
  mixTitle: string;
  embedSrc: string | null;
}) {
  // Anchored once at hydration, not read fresh from Date.now() every tick:
  // a visitor's device clock is wrong by minutes surprisingly often, so
  // this corrects for the one-time gap to the server's clock and then
  // ticks forward on the client's own timer from that anchor. Two visitors
  // with clocks 10 minutes apart still land on the same second.
  const [offsetMs] = useState(() => serverNowMs - Date.now());
  const [now, setNow] = useState(() => Date.now() + offsetMs);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offsetMs), 1000);
    return () => clearInterval(id);
  }, [offsetMs]);

  // null covers a bad startedAt, a non-positive duration, or a start time
  // still in the future — "not running" rather than a divide-by-zero or a
  // negative timecode on screen.
  const position = boothPosition(startedAtIso, durationSec, now);
  const playing = position !== null ? currentTrack(tracks, position) : null;

  return (
    <main className="max-w-[1100px] mx-auto px-5 py-14">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6 mb-8">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Now playing</p>
          {position !== null ? (
            <p className="font-display font-bold text-2xl">{playing ? playing.label : mixTitle}</p>
          ) : (
            <p className="font-display font-bold text-2xl text-muted">The room&apos;s quiet right now.</p>
          )}
        </div>
        {position !== null && (
          <div className="flex items-center gap-2 font-mono text-[13px] text-muted" aria-live="off">
            <span className="w-[7px] h-[7px] rounded-full bg-live live-dot" aria-hidden />
            <span>{formatTimecode(position)}</span>
            <span>/ {formatTimecode(durationSec)}</span>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div>
          {embedSrc ? (
            <div className="rounded-card overflow-hidden border border-line">
              {/* Someone presses play themselves — browsers block autoplay,
                  and this codebase doesn't try to fight that. */}
              <iframe
                title={mixTitle}
                src={embedSrc}
                width="100%"
                height="120"
                className="block w-full border-0"
                allow="autoplay"
              />
            </div>
          ) : (
            <p className="text-sm text-muted">This mix&apos;s Mixcloud link isn&apos;t a valid URL, so there&apos;s nothing to embed here.</p>
          )}
        </div>

        <aside>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-3">Tracklist</p>
          {tracks.length === 0 ? (
            <p className="text-sm text-muted">No tracklist yet.</p>
          ) : (
            <ol className="space-y-1 max-h-[420px] overflow-y-auto pr-2">
              {tracks.map((t) => {
                const isCurrent = playing === t;
                return (
                  <li
                    key={`${t.atSec}-${t.label}`}
                    className={`flex gap-3 text-sm py-1.5 px-2 rounded-[8px] ${
                      isCurrent ? "bg-marigold/15 text-ink font-semibold" : "text-ink-soft"
                    }`}
                  >
                    <span className="font-mono text-[11px] text-muted shrink-0 pt-[1px]">{formatTimecode(t.atSec)}</span>
                    <span>{t.label}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </aside>
      </div>
    </main>
  );
}

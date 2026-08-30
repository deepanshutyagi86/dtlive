"use client";
import { useEffect, useRef, useState } from "react";
import { computeDeterministicSlot, computeTimelinePosition, formatTimecode } from "@/lib/booth";
import BoothScene, { paletteForScene } from "./BoothScene";

// The screen IS the room now — a framed YouTube playlist embed lighting a
// dark space, not a hidden audio source with a pretend visualiser bolted
// on beside it. BoothScene's beams live in the same section as the
// monitor (not a separate hero above a plain embed) so they can actually
// read as light around a source rather than decoration behind some text.
//
// The YouTube IFrame Player API (loadPlaylist/playVideoAt/seekTo/
// onStateChange) is what makes the clock-sync idea actually work here:
// unlike the Mixcloud widget this replaced, there's a documented, reliable
// way to land everyone on the same video at the same second.

interface BoothRoomProps {
  heading: string;
  blurb: string;
  serverNowMs: number;
  startedAtIso: string;
  avgTrackSec: number;
  bpm: number;
  playlistId: string;
  setTitle: string;
  /** Path B — real per-track durations from the YouTube Data API, in
   *  playlist order. null when there's no YOUTUBE_API_KEY or the fetch
   *  failed, in which case the room falls back to Path A entirely
   *  client-side (see onStateChange below). */
  durations: number[] | null;
  /** Real fetched titles (Path B) or the admin's hand-typed fallback
   *  (Path A) — display only, in playlist order. */
  titles: string[] | null;
}

export default function BoothRoom({
  heading,
  blurb,
  serverNowMs,
  startedAtIso,
  avgTrackSec,
  bpm,
  playlistId,
  setTitle,
  durations,
  titles,
}: BoothRoomProps) {
  // Anchored once at hydration, not read fresh from Date.now() every tick:
  // a visitor's device clock is wrong by minutes surprisingly often, so
  // this corrects for the one-time gap to the server's clock. Everyone who
  // loads the page within the same second computes the same "now".
  const [offsetMs] = useState(() => serverNowMs - Date.now());

  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const jumpedRef = useRef(false); // Path A: has the trackCount-based correction run yet?
  const pendingOffsetRef = useRef<number | null>(null); // Path A: seconds to seek to once duration is known
  const lastIndexRef = useRef<number | null>(null);

  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [nowPlayingTitle, setNowPlayingTitle] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;

    function trySeekToPending(player: YT.Player) {
      if (pendingOffsetRef.current === null) return;
      const dur = player.getDuration();
      if (dur > 0) {
        const clamped = pendingOffsetRef.current > dur ? 0 : pendingOffsetRef.current;
        player.seekTo(clamped, true);
        pendingOffsetRef.current = null;
      }
    }

    function onReady(event: { target: YT.Player }) {
      if (cancelled) return;
      const player = event.target;
      player.mute();
      const correctedNow = Date.now() + offsetMs;

      if (durations && durations.length > 0) {
        // PATH B — exact index/offset already computable, no need to wait
        // for the player to report anything back.
        const slot = computeTimelinePosition(startedAtIso, durations, correctedNow);
        player.loadPlaylist({ list: playlistId, listType: "playlist", index: slot?.index ?? 0, startSeconds: slot?.offsetSec ?? 0 });
        jumpedRef.current = true;
      } else {
        // PATH A — trackCount isn't known until the playlist has actually
        // loaded, so start at the top and correct in onStateChange below
        // once getPlaylist() reports how many videos there are.
        player.loadPlaylist({ list: playlistId, listType: "playlist", index: 0, startSeconds: 0 });
        jumpedRef.current = false;
      }
      setReady(true);
    }

    function onStateChange(event: YT.OnStateChangeEvent) {
      if (cancelled) return;
      const player = event.target;
      if (event.data !== 1 /* YT.PlayerState.PLAYING */) return;

      if (!jumpedRef.current) {
        const list = player.getPlaylist();
        if (list && list.length > 0) {
          jumpedRef.current = true;
          const correctedNow = Date.now() + offsetMs;
          const slot = computeDeterministicSlot(startedAtIso, avgTrackSec, list.length, correctedNow);
          if (slot) {
            pendingOffsetRef.current = slot.offsetSec;
            if (slot.index !== 0) player.playVideoAt(slot.index);
          }
        }
      }
      trySeekToPending(player);

      const idx = player.getPlaylistIndex();
      if (idx !== lastIndexRef.current) {
        lastIndexRef.current = idx;
        setTrackIndex(idx);
      }
      setNowPlayingTitle(player.getVideoData()?.title || null);
    }

    function onAutoplayBlocked() {
      if (!cancelled) setBlocked(true);
    }

    function createPlayer() {
      if (cancelled || !mountRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(mountRef.current, {
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 1,
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: { onReady, onStateChange, onAutoplayBlocked },
      });
    }

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        createPlayer();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // playlistId/startedAtIso/avgTrackSec/durations are a fresh page load's
    // worth of server-computed constants, not client-editable state — this
    // effect is deliberately a one-time setup, mirroring how the room only
    // ever re-anchors on a real navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polls the player's own clock rather than deriving the timecode purely
  // from Date.now() — after a seek/clamp this is what's actually true,
  // where the deterministic math is only ever an approximation.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const player = playerRef.current;
      if (!player) return;
      setCurrentTime(player.getCurrentTime());
      setDuration(player.getDuration());
    }, 1000);
    return () => clearInterval(id);
  }, [ready]);

  function turnItUp() {
    playerRef.current?.unMute();
    setMuted(false);
  }

  function pressPlay() {
    playerRef.current?.playVideo();
    setBlocked(false);
  }

  const displayTitle = nowPlayingTitle || titles?.[trackIndex] || setTitle;
  const glowColor = paletteForScene(trackIndex)[0];

  return (
    // The one place on the site that goes near-black — deliberate rupture,
    // marigold stays the accent. data-nav-dark flips the sticky bar dark
    // the same way Footer and the item page's closed CTA already do.
    <section data-nav-dark className="relative bg-[#08080B] text-white overflow-hidden">
      <BoothScene bpm={bpm} sceneIndex={trackIndex} />

      <div className="relative z-[1] max-w-[1100px] mx-auto px-5 pt-[130px] md:pt-[150px] pb-20">
        <div className="text-center mb-10">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/60 mb-3">Deepanshu Tyagi Live</p>
          <h1 className="font-display font-extrabold text-[36px] md:text-[56px] tracking-tight leading-[1.02]">{heading}</h1>
          <p className="mt-3 max-w-[520px] mx-auto text-[15px] md:text-[17px] leading-relaxed text-white/70">{blurb}</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_300px] gap-8 items-start">
          <div>
            <div className="relative">
              {/* Light spilling off the screen into the room around it — a
                  blurred field of the current scene's colour, sized past
                  the bezel's own edges, crossfading whenever the playlist
                  advances to a new track. */}
              <div
                aria-hidden
                className="absolute -inset-8 md:-inset-14 rounded-[48px] blur-[70px] opacity-60 transition-colors duration-700 ease-out pointer-events-none"
                style={{ backgroundColor: glowColor }}
              />

              {/* The monitor: a dark bezel around the actual screen,
                  sitting in the room rather than a bare full-bleed embed. */}
              <div className="relative rounded-[20px] bg-gradient-to-b from-[#232228] to-[#0c0c0f] p-3 md:p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_40px_90px_-25px_rgba(0,0,0,0.9)]">
                <div className="relative w-full aspect-video rounded-[10px] overflow-hidden bg-black [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full">
                  <div ref={mountRef} />

                  {blocked && (
                    <button
                      type="button"
                      onClick={pressPlay}
                      className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-white text-sm font-semibold gap-2 hover:bg-black/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold"
                    >
                      <span aria-hidden>▶</span> Press play
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-white/50 mb-1">Now playing</p>
                <p className="font-display font-bold text-lg">{displayTitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {ready && (
                  <div className="flex items-center gap-2 font-mono text-[13px] text-white/60" aria-live="off">
                    <span className="w-[7px] h-[7px] rounded-full bg-live live-dot" aria-hidden />
                    <span>{formatTimecode(currentTime)}</span>
                    {duration > 0 && <span>/ {formatTimecode(duration)}</span>}
                  </div>
                )}
                {muted && ready && !blocked && (
                  <button
                    type="button"
                    onClick={turnItUp}
                    className="inline-flex items-center gap-2 bg-marigold text-ink font-display font-bold text-sm px-5 py-2.5 rounded-full hover:brightness-105 transition-[filter] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    <span aria-hidden>🔊</span> Turn it up
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside>
            <p className="font-mono text-[11px] uppercase tracking-wider text-white/50 mb-3">Tracklist</p>
            {!titles || titles.length === 0 ? (
              <p className="text-sm text-white/50">No tracklist yet.</p>
            ) : (
              <ol className="space-y-1 max-h-[420px] overflow-y-auto pr-2">
                {titles.map((title, i) => {
                  const isCurrent = i === trackIndex;
                  return (
                    <li
                      key={`${i}-${title}`}
                      className={`flex gap-3 text-sm py-1.5 px-2 rounded-[8px] ${
                        isCurrent ? "bg-marigold/15 text-white font-semibold" : "text-white/60"
                      }`}
                    >
                      <span className="font-mono text-[11px] text-white/40 shrink-0 pt-[1px] w-5 text-right">{i + 1}</span>
                      <span>{title}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}

// Turns whatever URL was pasted into the admin panel into something a
// browser can actually play.
//
// Deliberately dependency-free and pure, like validate.ts: OverviewVideo
// is a client component, so anything it imports has to stay out of the
// server bundle, and a parser this fiddly earns unit tests (see
// __tests__/video.test.ts).
//
// Three hosts are supported on purpose, in this order of preference:
//
//   youtube - the recommendation. Free, adaptive bitrate, so it plays on
//             a weak mobile connection instead of buffering. Upload the
//             file as UNLISTED, not private: private means nobody but the
//             uploading account can watch it, which is the single most
//             common way this gets set up wrong.
//   drive   - works, but Drive throttles a file that suddenly gets a lot
//             of views and its player can't be styled. Fine to start with.
//   file    - a direct .mp4/.webm URL (Vercel Blob, S3, anywhere). Plays
//             in a native <video> element. No adaptive quality: one big
//             file, so keep it small.
//
// An unrecognised URL returns null and every call site renders nothing
// rather than an empty black box.

export type VideoKind = "youtube" | "drive" | "file";

export interface ParsedVideo {
  kind: VideoKind;
  /** Goes straight into an <iframe src> (youtube/drive) or <video src> (file). */
  embedUrl: string;
  /** YouTube only - used as the poster frame on the play button. */
  posterUrl?: string;
}

/** Bare 11-character YouTube video id. */
const YT_ID = /^[\w-]{11}$/;

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");

  // youtu.be/VIDEOID
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YT_ID.test(id) ? id : null;
  }

  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }

  // youtube.com/watch?v=VIDEOID
  const v = url.searchParams.get("v");
  if (v && YT_ID.test(v)) return v;

  // youtube.com/embed/VIDEOID, /shorts/VIDEOID, /live/VIDEOID, /v/VIDEOID
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length >= 2 && ["embed", "shorts", "live", "v"].includes(parts[0])) {
    return YT_ID.test(parts[1]) ? parts[1] : null;
  }

  return null;
}

function driveId(url: URL): string | null {
  if (!url.hostname.replace(/^www\./, "").endsWith("drive.google.com")) return null;

  // drive.google.com/file/d/FILEID/view
  const parts = url.pathname.split("/").filter(Boolean);
  const dIndex = parts.indexOf("d");
  if (dIndex !== -1 && parts[dIndex + 1]) return parts[dIndex + 1];

  // drive.google.com/open?id=FILEID  and  /uc?id=FILEID
  const id = url.searchParams.get("id");
  return id || null;
}

export function parseVideoUrl(raw: string | undefined | null): ParsedVideo | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;

  // A bare video id pasted on its own is the most likely thing to be typed
  // by hand, and it is unambiguous, so accept it rather than failing.
  if (YT_ID.test(trimmed)) {
    return {
      kind: "youtube",
      embedUrl: youtubeEmbed(trimmed),
      posterUrl: `https://i.ytimg.com/vi/${trimmed}/maxresdefault.jpg`,
    };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Only ever hand an https URL to an iframe or a video element. A
  // pasted http:// link would be blocked as mixed content on a page the
  // site serves over TLS, and the failure is silent.
  if (url.protocol !== "https:") return null;

  const yt = youtubeId(url);
  if (yt) {
    return {
      kind: "youtube",
      embedUrl: youtubeEmbed(yt),
      posterUrl: `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`,
    };
  }

  const drive = driveId(url);
  if (drive) {
    return { kind: "drive", embedUrl: `https://drive.google.com/file/d/${drive}/preview` };
  }

  if (/\.(mp4|webm|mov|m4v)$/i.test(url.pathname)) {
    return { kind: "file", embedUrl: url.toString() };
  }

  return null;
}

// youtube-nocookie.com, and modestbranding/rel=0 so the end of the video
// doesn't hand the viewer a wall of somebody else's thumbnails on a page
// whose whole job is selling this course.
//
// autoplay=1 is safe here specifically because the iframe is only mounted
// after a click - the browser's autoplay policy counts that click as the
// user gesture, and nothing plays on page load.
function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
}

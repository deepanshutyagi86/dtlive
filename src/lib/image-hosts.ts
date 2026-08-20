// Which hosts the Next image optimiser is allowed to fetch from. This list
// MUST stay in sync with `images.remotePatterns` in next.config.js — that
// config is the security boundary (it stops anyone pointing /_next/image at
// an arbitrary URL and billing the transformations to this project), and
// this function is how the app avoids crashing on a URL that boundary
// rejects.
//
// Without it, one legacy thumbnail on a non-Blob host throws
// "Invalid src prop … hostname is not configured" and takes down the whole
// page it appears on — not just that image. Rendering it unoptimised
// instead is strictly better: the picture still loads, and because the
// optimiser is never invoked there is no quota to burn.
const OPTIMISABLE_HOST_SUFFIX = ".public.blob.vercel-storage.com";

export function isOptimisableImage(src: string | null | undefined): boolean {
  if (!src) return false;
  // A relative path is served by this app itself and is always fine.
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return url.hostname.endsWith(OPTIMISABLE_HOST_SUFFIX);
  } catch {
    return false;
  }
}

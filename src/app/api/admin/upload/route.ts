import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

// Compression happens client-side and could be bypassed by a crafted
// request straight to this route — 8MB is generous headroom above the
// ~1600px WebP output the client actually produces, but still a hard
// server-side ceiling regardless of what the client claims to have sent.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
// PDFs aren't compressed client-side (there's nothing safe to strip from
// someone's designed guide), so this ceiling is the real one a print-heavy
// PDF has to fit under.
const MAX_PDF_BYTES = 25 * 1024 * 1024;
// The only prefix that unlocks the PDF content type. Anything else keeps
// the original image-only rules, so widening this route for guides can't
// turn the item thumbnail uploader into an arbitrary-file uploader.
const GUIDE_PREFIX = "guides/";
// The per-item syllabus PDF. A second prefix rather than widening the
// guides one, so the blob store still says which surface a file belongs to
// and either can be locked down later without touching the other.
const SYLLABUS_PREFIX = "syllabus/";
// Branding assets (favicon, touch icon, link-preview card, signature) are
// images and keep the image rules — the prefix exists so the pathname is
// self-documenting in the blob store, not to unlock anything.
const BRANDING_PREFIX = "branding/";
// The promo film uploaded straight to the site rather than to YouTube.
// Its own prefix so video can be unlocked HERE and nowhere else — the
// item thumbnail uploader must not become an arbitrary-file uploader.
const VIDEO_PREFIX = "promo/";
// Deliberately tight. Blob egress is billed per GB, and a promo film is
// watched by every visitor to the page: a 30-second clip at this ceiling
// is fine, a five-minute one is a bill. Anything longer belongs on
// YouTube, which is free and adaptive — the URL field accepts that.
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Without this, anyone on the internet who finds this route can
        // upload arbitrary files into the store until the quota is dead —
        // no token is issued unless there's a verified admin session.
        const admin = await getAdminSession();
        if (!admin) {
          throw new Error("Unauthorized");
        }

        // Only the guides prefix unlocks PDFs. Branding uploads
        // (BRANDING_PREFIX) are images and deliberately fall through to
        // the image rules below - the prefix exists so the blob store is
        // self-documenting, not to widen what is accepted.
        const isPdf = pathname.startsWith(GUIDE_PREFIX) || pathname.startsWith(SYLLABUS_PREFIX);
        const isVideo = pathname.startsWith(VIDEO_PREFIX);

        if (isVideo) {
          return {
            allowedContentTypes: ["video/mp4", "video/webm", "video/quicktime"],
            maximumSizeInBytes: MAX_VIDEO_BYTES,
            addRandomSuffix: true,
          };
        }

        return {
          allowedContentTypes: isPdf
            ? ["application/pdf"]
            : ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}

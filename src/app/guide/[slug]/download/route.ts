import { NextResponse } from "next/server";
import { getLiveGuideBySlug, type Guide } from "@/lib/guides";

export const dynamic = "force-dynamic";

// Everything that isn't a plain filename character is dropped rather than
// escaped. A Content-Disposition value is a header, so a stray quote or
// newline coming from an admin-typed title is a header-injection vector,
// not just an ugly filename.
function downloadFilename(guide: Guide): string {
  const source = guide.title || guide.fileName || guide.slug;
  const base =
    source
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9 _-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || guide.slug;
  return `${base}.pdf`;
}

// Why proxy instead of redirecting to the blob URL: the blob is stored with
// a random suffix (guides/<slug>-x7f3k2.pdf), so a redirect makes the
// browser save that machine name. Streaming it back lets the visitor get
// "Motion-Graphics-Guide.pdf", and keeps the public link on our own domain
// so the storage URL can change later without breaking anything shared.
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const guide = await getLiveGuideBySlug(params.slug);
  if (!guide) {
    return new NextResponse("Not found", { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(guide.fileUrl, { cache: "no-store" });
  } catch {
    return new NextResponse("Could not fetch that file.", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new NextResponse("Could not fetch that file.", { status: 502 });
  }

  const filename = downloadFilename(guide);
  const headers = new Headers({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    "Cache-Control": "public, max-age=300",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new NextResponse(upstream.body, { headers });
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getAllGuides, saveGuides, slugify, readFocal, type Guide } from "@/lib/guides";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getAllGuides());
}

// The whole list is written at once (it's a single settings row), so the
// client always sends the full array. Everything is re-derived and
// re-validated here rather than trusted: the browser is not the authority
// on slugs, ordering or ids.
export async function PUT(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!Array.isArray(body)) {
    return NextResponse.json({ error: "Expected an array of guides." }, { status: 400 });
  }

  const existing = await getAllGuides();
  const seen = new Set<string>();
  const guides: Guide[] = [];

  for (const raw of body) {
    if (!raw || typeof raw !== "object") continue;
    const g = raw as Record<string, unknown>;

    const title = typeof g.title === "string" ? g.title.trim() : "";
    const fileUrl = typeof g.fileUrl === "string" ? g.fileUrl.trim() : "";

    if (!title) return NextResponse.json({ error: "Every guide needs a title." }, { status: 400 });
    if (!fileUrl) return NextResponse.json({ error: `"${title}" has no PDF attached yet.` }, { status: 400 });

    // A guide URL is a public, shareable link — an http(s) URL is the only
    // thing that can safely end up behind a download redirect or an href.
    let parsed: URL;
    try {
      parsed = new URL(fileUrl);
    } catch {
      return NextResponse.json({ error: `"${title}" has an invalid file URL.` }, { status: 400 });
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: `"${title}" has an invalid file URL.` }, { status: 400 });
    }

    // Blank slug is the normal case for a new guide — derive it from the
    // title. A collision gets a numeric suffix instead of silently
    // overwriting the earlier guide's public URL.
    let slug = slugify(typeof g.slug === "string" && g.slug.trim() ? g.slug : title);
    if (!slug) slug = "guide";
    if (seen.has(slug)) {
      let n = 2;
      while (seen.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    seen.add(slug);

    const cover = typeof g.cover === "string" && g.cover.trim() ? g.cover.trim() : null;
    const id = typeof g.id === "string" && g.id ? g.id : crypto.randomUUID();
    const previous = existing.find((e) => e.id === id);

    guides.push({
      id,
      slug,
      title,
      description: typeof g.description === "string" ? g.description.trim() : "",
      fileUrl,
      fileName: typeof g.fileName === "string" && g.fileName ? g.fileName : `${slug}.pdf`,
      fileSize: typeof g.fileSize === "number" && g.fileSize > 0 ? g.fileSize : 0,
      cover,
      // A focal point without a cover is orphaned state that would silently
      // reapply if a different image were uploaded later — clear it with the
      // image it belonged to.
      coverFocal: cover ? readFocal(g.coverFocal) : null,
      live: g.live !== false,
      // createdAt is the guide's own history, not something the form owns —
      // keep whatever the stored row already had.
      createdAt: previous?.createdAt ?? new Date().toISOString(),
    });
  }

  await saveGuides(guides);
  return NextResponse.json(guides);
}

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { slugify } from "@/lib/guide-utils";
import { listAllItems, createItem, isSlugTaken } from "@/lib/admin-repo";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await listAllItems();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, thumbnail, description, category, live, featured, order, details } = body;

  if (!title || !body.slug || !category) {
    return NextResponse.json({ error: "title, slug and category are required." }, { status: 400 });
  }

  // The server owns the slug, not the form. An admin-typed "Claude-01"
  // produced a URL that 404s at /items/claude-01, because Postgres string
  // comparison is case-sensitive and every other slug on the site is
  // lowercase-hyphenated (audit P2-07). Normalising here means it cannot
  // recur no matter what the form sends.
  const slug = slugify(String(body.slug));
  if (!slug) {
    return NextResponse.json({ error: "That slug has no usable characters." }, { status: 400 });
  }

  if (await isSlugTaken(slug)) {
    return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
  }

  try {
    const item = await createItem({
      title,
      slug,
      thumbnail: thumbnail || null,
      description: description || "",
      category,
      live: !!live,
      featured: !!featured,
      order: Number(order) || 0,
      details: details || {},
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not create item." }, { status: 500 });
  }
}

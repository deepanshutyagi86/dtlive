import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
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
  const { title, slug, thumbnail, description, category, live, featured, order, details } = body;

  if (!title || !slug || !category) {
    return NextResponse.json({ error: "title, slug and category are required." }, { status: 400 });
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

import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { slugify } from "@/lib/guide-utils";
import { updateItem, deleteItem, isSlugTaken, DeleteBlockedError } from "@/lib/admin-repo";
import { getItemById } from "@/lib/items";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await getItemById(params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Same rule as create: the server normalises, so a slug can never be
  // saved in a casing that its own URL won't resolve (audit P2-07).
  if (typeof body.slug === "string" && body.slug.trim()) {
    const normalised = slugify(body.slug);
    if (!normalised) {
      return NextResponse.json({ error: "That slug has no usable characters." }, { status: 400 });
    }
    body.slug = normalised;
  }

  if (body.slug && (await isSlugTaken(body.slug, params.id))) {
    return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
  }

  try {
    const item = await updateItem(params.id, body);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(item);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not update item." }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await deleteItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DeleteBlockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Could not delete item." }, { status: 500 });
  }
}

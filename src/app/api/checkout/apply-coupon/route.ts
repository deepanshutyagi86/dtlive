import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/items";
import { getCoupons } from "@/lib/site-settings";
import { applyCoupon } from "@/lib/coupons";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

// Preview only. It tells the buyer what a code is worth before they commit;
// the charged amount is recomputed independently in create-order, so a
// forged response here changes what the modal displays and nothing else.
//
// Rate-limited harder than checkout because this endpoint is the natural
// way to brute-force a coupon list.
export async function POST(req: NextRequest) {
  if (!rateLimit(`coupon:${clientIpFrom(req)}`, 12, 60_000)) {
    return NextResponse.json({ ok: false, reason: "Too many tries. Wait a minute." }, { status: 429 });
  }

  try {
    const { itemId, code } = await req.json();
    if (!itemId || typeof code !== "string") {
      return NextResponse.json({ ok: false, reason: "Enter a code." }, { status: 400 });
    }

    const item = await getItemById(itemId);
    if (!item || !item.live) {
      return NextResponse.json({ ok: false, reason: "This item is not available." }, { status: 404 });
    }

    const price = (item.details as CourseDetails | WorkshopDetails).price;
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ ok: false, reason: "No discount applies here." }, { status: 400 });
    }

    const coupons = await getCoupons();
    const result = applyCoupon(coupons, code, item.id, price);

    return NextResponse.json({
      ok: result.ok,
      reason: result.reason,
      code: result.code,
      discount: result.discount,
      payable: result.payable,
      label: result.label,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "Could not check that code." }, { status: 500 });
  }
}

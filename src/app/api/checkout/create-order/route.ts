import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/items";
import { createOrder, setOrderCashfreeId } from "@/lib/admin-repo";
import { createRazorpayOrder } from "@/lib/razorpay";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`checkout:${clientIpFrom(req)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const { itemId, name, email, phone, fbc, fbp, eventSourceUrl } = await req.json();

    if (!itemId || !name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const item = await getItemById(itemId);
    if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
      return NextResponse.json({ error: "This item is not available for purchase." }, { status: 404 });
    }

    const details = item.details as CourseDetails | WorkshopDetails;
    const amount = details.price;

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "This item isn't purchasable right now." },
        { status: 400 }
      );
    }

    if (item.category === "workshop") {
      const w = details as WorkshopDetails;
      if (!w.unlimitedSeats && (w.seatsLeft ?? 0) <= 0) {
        return NextResponse.json({ error: "This workshop is sold out." }, { status: 409 });
      }
    }

    // x-forwarded-for can carry a "client, proxy1, proxy2" chain — the
    // first entry is the buyer's IP, which is what Meta expects.
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const clientUserAgent = req.headers.get("user-agent");

    const order = await createOrder({
      itemId: item.id,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      amount: Math.round(amount * 100), // store in paise
      fbc: typeof fbc === "string" ? fbc : null,
      fbp: typeof fbp === "string" ? fbp : null,
      clientIp,
      clientUserAgent,
      eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl : null,
    });

    const rzpOrder = await createRazorpayOrder({
      orderId: order.id,
      amountPaise: Math.round(amount * 100),
    });

    // Column is still named cashfree_order_id — it just stores whichever
    // gateway's order ID. Renaming it is a migration against the
    // production DB, out of scope for this swap.
    await setOrderCashfreeId(order.id, rzpOrder.id);

    return NextResponse.json({
      razorpayOrderId: rzpOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: rzpOrder.amount,
      orderId: order.id,
    });
  } catch (err: any) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/items";
import { createOrder, setOrderCashfreeId } from "@/lib/admin-repo";
import { createCashfreeOrder } from "@/lib/cashfree";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
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

    // x-forwarded-for can carry a "client, proxy1, proxy2" chain — the
    // first entry is the buyer's IP, which is what Meta expects.
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const clientUserAgent = req.headers.get("user-agent");

    const order = await createOrder({
      itemId: item.id,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      amount: amount * 100, // store in paise
      fbc: typeof fbc === "string" ? fbc : null,
      fbp: typeof fbp === "string" ? fbp : null,
      clientIp,
      clientUserAgent,
      eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl : null,
    });

    const cfOrder = await createCashfreeOrder({
      orderId: order.id,
      amountRupees: amount,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
    });

    await setOrderCashfreeId(order.id, cfOrder.cf_order_id);

    // TODO: move workshop seat decrement to the webhook handler once
    // payment is confirmed, to avoid holding seats for abandoned checkouts.

    return NextResponse.json({ paymentSessionId: cfOrder.payment_session_id, orderId: order.id });
  } catch (err: any) {
    console.error("create-order error:", err);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}

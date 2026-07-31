import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/items";
import { createOrder, setOrderCashfreeId } from "@/lib/admin-repo";
import { createCashfreeOrder } from "@/lib/cashfree";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { itemId, name, email, phone } = await req.json();

    if (!itemId || !name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const item = await getItemById(itemId);
    if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
      return NextResponse.json({ error: "This item is not available for purchase." }, { status: 404 });
    }

    const details = item.details as CourseDetails | WorkshopDetails;
    const amount = details.price;

    const order = await createOrder({
      itemId: item.id,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      amount: amount * 100, // store in paise
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

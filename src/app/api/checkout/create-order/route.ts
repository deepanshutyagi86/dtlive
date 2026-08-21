import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/items";
import { createOrder, setOrderCashfreeId, upsertSetting } from "@/lib/admin-repo";
import { createRazorpayOrder } from "@/lib/razorpay";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import { isValidEmail, isValidPhone, normalisePhone } from "@/lib/validate";
import { getCoupons, getInvoiceSettings, getTaxSettings } from "@/lib/site-settings";
import { markCouponUsed } from "@/lib/coupons";
import { quoteOrder } from "@/lib/checkout-pricing";

// A workshop whose start time has passed must stop selling seats. Nothing
// checked this before, so a stale link — a WhatsApp forward, an old story
// highlight — could take real money for a session that already happened.
// Applied to paid checkout AND free registration (see /api/leads).
function hasStarted(details: WorkshopDetails): boolean {
  if (!details.date) return false;
  const t = new Date(details.date).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

export async function POST(req: NextRequest) {
  try {
    if (!rateLimit(`checkout:${clientIpFrom(req)}`, 5, 60_000)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const { itemId, name, email, phone, couponCode, buyerGst, fbc, fbp, eventSourceUrl } = await req.json();

    if (!itemId || !name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Format, not just presence. A malformed address used to reach order
    // creation untouched — the buyer paid, the confirmation bounced, and
    // there was no way left to reach them (audit P2-08).
    if (!isValidEmail(String(email))) {
      return NextResponse.json({ error: "That email doesn't look right — check for a typo." }, { status: 400 });
    }
    if (!isValidPhone(String(phone))) {
      return NextResponse.json(
        { error: "That phone number doesn't look right — 10 digits, or include the country code." },
        { status: 400 }
      );
    }

    const item = await getItemById(itemId);
    if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
      return NextResponse.json({ error: "This item is not available for purchase." }, { status: 404 });
    }

    const details = item.details as CourseDetails | WorkshopDetails;
    const listPrice = details.price;

    if (!Number.isFinite(listPrice) || listPrice <= 0) {
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
      if (hasStarted(w)) {
        return NextResponse.json(
          { error: "This workshop has already started — registration is closed." },
          { status: 409 }
        );
      }
    }

    // The charged amount is ALWAYS recomputed here, server-side, from the
    // item's own price plus the live tax settings and a server-verified
    // coupon. Whatever the browser displayed is a preview and is never
    // trusted — a tampered client can change what the modal shows and
    // nothing else.
    const [coupons, tax, invoice] = await Promise.all([
      getCoupons(),
      getTaxSettings(),
      getInvoiceSettings(),
    ]);

    const quote = quoteOrder({
      listPrice,
      itemId: item.id,
      couponCode: typeof couponCode === "string" ? couponCode : null,
      coupons,
      tax,
      invoice,
      buyerGst: buyerGst && typeof buyerGst === "object" ? buyerGst : null,
    });

    if (!quote.ok) {
      return NextResponse.json({ error: quote.error ?? "Could not price this order." }, { status: 400 });
    }

    const amountPaise = quote.pricing.payablePaise;
    const appliedCode = quote.coupon?.ok ? quote.coupon.code ?? null : null;

    // Razorpay rejects a zero or sub-rupee charge. A price that survives the
    // guards above but prices to nothing here means a coupon floor or a
    // rounding edge went wrong, and charging ₹0 through a payment gateway
    // would create a "paid" order nobody paid for.
    if (amountPaise < 100) {
      return NextResponse.json(
        { error: "This item isn't purchasable right now." },
        { status: 400 }
      );
    }

    // x-forwarded-for can carry a "client, proxy1, proxy2" chain — the
    // first entry is the buyer's IP, which is what Meta expects.
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const clientUserAgent = req.headers.get("user-agent");

    const order = await createOrder({
      itemId: item.id,
      buyerName: String(name).trim(),
      buyerEmail: String(email).trim(),
      buyerPhone: normalisePhone(String(phone)),
      // Paise, computed once in computePricing so the amount stored, the
      // amount charged and the amount shown can never drift apart.
      amount: amountPaise,
      fbc: typeof fbc === "string" ? fbc : null,
      fbp: typeof fbp === "string" ? fbp : null,
      clientIp,
      clientUserAgent,
      eventSourceUrl: typeof eventSourceUrl === "string" ? eventSourceUrl : null,
      // Frozen at purchase so a later rate change can never rewrite an
      // invoice that has already been issued. Silently skipped until the
      // tax_details column exists — see docs/MIGRATIONS.md.
      taxDetails: quote.snapshot,
    });

    const rzpOrder = await createRazorpayOrder({
      orderId: order.id,
      amountPaise,
    });

    // Column is still named cashfree_order_id — it just stores whichever
    // gateway's order ID. Renaming it is a migration against the
    // production DB, out of scope for this swap.
    await setOrderCashfreeId(order.id, rzpOrder.id);

    // Counted at order creation, not at payment: the alternative is
    // counting in three separate paid paths, and an abandoned checkout
    // holding a redemption is a far smaller problem than a "max 20 uses"
    // coupon silently redeeming 200 times. Read-modify-write on a settings
    // row, so two checkouts landing in the same millisecond can under-count
    // by one — acceptable for a promo counter, and the only alternative is
    // a migration, which production is closed to.
    if (appliedCode) {
      try {
        const coupons = await getCoupons();
        await upsertSetting("coupons", markCouponUsed(coupons, appliedCode));
      } catch (err) {
        console.error("Coupon usage count failed (order still valid):", err);
      }
    }

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

import { NextRequest, NextResponse } from "next/server";
import { getItemById } from "@/lib/items";
import {
  getBusinessSettings,
  getCoupons,
  getTaxSettings,
  adOfferClosed,
  adPriceFor,
  adTaxModeFor,
  livePriceFor,
} from "@/lib/site-settings";
import { quoteOrder } from "@/lib/checkout-pricing";
import { taxFor, taxModeFor } from "@/lib/settings-types";
import { rateLimit, clientIpFrom } from "@/lib/rate-limit";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";

// Preview only. It tells the buyer what a code and their GST details are
// worth before they commit; the charged amount is recomputed independently
// in create-order through the SAME quoteOrder(), so a forged response here
// changes what the modal displays and nothing else.
//
// Rate-limited harder than checkout because this endpoint is the natural
// way to brute-force a coupon list.
export async function POST(req: NextRequest) {
  try {
    const { itemId, code, buyerGst, liveSession, liveBlockId, adPage } = await req.json();

    // The limit exists to stop someone guessing coupon codes, so only a
    // real attempt counts. Opening the checkout calls this with an empty
    // code just to render the GST breakdown — charging that against the
    // limit would lock out a buyer who simply reopened the modal.
    const attemptingCode = typeof code === "string" && code.trim().length > 0;
    if (attemptingCode && !rateLimit(`coupon:${clientIpFrom(req)}`, 12, 60_000)) {
      return NextResponse.json({ ok: false, reason: "Too many tries. Wait a minute." }, { status: 429 });
    }

    if (!itemId) {
      return NextResponse.json({ ok: false, reason: "Missing item." }, { status: 400 });
    }

    const item = await getItemById(itemId);
    if (!item || !item.live) {
      return NextResponse.json({ ok: false, reason: "This item is not available." }, { status: 404 });
    }

    // A checkout opened from the /live page previews the webinar price,
    // not the item's list price. Resolved server-side from the ids the
    // browser named — livePriceFor() is the same call create-order makes,
    // so the number previewed here is the number charged there.
    const live = await livePriceFor(item.id, liveSession, liveBlockId);

    // Same refusal create-order makes, and for the same reason: without
    // it, a closed campaign's PREVIEW silently jumped to the item's own
    // (usually much higher) price with ok:true and no error — a buyer
    // watched the number change with no explanation, then got a 409 only
    // once they tried to actually pay. The two responses must agree.
    if (!live && (await adOfferClosed(item.id, adPage))) {
      return NextResponse.json({ ok: false, reason: "Registration for this has closed." }, { status: 409 });
    }

    const offer = live ?? (await adPriceFor(item.id, adPage));
    const listPrice = offer ? offer.price : (item.details as CourseDetails | WorkshopDetails).price;
    if (!Number.isFinite(listPrice) || listPrice <= 0) {
      return NextResponse.json({ ok: false, reason: "No discount applies here." }, { status: 400 });
    }

    const [coupons, tax, business] = await Promise.all([
      getCoupons(),
      getTaxSettings(),
      getBusinessSettings(),
    ]);

    // The same resolution create-order performs, so the breakdown the
    // modal previews is the breakdown that gets charged. If these two ever
    // disagree the buyer is shown one total and billed another.
    const effectiveTax = taxFor(tax, taxModeFor(item.details), await adTaxModeFor(item.id, adPage));

    const quote = quoteOrder({
      listPrice,
      itemId: item.id,
      couponCode: typeof code === "string" ? code : null,
      coupons,
      tax: effectiveTax,
      sellerStateCode: business.stateCode,
      sellerGstin: business.gstin,
      buyerGst: buyerGst && typeof buyerGst === "object" ? buyerGst : null,
    });

    // The full breakdown goes back, not just the discount, so the modal can
    // show the same subtotal / GST / total the server will charge rather
    // than doing its own arithmetic and risking a mismatch.
    return NextResponse.json({
      ok: quote.ok,
      reason: quote.error,
      code: quote.coupon?.ok ? quote.coupon.code : undefined,
      label: quote.coupon?.ok ? quote.coupon.label : undefined,
      discount: quote.pricing.discount,
      // The tax-exclusive share of the discount, so the modal's breakdown
      // adds up in inclusive mode too. Derived here rather than in the
      // browser so there is still exactly one place doing tax arithmetic.
      discountTaxable: quote.pricing.discountTaxable,
      taxableValue: quote.pricing.taxableValue,
      taxTotal: quote.pricing.taxTotal,
      ratePercent: quote.pricing.ratePercent,
      taxApplied: quote.pricing.taxApplied,
      intraState: quote.pricing.intraState,
      payable: quote.pricing.payable,
      listPrice: quote.pricing.listPrice,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "Could not price that." }, { status: 500 });
  }
}

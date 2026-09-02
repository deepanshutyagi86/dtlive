// One place that turns "this item, maybe this coupon, maybe this GSTIN"
// into the exact amount to charge and the snapshot to store.
//
// Shared by /api/checkout/create-order (which charges) and
// /api/checkout/apply-coupon (which previews). Two copies of this
// arithmetic would eventually disagree, and the way you find out is a buyer
// being charged something other than the number they were shown.

import { applyCoupon, type CouponResult } from "./coupons";
import {
  computePricing,
  declaredRatePercent,
  deemedInclusiveSplit,
  isValidGstin,
  stateCodeFromGstin,
  type Pricing,
} from "./tax";
import type { Coupon, TaxSettings } from "./settings-types";
import { stateNameForCode } from "./settings-types";
import type { OrderTaxSnapshot } from "./order-tax";

export interface BuyerGstInput {
  gstin?: string | null;
  legalName?: string | null;
  stateCode?: string | null;
}

export interface QuoteResult {
  ok: boolean;
  /** Set when ok === false; safe to show the buyer verbatim. */
  error?: string;
  pricing: Pricing;
  coupon: CouponResult | null;
  snapshot: OrderTaxSnapshot;
}

/**
 * @param listPrice  the item's own price in RUPEES, read server-side.
 *                   NEVER accept this from the client.
 */
export function quoteOrder({
  listPrice,
  itemId,
  couponCode,
  coupons,
  tax,
  sellerStateCode,
  sellerGstin,
  buyerGst,
}: {
  listPrice: number;
  itemId: string;
  couponCode?: string | null;
  coupons: Coupon[];
  tax: TaxSettings;
  /** The seller's own GST state code — from BusinessSettings.stateCode. */
  sellerStateCode: string;
  /**
   * The seller's own GSTIN — from BusinessSettings.gstin. Required, not
   * optional: it decides the rate the invoice DECLARES even when no tax is
   * added at checkout, and a call site that forgot it would silently start
   * issuing ₹0-GST tax invoices. Make the compiler ask.
   */
  sellerGstin: string;
  buyerGst?: BuyerGstInput | null;
}): QuoteResult {
  let coupon: CouponResult | null = null;
  let discount = 0;

  if (couponCode && couponCode.trim()) {
    coupon = applyCoupon(coupons, couponCode, itemId, listPrice);
    if (!coupon.ok) {
      return {
        ok: false,
        error: coupon.reason ?? "That code isn't valid.",
        coupon,
        pricing: computePricing({ listPrice, tax, sellerStateCode }),
        snapshot: emptySnapshot(listPrice, tax),
      };
    }
    discount = coupon.discount;
  }

  // A GSTIN is only honoured when B2B is switched on AND the value is
  // well-formed. An almost-right GSTIN on a tax invoice is worse than none:
  // it makes the document look official while being unusable for credit.
  const gstin = tax.b2bEnabled ? String(buyerGst?.gstin ?? "").trim().toUpperCase() : "";
  const gstinValid = gstin ? isValidGstin(gstin) : false;
  if (gstin && !gstinValid) {
    return {
      ok: false,
      error: "That GSTIN doesn't look right — it should be 15 characters, e.g. 09ABCDE1234F1Z5.",
      coupon,
      pricing: computePricing({ listPrice, discount, tax, sellerStateCode }),
      snapshot: emptySnapshot(listPrice, tax),
    };
  }

  // Derived from the GSTIN, never taken from the request body. A bare
  // `stateCode` used to be trusted, which let anyone POST
  // {"buyerGst":{"stateCode":"27"}} and flip a B2C sale to IGST on the
  // invoice — the total is unaffected, but the GSTR-1 split would be wrong
  // and attacker-controlled. Place of supply only moves on evidence.
  const buyerStateCode = gstinValid ? stateCodeFromGstin(gstin) : null;

  const pricing = computePricing({
    listPrice,
    discount,
    tax,
    sellerStateCode,
    buyerStateCode,
  });

  // What the INVOICE should say, which is not always what the checkout
  // charged. When "add GST on top" is off, a GST-registered seller's price
  // is still deemed tax-inclusive — so the snapshot records the tax backed
  // OUT of the amount paid rather than freezing a 0% split. Without this,
  // running the migration while tax charging was off would start issuing
  // invoices declaring ₹0 GST on a ₹6,999 sale, under a header carrying the
  // seller's GSTIN. That is an under-declaration, not a display bug.
  const invoiceSplit = pricing.taxApplied
    ? pricing
    : deemedInclusiveSplit(pricing.payable, declaredRatePercent(tax, sellerGstin), pricing.intraState);

  const snapshot: OrderTaxSnapshot = {
    ratePercent: invoiceSplit.ratePercent,
    mode: pricing.taxApplied ? pricing.mode : "inclusive",
    taxableValue: invoiceSplit.taxableValue,
    taxTotal: invoiceSplit.taxTotal,
    cgst: invoiceSplit.cgst,
    sgst: invoiceSplit.sgst,
    igst: invoiceSplit.igst,
    discount: pricing.discount,
    listPrice: pricing.listPrice,
    ...(gstinValid
      ? {
          buyerGstin: gstin,
          buyerLegalName: String(buyerGst?.legalName ?? "").trim() || undefined,
          buyerStateCode: buyerStateCode ?? undefined,
          buyerStateName: stateNameForCode(buyerStateCode ?? "") || undefined,
        }
      : {}),
  };

  return { ok: true, pricing, coupon, snapshot };
}

function emptySnapshot(listPrice: number, tax: TaxSettings): OrderTaxSnapshot {
  // Only ever returned alongside ok:false, so no order is created from it.
  return {
    ratePercent: tax.enabled ? tax.ratePercent : 0,
    mode: tax.mode,
    taxableValue: listPrice,
    taxTotal: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    discount: 0,
    listPrice,
  };
}

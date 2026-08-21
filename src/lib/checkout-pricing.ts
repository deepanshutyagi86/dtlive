// One place that turns "this item, maybe this coupon, maybe this GSTIN"
// into the exact amount to charge and the snapshot to store.
//
// Shared by /api/checkout/create-order (which charges) and
// /api/checkout/apply-coupon (which previews). Two copies of this
// arithmetic would eventually disagree, and the way you find out is a buyer
// being charged something other than the number they were shown.

import { applyCoupon, type CouponResult } from "./coupons";
import { computePricing, isValidGstin, stateCodeFromGstin, type Pricing } from "./tax";
import type { Coupon, InvoiceSettings, TaxSettings } from "./settings-types";
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
  invoice,
  buyerGst,
}: {
  listPrice: number;
  itemId: string;
  couponCode?: string | null;
  coupons: Coupon[];
  tax: TaxSettings;
  invoice: InvoiceSettings;
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
        pricing: computePricing({ listPrice, tax, sellerStateCode: invoice.stateCode }),
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
      pricing: computePricing({ listPrice, discount, tax, sellerStateCode: invoice.stateCode }),
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
    sellerStateCode: invoice.stateCode,
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
    : deemedInclusiveSplit(pricing.payable, tax.ratePercent, pricing.intraState);

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

/**
 * The tax deemed to be inside an amount that was charged without adding any.
 * Mirrors what the invoice fallback has always done, but frozen at purchase
 * so a later rate change cannot rewrite an already-issued document.
 */
function deemedInclusiveSplit(paid: number, ratePercent: number, intraState: boolean) {
  const rate = Number.isFinite(ratePercent) ? Math.max(ratePercent, 0) : 0;
  const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const taxableValue = rate > 0 ? r2((paid * 100) / (100 + rate)) : r2(paid);
  const taxTotal = r2(paid - taxableValue);
  const half = r2(taxTotal / 2);
  return {
    ratePercent: rate,
    taxableValue,
    taxTotal,
    cgst: intraState ? half : 0,
    sgst: intraState ? r2(taxTotal - half) : 0,
    igst: intraState ? 0 : taxTotal,
  };
}

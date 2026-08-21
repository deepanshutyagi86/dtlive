// The single source of truth for what a buyer is charged.
//
// Pure — no DB, no React. The checkout modal previews with it, the
// create-order route charges with it, and the invoice reads the snapshot it
// produced. One function means those three can never disagree, which is the
// entire point: a discrepancy here is either an overcharge or an
// under-declared tax liability.
//
// MONEY RULES, in the order they apply:
//   1. The listed price is the TAXABLE value (in "exclusive" mode).
//   2. A coupon discounts the TAXABLE value, before any tax.
//   3. GST is computed on the discounted taxable value.
//   4. The buyer pays taxable + GST.
// Discounting before tax is what a CA expects and what keeps the invoice
// arithmetic honest — a coupon reduces the sale, so it must reduce the tax.

import type { TaxSettings } from "./settings-types";
import { GST_STATES } from "./settings-types";

export interface Pricing {
  /** What the admin typed, in rupees. */
  listPrice: number;
  /** Rupees taken off by a coupon, applied before tax. */
  discount: number;
  /**
   * The tax-EXCLUSIVE share of that discount. Identical to `discount` in
   * exclusive mode. In inclusive mode the coupon comes off a price that
   * already contains tax, so only part of it is taxable value — and a
   * breakdown that shows the raw discount next to a separate GST line does
   * not add up to the total it prints underneath.
   */
  discountTaxable: number;
  /** listPrice − discount. The value GST is computed on. */
  taxableValue: number;
  /** Total GST in rupees. Zero when tax is off or the item is free. */
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** What the buyer actually pays, in rupees. */
  payable: number;
  /** Exactly what Razorpay is asked to charge. Always an integer. */
  payablePaise: number;
  ratePercent: number;
  mode: TaxSettings["mode"];
  taxApplied: boolean;
  intraState: boolean;
}

/** Rupee amounts are rounded to 2dp; anything finer is not chargeable. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Same state as the seller → CGST + SGST, split evenly.
 * Different state → the whole rate as IGST.
 *
 * With no buyer state (an ordinary B2C checkout that collects name, email
 * and phone only), the place of supply for an online service to an
 * unregistered person falls back to the supplier's own location — so we
 * treat it as intra-state. That never under-reports the total tax; it only
 * decides how it is split.
 */
export function isIntraState(sellerStateCode: string, buyerStateCode?: string | null): boolean {
  if (!buyerStateCode) return true;
  return normaliseStateCode(sellerStateCode) === normaliseStateCode(buyerStateCode);
}

function normaliseStateCode(code: string): string {
  return String(code ?? "").trim().padStart(2, "0").slice(0, 2);
}

export function computePricing({
  listPrice,
  discount = 0,
  tax,
  sellerStateCode,
  buyerStateCode,
}: {
  listPrice: number;
  discount?: number;
  tax: TaxSettings;
  sellerStateCode: string;
  buyerStateCode?: string | null;
}): Pricing {
  const safeList = Number.isFinite(listPrice) && listPrice > 0 ? round2(listPrice) : 0;
  // A discount can never exceed the price or go negative — a coupon row is
  // admin-entered data, and a typo of 99999 must not produce a refund.
  const safeDiscount = Math.min(Math.max(Number.isFinite(discount) ? discount : 0, 0), safeList);

  const rate = tax.enabled && Number.isFinite(tax.ratePercent) ? Math.max(tax.ratePercent, 0) : 0;
  const taxApplied = tax.enabled && rate > 0 && safeList > 0;
  const intraState = isIntraState(sellerStateCode, buyerStateCode);

  let taxableValue: number;
  let taxTotal: number;
  let payable: number;

  if (!taxApplied) {
    // Tax switched off entirely: the buyer pays the listed price, and the
    // invoice (if any) reports the whole amount as the taxable value.
    taxableValue = round2(safeList - safeDiscount);
    taxTotal = 0;
    payable = taxableValue;
  } else if (tax.mode === "exclusive") {
    // The typed price is pre-tax. GST is added on top.
    taxableValue = round2(safeList - safeDiscount);
    taxTotal = round2((taxableValue * rate) / 100);
    payable = round2(taxableValue + taxTotal);
  } else {
    // Inclusive: the typed price is the final amount and already contains
    // the tax, so the taxable value is backed out of it.
    payable = round2(safeList - safeDiscount);
    taxableValue = round2((payable * 100) / (100 + rate));
    taxTotal = round2(payable - taxableValue);
  }

  // The halves are derived so that cgst + sgst === taxTotal exactly, even
  // when taxTotal has an odd number of paise. Halving twice and rounding
  // both would drift by a paisa on the invoice total.
  const half = round2(taxTotal / 2);

  // Derived rather than stored so it can never drift from `taxableValue`:
  // whatever the discount was, this is exactly the part of it that came out
  // of the taxable column.
  const preDiscountTaxable =
    taxApplied && tax.mode === "inclusive"
      ? round2((round2(safeList) * 100) / (100 + rate))
      : round2(safeList);

  return {
    listPrice: safeList,
    discount: safeDiscount,
    discountTaxable: round2(preDiscountTaxable - taxableValue),
    taxableValue,
    taxTotal,
    cgst: intraState ? half : 0,
    sgst: intraState ? round2(taxTotal - half) : 0,
    igst: intraState ? 0 : taxTotal,
    payable,
    // Razorpay charges in paise and rejects a fractional one. Rounding the
    // rupee total once here — rather than letting each caller do it — is
    // what guarantees the amount charged equals the amount displayed.
    payablePaise: Math.round(payable * 100),
    ratePercent: rate,
    mode: tax.mode,
    taxApplied,
    intraState,
  };
}

/** Indian digit grouping: 6999 -> "6,999". */
export function formatRupees(n: number): string {
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return rounded.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/**
 * The price as it appears on a card, a chip or a nav bar — everywhere
 * OUTSIDE the checkout breakdown.
 *
 * In exclusive mode the pre-tax and final numbers differ, so this is the one
 * place that decides which number a stranger sees first. Getting it wrong is
 * either a nasty surprise at checkout or a price that looks higher than a
 * competitor's for no reason, so it is an admin choice, not a code choice.
 */
export function priceLabel(listPrice: number, tax: TaxSettings): string {
  if (!Number.isFinite(listPrice)) return "";
  if (listPrice <= 0) return "Free";

  const rate = tax.enabled ? Math.max(tax.ratePercent ?? 0, 0) : 0;
  if (!tax.enabled || rate <= 0 || tax.mode === "inclusive") {
    return `₹${formatRupees(listPrice)}`;
  }

  if (tax.display === "total") {
    return `₹${formatRupees(round2(listPrice * (1 + rate / 100)))}`;
  }
  return `₹${formatRupees(listPrice)} + GST`;
}

/**
 * The small grey line under a price label. Empty string when there is
 * nothing worth saying, so a caller can render it unconditionally.
 */
export function priceSubLabel(listPrice: number, tax: TaxSettings): string {
  if (!Number.isFinite(listPrice) || listPrice <= 0) return "";
  const rate = tax.enabled ? Math.max(tax.ratePercent ?? 0, 0) : 0;
  if (!tax.enabled || rate <= 0) return "";
  if (tax.mode === "inclusive") return `incl. ${rate}% GST`;
  return tax.display === "total" ? `incl. ${rate}% GST` : "";
}

/**
 * Shape: 2-digit state code, 10-char PAN, entity digit, Z, checksum.
 * The state prefix is checked against the real code list rather than a
 * numeric range — `00` and `39` are not states, and `97` (Other Territory)
 * is, which a naive [0-3][0-9] range gets wrong in both directions.
 */
const GSTIN_SHAPE_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const GSTIN_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * The official GSTIN check digit (mod 36, alternating weights 1 and 2, with
 * the two-digit product folded back into base 36).
 *
 * Shape alone accepts every single-character typo in the checksum — 36 out
 * of 36 mutations pass — and a wrong-but-plausible GSTIN printed on a tax
 * invoice is worse than none: it looks official and cannot be used for
 * input credit, which is the only reason the buyer supplied it.
 */
function gstinChecksumValid(value: string): boolean {
  const chars = value.split("");
  const checkChar = chars.pop();
  let sum = 0;
  chars.forEach((ch, i) => {
    const digit = GSTIN_ALPHABET.indexOf(ch);
    if (digit < 0) return;
    // Positions alternate weight 1, 2, 1, 2 … starting at 1.
    const product = digit * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  });
  const expected = GSTIN_ALPHABET[(36 - (sum % 36)) % 36];
  return expected === checkChar;
}

export function isValidGstin(value: string): boolean {
  const v = String(value ?? "").trim().toUpperCase();
  if (!GSTIN_SHAPE_RE.test(v)) return false;
  if (!isKnownStateCode(v.slice(0, 2))) return false;
  return gstinChecksumValid(v);
}

/** The state code is the first two characters of a GSTIN, by definition. */
export function stateCodeFromGstin(gstin: string): string {
  return String(gstin ?? "").trim().slice(0, 2);
}

/** True only for codes that are actually assigned in the GST state list. */
export function isKnownStateCode(code: string): boolean {
  const c = String(code ?? "").trim();
  return GST_STATES.some((s) => s.code === c);
}

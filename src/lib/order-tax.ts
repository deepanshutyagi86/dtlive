// The tax facts frozen onto an order at the moment it is created.
//
// WHY THIS EXISTS: a tax invoice is a legal record of a past transaction.
// If the invoice were recomputed from live settings, changing the GST rate
// — or switching inclusive/exclusive — would silently rewrite every
// invoice already issued, including ones already filed. So the split is
// captured once, at purchase, and never derived again.
//
// It also carries the buyer's own GST details when they supplied them, so
// a B2B invoice can be raised to their business and taxed as IGST when
// they are outside the seller's state.

export interface OrderTaxSnapshot {
  /** GST rate in force when this order was charged. */
  ratePercent: number;
  mode: "inclusive" | "exclusive";
  /** Rupees. The value GST was computed on, after any coupon. */
  taxableValue: number;
  taxTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  /** Rupees the coupon took off, before tax. */
  discount: number;
  /** The item's list price at purchase time, before discount and tax. */
  listPrice: number;
  /** Present only when the buyer asked for a business invoice. */
  buyerGstin?: string;
  buyerLegalName?: string;
  buyerStateCode?: string;
  buyerStateName?: string;
}

/**
 * Narrows whatever came out of the JSONB column. A hand-edited or
 * half-written row must degrade to "no snapshot" — the invoice then falls
 * back to computing from the amount paid — rather than rendering NaN into
 * a tax document.
 */
export function readTaxSnapshot(value: unknown): OrderTaxSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  const num = (k: string): number | null => {
    const n = Number(v[k]);
    return Number.isFinite(n) ? n : null;
  };

  const taxableValue = num("taxableValue");
  const taxTotal = num("taxTotal");
  const ratePercent = num("ratePercent");
  // These three are the ones the invoice arithmetic depends on. Without
  // all of them there is nothing trustworthy to print.
  if (taxableValue === null || taxTotal === null || ratePercent === null) return null;

  const str = (k: string): string | undefined => {
    const s = v[k];
    return typeof s === "string" && s.trim() ? s.trim() : undefined;
  };

  return {
    ratePercent,
    mode: v.mode === "exclusive" ? "exclusive" : "inclusive",
    taxableValue,
    taxTotal,
    cgst: num("cgst") ?? 0,
    sgst: num("sgst") ?? 0,
    igst: num("igst") ?? 0,
    discount: num("discount") ?? 0,
    listPrice: num("listPrice") ?? 0,
    buyerGstin: str("buyerGstin"),
    buyerLegalName: str("buyerLegalName"),
    buyerStateCode: str("buyerStateCode"),
    buyerStateName: str("buyerStateName"),
  };
}

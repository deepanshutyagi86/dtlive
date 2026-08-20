// Pure GST computation and formatting. No DB, no React — the invoice page,
// the email and any future PDF all derive their numbers from here so they
// can never disagree.

import type { InvoiceSettings } from "./settings-types";

export interface InvoiceLine {
  description: string;
  hsnSac: string;
  /** Rupees, GST-exclusive. */
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export interface InvoiceComputation {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
  /** True when buyer and seller are in the same state, so CGST+SGST applies. */
  intraState: boolean;
  ratePercent: number;
}

/**
 * @param grossPaid  what the buyer actually paid, in RUPEES.
 *
 * Intra-state (buyer in the seller's own state) splits the rate into equal
 * CGST + SGST halves; inter-state charges the whole rate as IGST. We have
 * no reliable buyer state — a checkout that only collects name, email and
 * phone cannot know it — so `intraState` is passed in by the caller, which
 * defaults it to true (the seller's own state). That is the conservative
 * choice: it never under-reports the total tax, only its split.
 */
export function computeInvoice(
  settings: InvoiceSettings,
  grossPaid: number,
  intraState = true
): InvoiceComputation {
  const rate = Number.isFinite(settings.taxRatePercent) ? settings.taxRatePercent : 0;

  const taxableValue =
    settings.taxMode === "inclusive"
      ? round2((grossPaid * 100) / (100 + rate))
      : round2(grossPaid);

  const taxTotal =
    settings.taxMode === "inclusive"
      ? round2(grossPaid - taxableValue)
      : round2((taxableValue * rate) / 100);

  const half = round2(taxTotal / 2);

  return {
    taxableValue,
    cgst: intraState ? half : 0,
    sgst: intraState ? round2(taxTotal - half) : 0,
    igst: intraState ? 0 : taxTotal,
    taxTotal,
    grandTotal: round2(taxableValue + taxTotal),
    intraState,
    ratePercent: rate,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Derived from the order ID rather than a counter, because a sequence
 * column would be a migration and migrations against production are
 * blocked. It is stable (the same order always renders the same number),
 * unique, and human-quotable — which is what an invoice number has to be.
 * It is NOT strictly sequential; if the CA ever requires that, it needs a
 * real counter and therefore a real migration.
 */
export function invoiceNumber(settings: InvoiceSettings, orderId: string, createdAt: string): string {
  const short = orderId.replace(/-/g, "").slice(-8).toUpperCase();
  const d = new Date(createdAt);
  const stamp = Number.isNaN(d.getTime())
    ? ""
    : `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `${settings.numberPrefix}${settings.financialYear}/${stamp}-${short}`;
}

/** Indian-format amount in words, for the "Rupees … only" line. */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  const words = numberToWords(rupees);
  const tail = paise > 0 ? ` and ${numberToWords(paise)} Paise` : "";
  return `Rupees ${words}${tail} only`;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

/** Indian numbering: crore, lakh, thousand, hundred. */
function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  if (crore) { parts.push(`${numberToWords(crore)} Crore`); n %= 10000000; }
  const lakh = Math.floor(n / 100000);
  if (lakh) { parts.push(`${twoDigits(lakh)} Lakh`); n %= 100000; }
  const thousand = Math.floor(n / 1000);
  if (thousand) { parts.push(`${twoDigits(thousand)} Thousand`); n %= 1000; }
  const hundred = Math.floor(n / 100);
  if (hundred) { parts.push(`${ONES[hundred]} Hundred`); n %= 100; }
  if (n) parts.push(twoDigits(n));
  return parts.join(" ");
}

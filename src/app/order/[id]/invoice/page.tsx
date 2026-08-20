import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrderById } from "@/lib/admin-repo";
import { getInvoiceSettings, invoiceAppliesTo } from "@/lib/site-settings";
import { amountInWords, computeInvoice, formatMoney, invoiceNumber } from "@/lib/invoice";
import { SITE_TZ } from "@/lib/dates";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

// noindex, and /order/ is disallowed in robots.ts as well: this page shows
// a named buyer's contact details. It is reachable by anyone holding the
// order ID (a v4 UUID, which is unguessable) — that is the same "secret
// URL" model the payment confirmation page already uses, and it avoids
// building a buyer login for a one-page document.
export const metadata: Metadata = {
  title: "Tax invoice",
  robots: { index: false, follow: false },
};

export default async function InvoicePage({ params }: { params: { id: string } }) {
  const [order, settings] = await Promise.all([getOrderById(params.id), getInvoiceSettings()]);

  if (!order) notFound();
  // An unpaid order has no invoice — issuing a tax document for money that
  // never arrived is the one mistake here that has consequences.
  if (order.status !== "paid") notFound();
  if (!invoiceAppliesTo(settings, order.item.details)) notFound();

  const gross = order.amount / 100;
  const calc = computeInvoice(settings, gross);
  const number = invoiceNumber(settings, order.id, order.createdAt);
  const dateLabel = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SITE_TZ,
  });

  return (
    <main className="invoice-sheet max-w-[820px] mx-auto bg-white text-ink px-8 py-10 md:px-12 md:py-14">
      <PrintButton />

      <header className="flex flex-wrap justify-between gap-6 pb-6 border-b-2 border-ink">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mb-1.5">Tax invoice</p>
          <h1 className="font-display font-extrabold text-[26px] tracking-tight leading-tight">
            {settings.tradeName}
          </h1>
          <p className="text-[13px] text-ink-soft mt-1">{settings.legalName}</p>
          {settings.addressLines.map((line, i) => (
            <p key={i} className="text-[13px] text-ink-soft leading-snug">
              {line}
            </p>
          ))}
          <p className="text-[13px] text-ink-soft mt-1.5">
            GSTIN: <b>{settings.gstin}</b>
          </p>
          <p className="text-[13px] text-ink-soft">
            State: {settings.stateName} ({settings.stateCode})
          </p>
          {settings.email && <p className="text-[13px] text-ink-soft">{settings.email}</p>}
          {settings.phone && <p className="text-[13px] text-ink-soft">{settings.phone}</p>}
        </div>
        <div className="text-right">
          <table className="text-[13px] ml-auto">
            <tbody>
              <tr>
                <td className="text-muted pr-4 py-0.5">Invoice no.</td>
                <td className="font-mono font-bold py-0.5">{number}</td>
              </tr>
              <tr>
                <td className="text-muted pr-4 py-0.5">Date</td>
                <td className="py-0.5">{dateLabel}</td>
              </tr>
              <tr>
                <td className="text-muted pr-4 py-0.5">Order ID</td>
                <td className="font-mono text-[11px] py-0.5">{order.id}</td>
              </tr>
              <tr>
                <td className="text-muted pr-4 py-0.5">Place of supply</td>
                <td className="py-0.5">
                  {settings.stateName} ({settings.stateCode})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </header>

      <section className="mt-7">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mb-2">Billed to</p>
        <p className="font-semibold text-[16px]">{order.buyerName}</p>
        <p className="text-[13px] text-ink-soft">{order.buyerEmail}</p>
        <p className="text-[13px] text-ink-soft">{order.buyerPhone}</p>
      </section>

      <section className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#F2F1EC]">
              <th className="text-left font-semibold p-3 border border-line">Description</th>
              <th className="text-left font-semibold p-3 border border-line whitespace-nowrap">SAC</th>
              <th className="text-right font-semibold p-3 border border-line whitespace-nowrap">Taxable value</th>
              <th className="text-right font-semibold p-3 border border-line whitespace-nowrap">
                GST @ {calc.ratePercent}%
              </th>
              <th className="text-right font-semibold p-3 border border-line whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border border-line align-top">
                {order.item.title}
                <span className="block text-muted text-[11px] mt-0.5">
                  Online {order.item.category === "workshop" ? "workshop seat" : "course access"}
                </span>
              </td>
              <td className="p-3 border border-line font-mono align-top">{settings.hsnSac}</td>
              <td className="p-3 border border-line text-right align-top">{formatMoney(calc.taxableValue)}</td>
              <td className="p-3 border border-line text-right align-top">{formatMoney(calc.taxTotal)}</td>
              <td className="p-3 border border-line text-right align-top font-semibold">
                {formatMoney(calc.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex flex-wrap justify-end">
        <table className="text-[13px] min-w-[280px]">
          <tbody>
            <tr>
              <td className="text-muted py-1 pr-8">Taxable value</td>
              <td className="text-right py-1">{formatMoney(calc.taxableValue)}</td>
            </tr>
            {calc.intraState ? (
              <>
                <tr>
                  <td className="text-muted py-1 pr-8">CGST @ {calc.ratePercent / 2}%</td>
                  <td className="text-right py-1">{formatMoney(calc.cgst)}</td>
                </tr>
                <tr>
                  <td className="text-muted py-1 pr-8">SGST @ {calc.ratePercent / 2}%</td>
                  <td className="text-right py-1">{formatMoney(calc.sgst)}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td className="text-muted py-1 pr-8">IGST @ {calc.ratePercent}%</td>
                <td className="text-right py-1">{formatMoney(calc.igst)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-ink">
              <td className="font-semibold py-2 pr-8">Total paid</td>
              <td className="text-right font-display font-extrabold text-[18px] py-2">
                {formatMoney(calc.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-[13px] text-ink-soft">
        <span className="text-muted">Amount in words: </span>
        {amountInWords(calc.grandTotal)}
      </p>

      <footer className="mt-12 pt-6 border-t border-line flex flex-wrap justify-between gap-8">
        <div className="max-w-[380px]">
          {settings.declaration && (
            <>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mb-1.5">Declaration</p>
              <p className="text-[12px] text-ink-soft leading-relaxed">{settings.declaration}</p>
            </>
          )}
          {settings.notes && <p className="text-[12px] text-ink-soft leading-relaxed mt-3">{settings.notes}</p>}
        </div>
        <div className="text-right">
          {settings.signatureUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.signatureUrl} alt="" className="h-14 ml-auto mb-1 object-contain" />
          )}
          <p className="text-[13px] border-t border-ink pt-2 mt-8 min-w-[180px]">
            For <b>{settings.tradeName}</b>
            <span className="block text-muted text-[11px] mt-1">Authorised signatory</span>
          </p>
        </div>
      </footer>

      <p className="mt-8 font-mono text-[10px] text-muted">
        Computer-generated invoice. Amounts shown are {settings.taxMode === "inclusive" ? "inclusive of" : "exclusive of"}{" "}
        GST as charged at checkout.
      </p>

      <style>{`
        @media print {
          @page { margin: 14mm; }
          .no-print { display: none !important; }
          .invoice-sheet { padding: 0 !important; max-width: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </main>
  );
}

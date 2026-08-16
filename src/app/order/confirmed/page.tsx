import Link from "next/link";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import MetaPixelPurchase from "@/components/MetaPixelPurchase";
import { getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { getSetting } from "@/lib/items";
import { fetchCashfreeOrder } from "@/lib/cashfree";

export const dynamic = "force-dynamic";

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: { order_id?: string };
}) {
  const footerLinks = await getSetting<FooterLinks>("footerLinks", {});
  const orderId = searchParams.order_id;

  let order = orderId ? await getOrderById(orderId) : null;

  // If our webhook hasn't landed yet, double-check directly with Cashfree
  // so the buyer isn't stuck seeing "pending" right after paying. This is
  // a UX-only status flip — the webhook remains the sole trigger for the
  // Meta Purchase event (see claimMetaPurchaseEvent in the webhook route).
  if (order && order.status === "pending") {
    try {
      const cfOrder = await fetchCashfreeOrder(order.id);
      if (cfOrder.order_status === "PAID") {
        await setOrderStatus(order.id, "paid");
        order = { ...order, status: "paid" };
      }
    } catch {
      // Cashfree lookup failing shouldn't break the confirmation page —
      // the webhook will still land and update status shortly.
    }
  }

  const paid = order?.status === "paid";

  return (
    <>
      <Nav />
      <main className="max-w-[640px] mx-auto px-5 pt-[140px] pb-24 text-center">
        {!order ? (
          <>
            <h1 className="font-display font-extrabold text-4xl tracking-tight">We couldn&apos;t find that order</h1>
            <p className="text-ink-soft mt-3">If you completed a payment, it may still be confirming — check back in a minute, or drop me a message.</p>
          </>
        ) : paid ? (
          <>
            <MetaPixelPurchase orderId={order.id} value={order.amount / 100} />
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-marigold-deep">
              ✓ PAYMENT CONFIRMED
            </span>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight mt-3">
              You&apos;re in, {order.buyerName.split(" ")[0]}.
            </h1>
            <p className="text-ink-soft mt-3">
              {order.item.title} — check {order.buyerEmail} for your confirmation. I&apos;ll follow up
              directly with anything else you need before it starts. See you there.
            </p>
            <Link href="/" className="inline-block mt-8 bg-ink text-bone font-semibold px-6 py-3 rounded-full hover:bg-marigold hover:text-ink transition-colors">
              Back to the stream
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display font-extrabold text-4xl tracking-tight">Payment pending</h1>
            <p className="text-ink-soft mt-3">
              We&apos;re still confirming this with Cashfree — refresh this page in a moment. If it doesn&apos;t
              update in a few minutes, message me and I&apos;ll sort it out directly.
            </p>
          </>
        )}
      </main>
      <Footer links={footerLinks} />
    </>
  );
}

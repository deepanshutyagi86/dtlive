import Link from "next/link";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import MetaPixelPurchase from "@/components/MetaPixelPurchase";
import { getOrderById, setOrderStatus } from "@/lib/admin-repo";
import { getSetting } from "@/lib/items";
import { fetchRazorpayOrderPayments } from "@/lib/razorpay";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";

export const dynamic = "force-dynamic";

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: { order_id?: string };
}) {
  const footerLinks = await getSetting<FooterLinks>("footerLinks", {});
  const orderId = searchParams.order_id;

  let order = orderId ? await getOrderById(orderId) : null;

  // This page is usually reached AFTER /api/checkout/verify-payment has
  // already marked the order paid — that's the primary path, fired from
  // the Razorpay popup's handler callback before this page even loads.
  // This fallback exists for the case where the buyer's browser dies
  // between the charge and that verify call: double-check directly with
  // Razorpay so the buyer isn't stuck seeing "pending" right after paying.
  // This is a UX-only status flip — the Razorpay webhook remains a second
  // independent trigger for the Meta Purchase event (see
  // claimMetaPurchaseEvent in the webhook route).
  //
  // Refresh safety: this whole block, including the email send below, is
  // gated on `order.status === "pending"`. Once setOrderStatus below has
  // run, the DB row is "paid" — a page reload re-fetches via
  // getOrderById, gets status "paid", and the condition is false, so
  // nothing resends. (Verified by reading the guard, not assumed.)
  if (order && order.status === "pending") {
    try {
      if (order.cashfreeOrderId) {
        const payments = await fetchRazorpayOrderPayments(order.cashfreeOrderId);
        const captured = payments?.items?.some((p: { status: string }) => p.status === "captured");
        if (captured) {
          await setOrderStatus(order.id, "paid");
          order = { ...order, status: "paid" };

          // Idempotency note: same non-atomic `status !== "paid"` guard as
          // verify-payment and the webhook (audit P1-01) — no
          // notification_sent_at column, that's a migration against
          // production and out of scope here. A genuine race between this
          // page and one of the other two paths landing at nearly the
          // same moment could in theory double-send; see the matching
          // note in verify-payment/route.ts.
          try {
            await sendPaidOrderNotifications(order);
          } catch (err) {
            console.error("Order confirmed page: paid order notifications failed:", err);
          }
        }
      }
    } catch {
      // Razorpay lookup failing shouldn't break the confirmation page —
      // verify-payment or the webhook will still land and update status
      // shortly.
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
              We&apos;re still confirming this with Razorpay — refresh this page in a moment. If it doesn&apos;t
              update in a few minutes, message me and I&apos;ll sort it out directly.
            </p>
          </>
        )}
      </main>
      <Footer links={footerLinks} />
    </>
  );
}

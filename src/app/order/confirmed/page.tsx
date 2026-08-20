import Link from "next/link";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import MetaPixelPurchase from "@/components/MetaPixelPurchase";
import { claimOrderPaid, decrementWorkshopSeats, getOrderById } from "@/lib/admin-repo";
import { getSetting } from "@/lib/items";
import { getBio, getInvoiceSettings, getNav, invoiceAppliesTo } from "@/lib/site-settings";
import type { WorkshopDetails } from "@/lib/types";
import { SITE_TZ } from "@/lib/dates";
import { fetchRazorpayOrderPayments } from "@/lib/razorpay";
import { sendPaidOrderNotifications } from "@/lib/order-notifications";

export const dynamic = "force-dynamic";

export default async function OrderConfirmedPage({
  searchParams,
}: {
  searchParams: { order_id?: string };
}) {
  const [footerLinks, nav, bio, invoiceSettings] = await Promise.all([
    getSetting<FooterLinks>("footerLinks", {}),
    getNav(),
    getBio(),
    getInvoiceSettings(),
  ]);
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
  // Refresh safety comes from claimOrderPaid below, not from this
  // `status === "pending"` check: the check only avoids a pointless
  // Razorpay lookup on reload. The atomic UPDATE is what guarantees the
  // seat decrement and the emails happen exactly once, even if this page,
  // the webhook and verify-payment all land at the same moment.
  if (order && order.status === "pending") {
    try {
      if (order.cashfreeOrderId) {
        const payments = await fetchRazorpayOrderPayments(order.cashfreeOrderId);
        const captured = payments?.items?.some((p: { status: string }) => p.status === "captured");
        if (captured) {
          // Atomic claim — see claimOrderPaid in admin-repo.ts. This page
          // races the webhook and verify-payment by design (it exists for
          // the browser-died-mid-flow case), and exactly one of the three
          // now wins. Everything that must happen once per paid order
          // lives inside this branch: leaving the seat decrement out is
          // how a seat leak hides — the order reads PAID, the buyer gets
          // their email, and only the count is silently wrong. That was
          // P0-04's exact failure mode one layer further in.
          const claimed = await claimOrderPaid(order.id);
          order = { ...order, status: "paid" };

          if (claimed) {
            // Guarded for the same reason as the other two paths: the claim
            // has committed, so a throw here can never be retried.
            if (order.item.category === "workshop") {
              try {
                await decrementWorkshopSeats(order.itemId);
              } catch (err) {
                console.error("Order confirmed page: seat decrement failed:", err);
              }
            }
            try {
              await sendPaidOrderNotifications(order);
            } catch (err) {
              console.error("Order confirmed page: paid order notifications failed:", err);
            }
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
  const showInvoice = !!order && paid && invoiceAppliesTo(invoiceSettings, order.item.details);

  return (
    <>
      <Nav nav={nav} />
      <main className="max-w-[640px] mx-auto px-5 pt-[140px] pb-24 text-center">
        {!order ? (
          <>
            <h1 className="font-display font-extrabold text-4xl tracking-tight">We couldn&apos;t find that order</h1>
            <p className="text-ink-soft mt-3">If you completed a payment, it may still be confirming — check back in a minute, or drop me a message.</p>
          </>
        ) : paid ? (
          <>
            <MetaPixelPurchase orderId={order.id} value={order.amount / 100} />
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-marigold-ink">
              ✓ PAYMENT CONFIRMED
            </span>
            <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight mt-3">
              You&apos;re in, {order.buyerName.split(" ")[0]}.
            </h1>
            <p className="text-ink-soft mt-3">
              {order.item.title} — check {order.buyerEmail} for your confirmation.
            </p>

            {/* Everything below is what the buyer actually needs next. The
                page used to end at "check your email", which left a paying
                customer with no date in their calendar, no joining link and
                nothing to do — the highest-intent moment on the whole site
                spent on a dead end. All of it is per-item and editable in
                /admin/items → Joining details. */}
            <NextSteps order={order} invoiceHref={showInvoice ? `/order/${order.id}/invoice` : null} />

            <Link href="/" className="inline-block mt-10 border border-ink font-semibold px-6 py-3 rounded-full hover:bg-ink hover:text-bone transition-colors">
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
      <Footer links={footerLinks} nav={nav} bio={bio} />
    </>
  );
}

// Split out rather than inlined so the paid branch above stays readable.
// Every block renders only when its field is filled in, so an item with no
// joining details configured shows exactly what it showed before.
function NextSteps({
  order,
  invoiceHref,
}: {
  order: { id: string; itemId: string; item: { title: string; slug: string; category: string; details: any } };
  invoiceHref: string | null;
}) {
  const d = (order.item.details ?? {}) as WorkshopDetails & {
    joining?: {
      groupUrl?: string;
      groupLabel?: string;
      meetingUrl?: string;
      meetingLabel?: string;
      note?: string;
    };
    slug?: string;
  };
  const joining = d.joining ?? {};
  const isWorkshop = order.item.category === "workshop";
  const dateLabel =
    isWorkshop && d.date
      ? new Date(d.date).toLocaleString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: SITE_TZ,
        }) + " IST"
      : null;

  const actions: { href: string; label: string; primary?: boolean; external?: boolean }[] = [];
  if (joining.groupUrl) {
    actions.push({ href: joining.groupUrl, label: joining.groupLabel || "Join the group", primary: true, external: true });
  }
  if (joining.meetingUrl) {
    actions.push({ href: joining.meetingUrl, label: joining.meetingLabel || "Open the session link", external: true });
  }
  // A real .ics, not a Google Calendar link — see the calendar route for
  // why. Only offered when there is a date to put in it.
  if (isWorkshop && d.date) {
    actions.push({ href: `/items/${order.item.slug}/calendar`, label: "Add to calendar" });
  }
  if (invoiceHref) {
    actions.push({ href: invoiceHref, label: "Download GST invoice" });
  }

  if (!dateLabel && actions.length === 0 && !joining.note) return null;

  return (
    <div className="mt-8 text-left bg-card border border-line rounded-card p-6">
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-3">What happens next</p>

      {dateLabel && (
        <div className="mb-4">
          <p className="font-semibold text-[16px]">{dateLabel}</p>
          <p className="text-[14px] text-ink-soft mt-0.5">Add it to your calendar so it does not get lost.</p>
        </div>
      )}

      {joining.note && <p className="text-[15px] leading-relaxed text-ink-soft mb-4">{joining.note}</p>}

      <div className="flex flex-wrap gap-2.5">
        {actions.map((a) => (
          <a
            key={a.href + a.label}
            href={a.href}
            target={a.external ? "_blank" : undefined}
            rel={a.external ? "noopener" : undefined}
            className={
              a.primary
                ? "bg-marigold text-ink font-semibold text-sm px-5 py-3 rounded-full hover:bg-ink hover:text-bone transition-colors"
                : "border border-ink font-semibold text-sm px-5 py-3 rounded-full hover:bg-ink hover:text-bone transition-colors"
            }
          >
            {a.label}
          </a>
        ))}
      </div>
    </div>
  );
}

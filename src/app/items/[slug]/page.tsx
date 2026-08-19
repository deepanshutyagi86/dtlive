import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer, { FooterLinks } from "@/components/Footer";
import CheckoutModal from "@/components/CheckoutModal";
import RegisterModal from "@/components/RegisterModal";
import ItemImage, { ITEM_DETAIL_HERO_ASPECT_CLASS } from "@/components/ItemImage";
import { getItemBySlug, getSetting } from "@/lib/items";
import type { CourseDetails, WorkshopDetails } from "@/lib/types";
import type { Metadata } from "next";
import { SITE_TZ } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const item = await getItemBySlug(params.slug);
  if (!item) return {};
  return {
    title: `${item.title} — Deepanshu Tyagi`,
    description: item.description,
    openGraph: { title: item.title, description: item.description, images: item.thumbnail ? [item.thumbnail] : [] },
  };
}

export default async function ItemDetailPage({ params }: { params: { slug: string } }) {
  const [item, footerLinks] = await Promise.all([
    getItemBySlug(params.slug),
    getSetting<FooterLinks>("footerLinks", {}),
  ]);

  if (!item || !item.live || (item.category !== "course" && item.category !== "workshop")) {
    notFound();
  }

  const isWorkshop = item!.category === "workshop";
  const d = item!.details as any;
  const price = isWorkshop ? (d as WorkshopDetails).price : (d as CourseDetails).price;
  const agenda: { title: string; body: string }[] = isWorkshop
    ? (d as WorkshopDetails).agenda
    : (d as CourseDetails).curriculum;
  const priceLabel = `₹${price}`;
  // Free workshops skip payment entirely — a lead-capture registration
  // instead of a checkout. Courses aren't part of this flow.
  const isFreeWorkshop = isWorkshop && price === 0;
  const triggerLabel = isFreeWorkshop ? "Reserve my free seat" : isWorkshop ? "Reserve my seat" : "Enroll now";
  const showSeats = isWorkshop && !(d as WorkshopDetails).unlimitedSeats && (d as WorkshopDetails).showSeatsBadge !== false;
  const showPriceBadge = d.showPriceBadge !== false;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-bone/85 backdrop-blur-md">
        <a href="/" className="font-display font-extrabold text-[16px] text-ink">
          DT<span className="text-marigold-deep">.live</span>
        </a>
        <div className="hidden md:flex items-center gap-3.5 min-w-0">
          <span className="font-semibold text-sm truncate max-w-[34vw]">{item!.title}</span>
          <span className="font-mono text-[13px] text-marigold-deep font-bold whitespace-nowrap">{priceLabel}</span>
          {isFreeWorkshop ? (
            <RegisterModal
              itemId={item!.id}
              title={item!.title}
              slug={item!.slug}
              category={item!.category}
              thumbnail={item!.thumbnail}
              imageFocal={item!.details?.imageFocal ?? null}
              workshopDate={(d as WorkshopDetails).date}
              registrationFields={(d as WorkshopDetails).registrationFields}
              triggerLabel={triggerLabel}
              triggerClassName="bg-marigold border border-marigold text-ink font-semibold text-sm px-[18px] py-[10px] rounded-full hover:bg-ink hover:text-bone hover:border-ink transition-colors"
            />
          ) : (
            <CheckoutModal
              itemId={item!.id}
              title={item!.title}
              slug={item!.slug}
              category={item!.category}
              thumbnail={item!.thumbnail}
              imageFocal={item!.details?.imageFocal ?? null}
              priceLabel={priceLabel}
              triggerLabel={triggerLabel}
              triggerClassName="bg-marigold border border-marigold text-ink font-semibold text-sm px-[18px] py-[10px] rounded-full hover:bg-ink hover:text-bone hover:border-ink transition-colors"
            />
          )}
        </div>
      </nav>

      <main className="max-w-[860px] mx-auto px-5 pt-[120px] pb-[140px] md:pb-[80px]">
        <div className="rounded-card overflow-hidden mb-6">
          <ItemImage
            thumbnail={item!.thumbnail}
            title={item!.title}
            category={item!.category}
            seed={item!.slug}
            sizes="(min-width: 860px) 860px, 100vw"
            imageFocal={item!.details?.imageFocal ?? null}
            aspectClassName={ITEM_DETAIL_HERO_ASPECT_CLASS}
          />
        </div>

        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold tracking-wider text-live">
          <span className="w-2 h-2 rounded-full bg-live live-dot" />
          {isWorkshop ? "LIVE WORKSHOP · ENROLLMENT OPEN" : "COURSE · SELF-PACED"}
        </span>
        <h1 className="font-display font-extrabold text-[38px] md:text-[64px] tracking-tight leading-[1.02] mt-3.5 mb-4">
          {item!.title}
        </h1>
        <p className="text-[17px] leading-relaxed text-ink-soft max-w-[620px]">{item!.description}</p>

        <div className="flex flex-wrap gap-2 mt-6">
          {isWorkshop && (
            <>
              <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">
                {new Date((d as WorkshopDetails).date).toLocaleString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: SITE_TZ,
                })}
              </span>
              <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">Live on Zoom</span>
              {showSeats && (
                <span className="font-mono text-[11px] px-3 py-1.5 border border-ink bg-marigold rounded-full font-bold">
                  {(d as WorkshopDetails).seatsLeft} seats left
                </span>
              )}
            </>
          )}
          {showPriceBadge && (
            <span className="font-mono text-[11px] px-3 py-1.5 border border-ink rounded-full">{priceLabel}</span>
          )}
        </div>

        <section className="mt-14">
          <h2 className="font-display font-bold text-2xl tracking-tight mb-4">
            {isWorkshop ? "The agenda" : "The curriculum"}
          </h2>
          <div className="border-t border-ink">
            {agenda.map((block, i) => (
              <details key={i} open={i === 0} className="border-b border-ink group">
                <summary className="flex items-center justify-between gap-3 py-4 px-1 cursor-pointer list-none font-display font-bold text-[17px]">
                  {block.title}
                  <span className="font-display font-bold text-xl text-marigold-deep transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="pb-4 px-1 text-[16px] leading-relaxed text-ink-soft max-w-[640px]">{block.body}</div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display font-bold text-2xl tracking-tight mb-4">Who&apos;s teaching</h2>
          <div className="flex gap-4 items-start bg-card border border-line rounded-card p-[22px]">
            <div className="w-16 h-16 rounded-full bg-ink text-marigold flex items-center justify-center font-display font-extrabold text-xl flex-none">
              DT
            </div>
            <div>
              <b className="font-display text-[17px]">Deepanshu Tyagi</b>
              <p className="text-[16px] leading-relaxed text-ink-soft mt-1.5">
                Equity in two D2C brands, 15+ stores and sites shipped for clients, 3 apps on the Play
                Store, and 500+ students taught. Everything here is something I did this month, not
                something I read.
              </p>
            </div>
          </div>
        </section>
      </main>

      <div className="md:hidden fixed left-0 right-0 bottom-0 z-[100] bg-ink text-bone flex items-center justify-between gap-3 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <div>
          <span className="font-mono font-bold text-[15px] text-marigold">{priceLabel}</span>
          {showSeats && (
            <small className="block font-mono text-[10px] text-[#8b8a80]">
              {(d as WorkshopDetails).seatsLeft} seats left
            </small>
          )}
        </div>
        {isFreeWorkshop ? (
          <RegisterModal
            itemId={item!.id}
            title={item!.title}
            slug={item!.slug}
            category={item!.category}
            thumbnail={item!.thumbnail}
            imageFocal={item!.details?.imageFocal ?? null}
            workshopDate={(d as WorkshopDetails).date}
            registrationFields={(d as WorkshopDetails).registrationFields}
            triggerLabel={triggerLabel}
            triggerClassName="bg-marigold text-ink font-semibold text-sm px-5 py-2.5 rounded-full"
          />
        ) : (
          <CheckoutModal
            itemId={item!.id}
            title={item!.title}
            slug={item!.slug}
            category={item!.category}
            thumbnail={item!.thumbnail}
            imageFocal={item!.details?.imageFocal ?? null}
            priceLabel={priceLabel}
            triggerLabel={triggerLabel}
            triggerClassName="bg-marigold text-ink font-semibold text-sm px-5 py-2.5 rounded-full"
          />
        )}
      </div>

      <Footer links={footerLinks} />
    </>
  );
}

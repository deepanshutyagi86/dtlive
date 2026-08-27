// Matches the item detail page's shape — the same nav bar, the same
// hero-image-then-title column, and (from lg:) the same two-column grid
// with the sticky purchase panel — so the swap to real content isn't
// itself a jolt. No item data exists yet at this point, so nothing here
// can know course vs. workshop; it deliberately stays generic.
export default function Loading() {
  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-bone/85 backdrop-blur-md">
        <span className="font-display font-extrabold text-[16px] text-ink">
          DT<span className="text-marigold-ink">.live</span>
        </span>
        <div className="hidden md:flex items-center gap-3.5">
          <div className="skel h-4 w-32" />
          <div className="skel h-4 w-16" />
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-5 pt-[120px] pb-[140px] md:pb-[80px]">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 xl:gap-14 lg:items-start">
          <div className="min-w-0 max-w-[860px] mx-auto lg:mx-0">
            <div className="skel h-4 w-28" />
            <div className="skel aspect-[16/9] rounded-card mt-4 mb-6" />
            <div className="skel h-3 w-40" />
            <div className="skel h-12 md:h-16 w-full max-w-[520px] mt-3.5 mb-4" />
            <div className="skel h-4 w-full max-w-[620px]" />
            <div className="skel h-4 w-2/3 max-w-[500px] mt-2" />
            <div className="flex gap-2 mt-6">
              <div className="skel h-8 w-24 rounded-full" />
              <div className="skel h-8 w-28 rounded-full" />
              <div className="skel h-8 w-20 rounded-full" />
            </div>
          </div>

          <aside className="hidden lg:block">
            <div className="border border-line bg-card rounded-card p-6">
              <div className="skel h-3 w-24" />
              <div className="skel h-9 w-32 mt-3" />
              <div className="flex flex-col gap-3 mt-5 pt-5 border-t border-line">
                <div className="skel h-3 w-full" />
                <div className="skel h-3 w-full" />
                <div className="skel h-3 w-2/3" />
              </div>
              <div className="skel h-12 w-full rounded-full mt-6" />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

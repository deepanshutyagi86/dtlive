import Nav from "./Nav";

// Matches CategoryGrid's shape exactly — same container width, same
// heading block, same 3-column card grid with the same gaps — so the swap
// to real content isn't itself a jolt. Nav renders for real (it's static,
// no fetch) rather than a fake bar, so the chrome is already interactive
// while the grid below is still loading.
export default function CategoryGridSkeleton() {
  return (
    <>
      <Nav />
      <main className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-24">
        <div className="skel h-3 w-24" />
        <div className="skel h-12 md:h-16 w-64 md:w-[420px] mt-3" />
        <div className="skel h-4 w-full max-w-[520px] mt-4" />

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-line rounded-card overflow-hidden flex flex-col">
              <div className="skel aspect-[3/2] rounded-none" />
              <div className="p-5 flex flex-col gap-3">
                <div className="skel h-5 w-3/4" />
                <div className="skel h-4 w-full" />
                <div className="skel h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

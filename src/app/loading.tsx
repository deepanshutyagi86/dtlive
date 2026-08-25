import Nav from "@/components/Nav";

// Matches the homepage's above-the-fold shape — same container, same
// eyebrow/headline/subline block, same "the stream" label row and
// horizontal card carousel — so the swap to real content isn't itself a
// jolt. Nav renders for real (it's static, no fetch) rather than a fake
// bar, so the chrome is already interactive while the rest loads.
export default function Loading() {
  return (
    <>
      <Nav />
      <header className="max-w-[1200px] mx-auto px-5 pt-[92px] pb-1">
        <div className="skel h-3 w-56" />
        <div className="skel h-10 md:h-[88px] w-3/4 max-w-[520px] mt-3" />
        <div className="skel h-10 md:h-[88px] w-1/2 max-w-[360px] mt-2" />
        <div className="skel h-4 w-full max-w-[440px] mt-4" />
      </header>

      <div className="max-w-[1200px] mx-auto px-5 flex items-center justify-between gap-3 mt-6 mb-2.5">
        <div className="skel h-3 w-24" />
        <div className="skel h-3 w-28" />
      </div>

      <div className="flex gap-[22px] px-5 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[270px] md:w-[290px] shrink-0 bg-card border border-line rounded-card overflow-hidden">
            <div className="skel aspect-[3/2] rounded-none" />
            <div className="p-[18px] flex flex-col gap-3">
              <div className="skel h-5 w-3/4" />
              <div className="skel h-4 w-full" />
              <div className="skel h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

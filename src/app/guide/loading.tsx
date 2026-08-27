import Nav from "@/components/Nav";

// Matches the real guide grid's shape — same container, same heading
// block, same 3-column article cards with an image, title, description
// lines and a button row.
export default function Loading() {
  return (
    <>
      <Nav />
      <main className="max-w-[1200px] mx-auto px-5 pt-[118px] pb-24">
        <div className="skel h-3 w-32" />
        <div className="skel h-12 md:h-16 w-40 mt-3" />
        <div className="skel h-4 w-full max-w-[520px] mt-4" />

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-line rounded-card overflow-hidden flex flex-col">
              <div className="skel aspect-[3/2] rounded-none" />
              <div className="p-5 flex flex-col gap-3">
                <div className="skel h-5 w-3/4" />
                <div className="skel h-4 w-full" />
                <div className="skel h-4 w-2/3" />
                <div className="flex items-center gap-3 mt-2">
                  <div className="skel h-10 w-28 rounded-full" />
                  <div className="skel h-4 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

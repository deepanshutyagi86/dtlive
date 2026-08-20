"use client";

// A browser's own print dialog is the "download as PDF" here — every
// desktop and mobile browser can save a page as PDF, and it avoids adding
// a PDF-generation dependency that would have to be build-tested on a
// machine this session cannot build on. Hidden from the printed sheet by
// the @media print rule on the page.
export default function PrintButton() {
  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-8 -mt-2">
      <p className="font-mono text-[11px] text-muted">
        Save as PDF from the print dialog.
      </p>
      <button
        onClick={() => window.print()}
        className="bg-ink text-bone font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-marigold hover:text-ink transition-colors"
      >
        Print / save as PDF
      </button>
    </div>
  );
}

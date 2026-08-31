"use client";
import { LinesField, PdfUploadField, Repeater, SelectField, TextField, NumberField, Toggle } from "@/components/admin/AdminFields";
import { DEFAULT_OVERVIEW_VIDEO_LABEL } from "@/lib/types";

// Everything on this panel renders on the item's own detail page only —
// never on a card. A card has one job, getting the click, and an outcome
// list or an FAQ on it would bury the title. Leave any field blank and its
// section simply doesn't appear on the page.
export default function SalesFields({
  details,
  setDetails,
  category,
}: {
  details: any;
  setDetails: (d: any) => void;
  category: "course" | "workshop";
}) {
  const set = (patch: any) => setDetails({ ...details, ...patch });
  const joining = details.joining ?? {};
  const setJoining = (patch: any) => set({ joining: { ...joining, ...patch } });

  const syllabus = details.syllabus ?? null;

  // Patch-merge like setJoining above, so editing the label can't wipe the
  // url. Clearing the url clears the whole object rather than leaving a
  // stranded {label, note} behind with nothing to play.
  const overviewVideo = details.overviewVideo ?? {};
  const setOverviewVideo = (patch: any) => {
    const next = { ...overviewVideo, ...patch };
    set({ overviewVideo: next.url?.trim() ? next : undefined });
  };

  return (
    <div className="mt-8">
      <hr className="border-line mb-6" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Full syllabus PDF</p>
      <p className="text-[13px] text-muted mb-5 leading-relaxed">
        Optional. Upload the long-form PDF and this item gets its own readable page at
        /items/&lt;slug&gt;/syllabus, linked from the card and the buy panel, with a download beside it.
        The master switch lives in Settings → Syllabus PDF.
      </p>

      <PdfUploadField
        label="Syllabus PDF"
        value={syllabus?.url ?? ""}
        fileName={syllabus?.fileName}
        pathPrefix="syllabus/"
        onChange={(v) => set({ syllabus: v ? { ...syllabus, url: v.url, fileName: v.fileName } : undefined })}
        help="Up to 25MB. Replacing swaps the file; the page URL never changes."
      />

      {syllabus?.url && (
        <Toggle
          label="Show the syllabus link for this item"
          checked={syllabus.enabled !== false}
          onChange={(v) => set({ syllabus: { ...syllabus, enabled: v } })}
          help="Off hides the link and the page without deleting the file."
        />
      )}

      <hr className="border-line my-6" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Overview video (Module 0)</p>
      <p className="text-[13px] text-muted mb-5 leading-relaxed">
        Optional. One free video shown as a button under the description, above the syllabus link.
        Upload it to YouTube as <strong>Unlisted</strong> and paste the watch link — unlisted means
        link-only, not searchable. <strong>Do not use Private</strong>: private videos are visible to
        nobody but your own account and the player will be blank for everyone else. A Google Drive
        share link or a direct .mp4 URL work too. Leave blank and no button appears.
      </p>

      <TextField
        label="Video URL"
        value={overviewVideo.url ?? ""}
        onChange={(v) => setOverviewVideo({ url: v })}
        placeholder="https://www.youtube.com/watch?v=..."
        help="YouTube (unlisted), a Drive share link, or a direct .mp4. An unrecognised link simply hides the button."
      />

      {overviewVideo.url && (
        <div className="grid md:grid-cols-2 gap-4">
          <TextField
            label="Button label"
            value={overviewVideo.label ?? ""}
            onChange={(v) => setOverviewVideo({ label: v })}
            placeholder={DEFAULT_OVERVIEW_VIDEO_LABEL}
            help="Blank uses the default."
          />
          <TextField
            label="Small note under the button"
            value={overviewVideo.note ?? ""}
            onChange={(v) => setOverviewVideo({ note: v })}
            placeholder="12 min · free to watch"
            help="Optional. Saying it's free and how long it is is what gets it clicked."
          />
        </div>
      )}

      <hr className="border-line my-6" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Sales page content</p>
      <p className="text-[13px] text-muted mb-5 leading-relaxed">
        Shown on this item&apos;s own page, under the description. Every block hides itself when empty.
      </p>

      <LinesField
        label="What you'll walk away with"
        value={details.outcomes ?? []}
        onChange={(v) => set({ outcomes: v })}
        rows={5}
        placeholder={"A working landing page you built yourself\nA prompt library you keep\nOne finished project in your portfolio"}
        help="One concrete outcome per line. Things they'll have, not things you'll cover."
      />

      <div className="grid md:grid-cols-2 gap-4">
        <LinesField
          label="Who this is for"
          value={details.forWho ?? []}
          onChange={(v) => set({ forWho: v })}
          rows={4}
          placeholder={"You've never written a line of code\nYou want to ship, not to study"}
          help="One per line."
        />
        <LinesField
          label="Who this isn't for"
          value={details.notForWho ?? []}
          onChange={(v) => set({ notForWho: v })}
          rows={4}
          placeholder={"You already build production apps\nYou want a certificate, not a skill"}
          help="Saying this out loud sells better than hiding it — and it prevents refund requests."
        />
      </div>

      <div className="mb-5">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">Questions (FAQ)</p>
        <p className="text-[12px] text-muted mb-3 leading-relaxed">
          Every unanswered question is an abandoned checkout. Do I get a recording? What if I miss it? What do
          I need installed? These also feed Google&apos;s FAQ rich result.
        </p>
        <Repeater
          items={(details.faq ?? []) as { q: string; a: string }[]}
          onChange={(v) => set({ faq: v })}
          addLabel="Add question"
          emptyHint="No questions yet."
          blank={() => ({ q: "", a: "" })}
          render={(f, update) => (
            <>
              <TextField label="Question" value={f.q} onChange={(v) => update({ q: v })} placeholder="Do I get a recording?" />
              <TextField label="Answer" rows={3} value={f.a} onChange={(v) => update({ a: v })} />
            </>
          )}
        />
      </div>

      {category === "course" && (
        <>
          <hr className="border-line my-6" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Comparison strip</p>
          <p className="text-[13px] text-muted mb-4 leading-relaxed">
            Fills this course&apos;s row in the &ldquo;Which one is yours?&rdquo; table on /courses. The table
            only appears once two or more live courses have something filled in here.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <TextField
              label="Best for"
              value={details.bestFor ?? ""}
              onChange={(v) => set({ bestFor: v })}
              placeholder="Complete beginners with no tech background"
            />
            <TextField
              label="You leave with"
              value={details.buildOutcome ?? ""}
              onChange={(v) => set({ buildOutcome: v })}
              placeholder="A live site you built and shipped"
            />
            <TextField label="Level" value={details.level ?? ""} onChange={(v) => set({ level: v })} placeholder="Beginner" />
          </div>
        </>
      )}

      <hr className="border-line my-6" />
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted mb-1">Joining details</p>
      <p className="text-[13px] text-muted mb-4 leading-relaxed">
        What the buyer gets the moment they&apos;ve paid — shown on the confirmation page, and available in
        the confirmation email through the <code className="font-mono">{"{groupUrl}"}</code>,{" "}
        <code className="font-mono">{"{meetingUrl}"}</code>, <code className="font-mono">{"{calendarUrl}"}</code>{" "}
        and <code className="font-mono">{"{joiningNote}"}</code> tokens.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <TextField
          label="Group link"
          value={joining.groupUrl ?? ""}
          onChange={(v) => setJoining({ groupUrl: v })}
          placeholder="https://chat.whatsapp.com/…"
          help="Any group invite — WhatsApp, Telegram, Discord, Circle. Per item, so each cohort gets its own."
        />
        <TextField
          label="Group button label"
          value={joining.groupLabel ?? ""}
          onChange={(v) => setJoining({ groupLabel: v })}
          placeholder="Join the group"
        />
        <TextField
          label="Session / access link"
          value={joining.meetingUrl ?? ""}
          onChange={(v) => setJoining({ meetingUrl: v })}
          placeholder={category === "workshop" ? "https://zoom.us/j/…" : "https://…course-portal"}
        />
        <TextField
          label="Session button label"
          value={joining.meetingLabel ?? ""}
          onChange={(v) => setJoining({ meetingLabel: v })}
          placeholder={category === "workshop" ? "Open the Zoom link" : "Start the course"}
        />
      </div>

      <TextField
        label="Note after purchase"
        rows={3}
        value={joining.note ?? ""}
        onChange={(v) => setJoining({ note: v })}
        placeholder="I'll send the Zoom link on the morning of the session. Recording goes out within 24 hours."
        help="One or two sentences of reassurance. This is the highest-attention moment on the whole site."
      />

      {category === "workshop" && (
        <NumberField
          label="Length in minutes"
          value={joining.durationMinutes ?? 90}
          onChange={(v) => setJoining({ durationMinutes: v })}
          min={15}
          help="Used to set the end time in the calendar file buyers download. Not shown anywhere on the site."
        />
      )}

      <hr className="border-line my-6" />
      <SelectField
        label="GST invoice for this item"
        value={details.invoice ?? "default"}
        onChange={(v) => set({ invoice: v })}
        options={[
          { value: "default", label: "Use the global setting" },
          { value: "always", label: "Always issue an invoice" },
          { value: "never", label: "Never issue an invoice" },
        ]}
        help="Overrides Settings → GST invoices for this one item. The master switch there still wins over 'always'."
      />
    </div>
  );
}

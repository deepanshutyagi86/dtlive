import SettingsForm from "../settings/SettingsForm";
import { SECTION_GROUPS } from "@/lib/settings-sections";

export const dynamic = "force-dynamic";

const GROUP = SECTION_GROUPS.business;

// One of the pages the old single Settings screen was split into. They all
// render the same form with a different slice of sections — see
// SECTION_GROUPS for why the state is deliberately NOT split as well.
export default function AdminBusinessPage() {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Settings</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight">{GROUP.title}</h1>
      <p className="text-[14px] text-muted mt-2 mb-8 max-w-[560px] leading-relaxed">{GROUP.blurb}</p>
      <SettingsForm show={GROUP.sections} />
    </div>
  );
}

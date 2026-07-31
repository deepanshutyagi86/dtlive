import SettingsForm from "./SettingsForm";

export default function AdminSettingsPage() {
  return (
    <div>
      <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">Site-wide</p>
      <h1 className="font-display font-extrabold text-3xl tracking-tight mb-8">Settings</h1>
      <SettingsForm />
    </div>
  );
}

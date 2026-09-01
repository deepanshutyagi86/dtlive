import { redirect } from "next/navigation";

// Settings used to be one page with thirteen unrelated things on it. It is
// now split across Homepage / Appearance / Emails / Pricing / Business /
// Extras. This redirect exists so an old bookmark or a muscle-memory URL
// still lands somewhere useful rather than on a 404.
export default function AdminSettingsPage() {
  redirect("/admin/homepage");
}

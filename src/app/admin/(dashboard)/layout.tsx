import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/guides", label: "Guides" },
  { href: "/admin/live", label: "Live" },
  { href: "/admin/ads", label: "Ad pages" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/diagnostics", label: "Diagnostics" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Edge middleware can only check that the session cookie exists — it
  // can't verify the HMAC. This is the real lock: it runs on every page in
  // the (dashboard) group before any of them query the database.
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-screen bg-bone flex flex-col md:flex-row">
      <aside className="md:w-[220px] md:min-h-screen md:border-r border-line bg-card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between md:block">
          <Link href="/admin" className="font-display font-extrabold text-[16px]">
            DT<span className="text-marigold-ink">.live</span>
          </Link>
          <span className="font-mono text-[10px] text-muted md:block md:mt-1">admin panel</span>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap px-5 py-3 text-sm font-medium border-b md:border-b-0 md:border-l-2 border-transparent hover:bg-bone hover:border-marigold transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 md:mt-auto">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10 md:py-10 max-w-[1100px]">{children}</main>
    </div>
  );
}

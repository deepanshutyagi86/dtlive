import Link from "next/link";
import LogoutButton from "./LogoutButton";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bone flex flex-col md:flex-row">
      <aside className="md:w-[220px] md:min-h-screen md:border-r border-line bg-card">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between md:block">
          <Link href="/admin" className="font-display font-extrabold text-[16px]">
            DT<span className="text-marigold-deep">.live</span>
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

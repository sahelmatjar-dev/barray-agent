import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { RTL_LOCALES } from "@/i18n/dictionaries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const dir = RTL_LOCALES.includes(session.locale) ? "rtl" : "ltr";

  return (
    <div dir={dir} className="flex h-screen w-full overflow-hidden">
      <Sidebar locale={session.locale} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar locale={session.locale} fullName={session.fullName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";
import { getDictionary, Locale } from "@/i18n/dictionaries";

export function Sidebar({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col gap-1 overflow-y-auto border-e border-slate-800 bg-slate-900 p-3">
      <div className="mb-3 px-2 text-sm font-semibold text-amber-400">{dict.app_name}</div>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition ${
              active ? "bg-amber-500 text-slate-950 font-medium" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {dict.nav[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}

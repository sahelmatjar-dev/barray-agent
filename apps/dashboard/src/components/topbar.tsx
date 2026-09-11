"use client";

import { useRouter } from "next/navigation";
import { getDictionary, Locale, LOCALES } from "@/i18n/dictionaries";

const LOCALE_LABEL: Record<Locale, string> = { ar: "العربية", fr: "Français", en: "English" };

export function Topbar({ locale, fullName }: { locale: Locale; fullName: string }) {
  const dict = getDictionary(locale);
  const router = useRouter();

  async function changeLocale(next: Locale) {
    await fetch("/api/settings/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
      <span className="text-sm text-slate-300">{fullName}</span>
      <div className="flex items-center gap-3">
        <select
          defaultValue={locale}
          onChange={(e) => changeLocale(e.target.value as Locale)}
          className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l}>{LOCALE_LABEL[l]}</option>
          ))}
        </select>
        <button onClick={logout} className="rounded-md bg-slate-800 px-3 py-1 text-sm text-slate-200 hover:bg-slate-700">
          {dict.common.logout}
        </button>
      </div>
    </header>
  );
}

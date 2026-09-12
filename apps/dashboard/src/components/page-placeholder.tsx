import { Locale, getDictionary } from "@/i18n/dictionaries";

export function PagePlaceholder({ locale, title }: { locale: Locale; title: string }) {
  const dict = getDictionary(locale);
  return (
    <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
      <h1 className="mb-2 text-lg font-semibold text-slate-100">{title}</h1>
      <p className="text-sm text-slate-400">{dict.common.coming_soon}</p>
    </div>
  );
}

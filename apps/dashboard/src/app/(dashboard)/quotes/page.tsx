import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listAllQuotes } from "@barray/database";

export default async function QuotesPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const quotes = await listAllQuotes();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.quotes}</h1>
      {quotes.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Opportunity</th>
                <th className="p-3 text-start">Supplier</th>
                <th className="p-3 text-start">Truck price</th>
                <th className="p-3 text-start">Best value</th>
                <th className="p-3 text-start">Declared not-scrapped</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q: Record<string, unknown>) => (
                <tr key={q.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{q.opportunity_code as string}</td>
                  <td className="p-3">{q.supplier_name as string}</td>
                  <td className="p-3">{q.truck_price ? `${Number(q.truck_price).toLocaleString()} ${q.currency}` : "—"}</td>
                  <td className="p-3">{(q.best_value_score as number) ?? "—"}</td>
                  <td className="p-3">{q.not_officially_scrapped_declared ? "✓" : "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{q.status as string}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

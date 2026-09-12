import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listInspections } from "@barray/database";

const REC_COLOR: Record<string, string> = {
  PASS: "bg-emerald-900 text-emerald-300",
  MANUAL_REVIEW: "bg-amber-900 text-amber-300",
  REJECT: "bg-red-900 text-red-300",
};

export default async function InspectionsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const inspections = await listInspections();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{dict.nav.inspections}</h1>
        <Link href="/inspections/new" className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-amber-400">
          + New inspection
        </Link>
      </div>
      {inspections.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Opportunity</th>
                <th className="p-3 text-start">Inspector</th>
                <th className="p-3 text-start">Date</th>
                <th className="p-3 text-start">Mechanical score</th>
                <th className="p-3 text-start">Recommendation</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((i: Record<string, unknown>) => (
                <tr key={i.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{i.opportunity_code as string} — SITRAK {i.model as string} {i.configuration as string}</td>
                  <td className="p-3">{(i.inspector_name as string) ?? "—"}</td>
                  <td className="p-3">{i.inspection_date ? new Date(i.inspection_date as string).toLocaleDateString() : "—"}</td>
                  <td className="p-3">{(i.mechanical_score as number) ?? "—"}/100</td>
                  <td className="p-3">
                    {i.recommendation ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${REC_COLOR[i.recommendation as string] ?? ""}`}>
                        {i.recommendation as string}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{i.status as string}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

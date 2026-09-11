import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listDismantlingJobs } from "@barray/database";

export default async function DismantlingPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const jobs = await listDismantlingJobs();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.dismantling}</h1>
      {jobs.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Donor</th>
                <th className="p-3 text-start">Assigned to</th>
                <th className="p-3 text-start">Rules acknowledged</th>
                <th className="p-3 text-start">Fluids drained</th>
                <th className="p-3 text-start">Connectors labeled</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j: Record<string, unknown>) => (
                <tr key={j.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{j.donor_code as string}</td>
                  <td className="p-3">{(j.assigned_to as string) ?? "—"}</td>
                  <td className="p-3">{j.rules_acknowledged ? "✓" : "—"}</td>
                  <td className="p-3">{j.fluids_drained ? "✓" : "—"}</td>
                  <td className="p-3">{j.connectors_labeled ? "✓" : "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{j.status as string}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

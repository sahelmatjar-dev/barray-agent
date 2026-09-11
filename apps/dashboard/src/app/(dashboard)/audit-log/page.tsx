import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listAuditLogs } from "@barray/database";

export default async function AuditLogPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const logs = await listAuditLogs(200);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.audit_log}</h1>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">When</th><th className="p-3 text-start">User</th>
                <th className="p-3 text-start">Action</th><th className="p-3 text-start">Entity</th>
                <th className="p-3 text-start">Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: Record<string, unknown>) => (
                <tr key={l.id as string} className="border-t border-slate-800">
                  <td className="p-3 whitespace-nowrap">{new Date(l.created_at as string).toLocaleString()}</td>
                  <td className="p-3">{(l.user_name as string) ?? "system"}</td>
                  <td className="p-3">{l.action as string}</td>
                  <td className="p-3">{l.entity as string}</td>
                  <td className="p-3 text-slate-400">{(l.reason as string) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

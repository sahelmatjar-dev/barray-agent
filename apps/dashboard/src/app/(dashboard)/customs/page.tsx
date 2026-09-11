import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listCustomsRecords } from "@barray/database";

export default async function CustomsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const records = await listCustomsRecords();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.customs}</h1>
      {records.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="space-y-3">
          {records.map((r: Record<string, unknown>) => {
            const reason = r.reason as string | null;
            const flagged = Boolean(r.complete_vehicle_flag);
            const flagReason = r.complete_vehicle_flag_reason as string | null;
            return (
              <div key={r.id as string} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{(r.donor_code as string) ?? "—"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${r.customs_verified ? "bg-emerald-900 text-emerald-300" : "bg-amber-900 text-amber-300"}`}>
                    {r.customs_verified ? "VERIFIED" : "PENDING VERIFICATION"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Candidate HS: {(r.candidate_hs_code as string) ?? "UNKNOWN"} ({r.source as string}
                  {r.confidence ? `, ${r.confidence}% confidence` : ""})
                </p>
                {reason && <p className="text-sm text-slate-400">{reason}</p>}
                {flagged && (
                  <p className="mt-2 rounded-md bg-red-950/60 px-3 py-2 text-sm font-medium text-red-300">
                    CUSTOMS REVIEW REQUIRED — POSSIBLE GIR 2(a) CLASSIFICATION
                    <br />
                    <span className="font-normal text-red-400">{flagReason}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

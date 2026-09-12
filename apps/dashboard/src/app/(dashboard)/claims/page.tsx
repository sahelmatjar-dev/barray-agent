import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listClaims, listClaimItems } from "@barray/database";

export default async function ClaimsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const claims = await listClaims();
  const itemsByClaim = await Promise.all(claims.map((c: Record<string, unknown>) => listClaimItems(c.id as string)));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.claims}</h1>
      {claims.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        claims.map((c: Record<string, unknown>, idx: number) => (
          <div key={c.id as string} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{(c.donor_code as string) ?? "—"} — {c.claim_type as string}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{c.status as string}</span>
            </div>
            <p className="mb-2 text-sm text-slate-400">
              Claim amount: {c.claim_amount ? `${Number(c.claim_amount).toLocaleString()} ${c.currency}` : "—"}
              {c.auto_send_enabled ? "" : " · manual send only"}
            </p>
            <ul className="space-y-1 text-sm">
              {itemsByClaim[idx].map((it: Record<string, unknown>) => (
                <li key={it.id as string} className="text-slate-300">— {it.description as string}</li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

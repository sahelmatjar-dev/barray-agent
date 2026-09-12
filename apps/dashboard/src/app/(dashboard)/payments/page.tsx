import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listPayments } from "@barray/database";
import { canViewReleasePaymentAction } from "@barray/shared";

export default async function PaymentsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const canViewAmounts = canViewReleasePaymentAction(session!.roles);
  const payments = canViewAmounts ? await listPayments() : [];

  if (!canViewAmounts) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{dict.nav.payments}</h1>
        <p className="rounded-lg border border-amber-900 bg-amber-950/40 p-4 text-sm text-amber-300">
          Only OWNER or FINANCE roles may view payment details (see docs/safety-rules.md).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.payments}</h1>
      {payments.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">PO</th>
                <th className="p-3 text-start">Amount</th>
                <th className="p-3 text-start">Type</th>
                <th className="p-3 text-start">Method</th>
                <th className="p-3 text-start">Released</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{p.purchase_order_code as string}</td>
                  <td className="p-3">{Number(p.amount).toLocaleString()} {p.currency as string}</td>
                  <td className="p-3">{p.payment_type as string}</td>
                  <td className="p-3">{(p.method as string) ?? "—"}</td>
                  <td className="p-3">{p.released_at ? new Date(p.released_at as string).toLocaleDateString() : "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      p.status === "RELEASED" ? "bg-emerald-900 text-emerald-300" : "bg-slate-800"
                    }`}>{p.status as string}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

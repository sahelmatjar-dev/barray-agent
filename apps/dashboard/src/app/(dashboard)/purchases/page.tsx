import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listPurchaseOrders } from "@barray/database";

export default async function PurchasesPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const orders = await listPurchaseOrders();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.purchases}</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">PO</th>
                <th className="p-3 text-start">Opportunity</th>
                <th className="p-3 text-start">Supplier</th>
                <th className="p-3 text-start">Agreed price</th>
                <th className="p-3 text-start">Incoterm</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po: Record<string, unknown>) => (
                <tr key={po.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{po.code as string}</td>
                  <td className="p-3">{po.opportunity_code as string}</td>
                  <td className="p-3">{po.supplier_name as string}</td>
                  <td className="p-3">{Number(po.agreed_price).toLocaleString()} {po.currency as string}</td>
                  <td className="p-3">{(po.incoterm as string) ?? "—"} {(po.delivery_port as string) ?? ""}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{po.status as string}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

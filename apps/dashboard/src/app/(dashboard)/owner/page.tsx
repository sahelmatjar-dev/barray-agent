import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listOwnerDecisionCards } from "@barray/database";
import { ApprovalCard } from "@/components/approval-card";

export default async function OwnerCommandCenterPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const cards = await listOwnerDecisionCards();

  const bySupplier = cards.filter((c) => c.gate === "APPROVE_SUPPLIER").length;
  const byInspection = cards.filter((c) => c.gate === "APPROVE_INSPECTION").length;
  const byPurchase = cards.filter((c) => c.gate === "APPROVE_PURCHASE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{dict.owner.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {bySupplier} {dict.owner.supplier_approvals} · {byInspection} {dict.owner.inspection_approvals} · {byPurchase} {dict.owner.purchase_approvals}
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <ApprovalCard key={card.approvalId} card={card} locale={session!.locale} />
          ))}
        </div>
      )}
    </div>
  );
}

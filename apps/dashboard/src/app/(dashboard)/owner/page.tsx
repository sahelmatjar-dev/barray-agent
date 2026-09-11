import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listOwnerDecisionCards } from "@barray/database";
import { canViewReleasePaymentAction } from "@barray/shared";
import { ApprovalCard } from "@/components/approval-card";

export default async function OwnerCommandCenterPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const allCards = await listOwnerDecisionCards();
  // RELEASE_PAYMENT cards are visible only to OWNER/FINANCE, even on this
  // shared command-center page (see docs/safety-rules.md).
  const canSeePayments = canViewReleasePaymentAction(session!.roles);
  const cards = allCards.filter((c) => c.gate !== "RELEASE_PAYMENT" || canSeePayments);

  const bySupplier = cards.filter((c) => c.gate === "APPROVE_SUPPLIER").length;
  const byInspection = cards.filter((c) => c.gate === "APPROVE_INSPECTION").length;
  const byPurchase = cards.filter((c) => c.gate === "APPROVE_PURCHASE").length;
  const byPayment = cards.filter((c) => c.gate === "RELEASE_PAYMENT").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{dict.owner.title}</h1>
        <p className="mt-1 text-sm text-slate-400">
          {bySupplier} {dict.owner.supplier_approvals} · {byInspection} {dict.owner.inspection_approvals} · {byPurchase} {dict.owner.purchase_approvals}
          {canSeePayments && ` · ${byPayment} ${dict.owner.payment_releases}`}
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

import { notFound } from "next/navigation";
import { getSupplier, listSupplierBankAccounts, listSupplierContacts } from "@barray/database";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const [contacts, bankAccounts] = await Promise.all([
    listSupplierContacts(id),
    listSupplierBankAccounts(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{supplier.legal_name}</h1>
        <p className="text-sm text-slate-400">{supplier.country} · {supplier.status}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{supplier.trust_score ?? "—"}/100</div>
          <div className="text-xs text-slate-400">Trust score</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{supplier.trust_risk_group ?? "—"}</div>
          <div className="text-xs text-slate-400">Risk group</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{supplier.fraud_risk ?? "—"}</div>
          <div className="text-xs text-slate-400">Fraud risk</div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Contacts</h2>
        <ul className="space-y-1 text-sm">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
              {c.full_name} {c.is_primary && <span className="text-amber-400">(primary)</span>} — {c.role ?? "—"} · {c.phone ?? "—"} · {c.email ?? "—"}
            </li>
          ))}
          {contacts.length === 0 && <li className="text-slate-500">No contacts on file.</li>}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Bank accounts</h2>
        <ul className="space-y-1 text-sm">
          {bankAccounts.map((b) => (
            <li key={b.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
              {b.bank_name} · {b.account_holder_name}
              {b.is_personal_account && <span className="ms-2 text-red-400">PERSONAL ACCOUNT</span>}
              {b.matches_company_name === false && <span className="ms-2 text-red-400">NAME MISMATCH</span>}
              <span className="ms-2 text-slate-500">{b.status}</span>
            </li>
          ))}
          {bankAccounts.length === 0 && <li className="text-slate-500">No bank accounts on file.</li>}
        </ul>
      </div>
    </div>
  );
}

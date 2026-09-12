import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { query } from "@barray/database";

interface Counts {
  opportunities: number;
  suppliers: number;
  fleet: number;
  pending_approvals: number;
  inventory_available: number;
  open_claims: number;
}

async function loadCounts(): Promise<Counts> {
  const [opportunities, suppliers, fleet, pendingApprovals, inventoryAvailable, openClaims] = await Promise.all([
    query<{ count: string }>(`SELECT count(*) FROM opportunities`),
    query<{ count: string }>(`SELECT count(*) FROM suppliers`),
    query<{ count: string }>(`SELECT count(*) FROM fleet_trucks`),
    query<{ count: string }>(`SELECT count(*) FROM approvals WHERE status = 'PENDING'`),
    query<{ count: string }>(`SELECT count(*) FROM inventory WHERE part_status = 'AVAILABLE'`),
    query<{ count: string }>(`SELECT count(*) FROM claims WHERE status NOT IN ('RESOLVED','REJECTED')`),
  ]);
  return {
    opportunities: Number(opportunities[0]?.count ?? 0),
    suppliers: Number(suppliers[0]?.count ?? 0),
    fleet: Number(fleet[0]?.count ?? 0),
    pending_approvals: Number(pendingApprovals[0]?.count ?? 0),
    inventory_available: Number(inventoryAvailable[0]?.count ?? 0),
    open_claims: Number(openClaims[0]?.count ?? 0),
  };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="text-2xl font-semibold text-amber-400">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

export default async function DashboardHomePage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const counts = await loadCounts();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{dict.nav.dashboard}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label={dict.nav.opportunities} value={counts.opportunities} />
        <StatCard label={dict.nav.suppliers} value={counts.suppliers} />
        <StatCard label={dict.nav.fleet} value={counts.fleet} />
        <StatCard label={dict.owner.title} value={counts.pending_approvals} />
        <StatCard label={dict.nav.inventory} value={counts.inventory_available} />
        <StatCard label={dict.nav.claims} value={counts.open_claims} />
      </div>
    </div>
  );
}

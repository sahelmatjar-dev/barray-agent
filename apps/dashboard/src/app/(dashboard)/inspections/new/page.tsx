import { listOpportunitiesAwaitingInspection } from "@barray/database";
import { InspectionForm } from "@/components/inspection-form";

export default async function NewInspectionPage() {
  const opportunities = await listOpportunitiesAwaitingInspection();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New inspection</h1>
      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-500">No opportunities are currently awaiting inspection.</p>
      ) : (
        <InspectionForm opportunities={opportunities} />
      )}
    </div>
  );
}

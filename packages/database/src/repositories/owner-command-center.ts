import { ApprovalGate } from "@barray/shared";
import { query } from "../pool";

export interface OwnerDecisionCard {
  approvalId: string;
  gate: ApprovalGate;
  opportunityCode: string | null;
  supplierName: string | null;
  truckLabel: string | null;
  vin: string | null;
  askingPrice: number | null;
  currency: string | null;
  compatibilityScore: number | null;
  supplierTrustScore: number | null;
  mechanicalScore: number | null;
  fraudRisk: string | null;
  estimatedLandedCost: number | null;
  estimatedPartsValue: number | null;
  savingsPct: number | null;
  aiRecommendation: string | null;
  requestedAt: string;
}

/**
 * Feeds the Owner Command Center: every pending APPROVE_SUPPLIER,
 * APPROVE_INSPECTION and APPROVE_PURCHASE approval, enriched with the
 * opportunity snapshot the owner needs to decide without leaving the page.
 * Numbers shown here are always the last deterministically-computed values
 * (never re-derived by AI at render time).
 */
export async function listOwnerDecisionCards(): Promise<OwnerDecisionCard[]> {
  const rows = await query<{
    approval_id: string;
    gate: ApprovalGate;
    requested_at: string;
    opportunity_code: string | null;
    supplier_name: string | null;
    model: string | null;
    configuration: string | null;
    year: number | null;
    vin: string | null;
    asking_price: string | null;
    currency: string | null;
    compatibility_score: number | null;
    supplier_trust_score: number | null;
    mechanical_score: number | null;
    fraud_risk: string | null;
    estimated_landed_cost: string | null;
    estimated_parts_value: string | null;
    ai_recommendation: string | null;
  }>(`
    SELECT
      a.id AS approval_id,
      a.gate,
      a.created_at AS requested_at,
      o.code AS opportunity_code,
      COALESCE(s.legal_name, s2.legal_name) AS supplier_name,
      o.model, o.configuration, o.year, o.vin,
      o.asking_price, o.currency,
      o.compatibility_score, o.supplier_trust_score, o.mechanical_score,
      o.fraud_risk, o.estimated_landed_cost, o.estimated_parts_value, o.ai_recommendation
    FROM approvals a
    LEFT JOIN opportunities o ON (
      (a.gate = 'APPROVE_PURCHASE' AND a.entity = 'opportunity' AND o.id = a.entity_id)
      OR (a.gate = 'APPROVE_INSPECTION' AND a.entity = 'inspection' AND o.id = (SELECT i.opportunity_id FROM inspections i WHERE i.id = a.entity_id))
    )
    LEFT JOIN suppliers s ON (a.gate = 'APPROVE_SUPPLIER' AND a.entity = 'supplier' AND s.id = a.entity_id)
    LEFT JOIN suppliers s2 ON s2.id = o.supplier_id
    WHERE a.status = 'PENDING' AND a.gate IN ('APPROVE_SUPPLIER', 'APPROVE_INSPECTION', 'APPROVE_PURCHASE')
    ORDER BY a.created_at ASC
  `);

  return rows.map((r) => {
    const landed = r.estimated_landed_cost ? Number(r.estimated_landed_cost) : null;
    const partsValue = r.estimated_parts_value ? Number(r.estimated_parts_value) : null;
    const savingsPct = landed && partsValue && partsValue > 0 ? Math.round(((partsValue - landed) / partsValue) * 10000) / 100 : null;

    return {
      approvalId: r.approval_id,
      gate: r.gate,
      opportunityCode: r.opportunity_code,
      supplierName: r.supplier_name,
      truckLabel: r.model ? `SITRAK ${r.model} ${r.configuration ?? ""}`.trim() : null,
      vin: r.vin,
      askingPrice: r.asking_price ? Number(r.asking_price) : null,
      currency: r.currency,
      compatibilityScore: r.compatibility_score,
      supplierTrustScore: r.supplier_trust_score,
      mechanicalScore: r.mechanical_score,
      fraudRisk: r.fraud_risk,
      estimatedLandedCost: landed,
      estimatedPartsValue: partsValue,
      savingsPct,
      aiRecommendation: r.ai_recommendation,
      requestedAt: r.requested_at,
    };
  });
}

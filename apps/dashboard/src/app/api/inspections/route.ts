import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createInspectionWithFindings, createApprovalRequest } from "@barray/database";
import { calculateMechanicalScore, INSPECTION_CHECKLIST } from "@barray/shared";
import { getSession } from "@/lib/auth";

const FindingSchema = z.object({
  category: z.enum(["ENGINE", "GEARBOX", "AXLES", "CHASSIS", "ELECTRONICS", "HYDRAULIC"]),
  item_code: z.string(),
  result: z.enum(["PASS", "WARNING", "FAIL", "UNKNOWN"]),
});

const Schema = z.object({
  opportunityId: z.string().uuid(),
  inspectorName: z.string().min(1),
  findings: z.array(FindingSchema),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["OWNER", "PROCUREMENT_MANAGER", "MECHANIC"].includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  // Server-side sanity check: every checklist item must be present exactly
  // once (the client can't silently drop items to inflate the score).
  const expectedCount = Object.values(INSPECTION_CHECKLIST).reduce((sum, items) => sum + items.length, 0);
  if (parsed.data.findings.length !== expectedCount) {
    return NextResponse.json({ error: `Expected ${expectedCount} findings, got ${parsed.data.findings.length}` }, { status: 400 });
  }

  const result = calculateMechanicalScore(parsed.data.findings);

  const inspectionId = await createInspectionWithFindings({
    opportunityId: parsed.data.opportunityId,
    inspectorName: parsed.data.inspectorName,
    findings: parsed.data.findings,
    mechanicalScore: result.score,
    recommendation: result.recommendation,
  });

  await createApprovalRequest("APPROVE_INSPECTION", "inspection", inspectionId, { mechanicalScore: result.score, recommendation: result.recommendation }, session.sub);

  return NextResponse.json({ ok: true, inspectionId, score: result.score, recommendation: result.recommendation });
}

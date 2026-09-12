export type InspectionCategory = "ENGINE" | "GEARBOX" | "AXLES" | "CHASSIS" | "ELECTRONICS" | "HYDRAULIC";
export type FindingResult = "PASS" | "WARNING" | "FAIL" | "UNKNOWN";

export const INSPECTION_CHECKLIST: Record<InspectionCategory, string[]> = {
  ENGINE: ["cold_start", "smoke", "blow_by", "oil_pressure", "leaks", "noise", "turbo", "coolant", "injectors"],
  GEARBOX: ["shifting", "noise", "leaks", "clutch"],
  AXLES: ["differential_noise", "leaks", "bearings"],
  CHASSIS: ["cracks", "welding", "deformation", "accident_evidence"],
  ELECTRONICS: ["fault_codes", "ecu", "dashboard", "sensors"],
  HYDRAULIC: ["pto", "pump", "cylinder", "hoses"],
};

/** Category weights sum to 100; item weights within a category are equal. */
const CATEGORY_WEIGHTS: Record<InspectionCategory, number> = {
  ENGINE: 35,
  GEARBOX: 20,
  AXLES: 15,
  CHASSIS: 15,
  ELECTRONICS: 10,
  HYDRAULIC: 5,
};

export interface InspectionFinding {
  category: InspectionCategory;
  item_code: string;
  result: FindingResult;
}

export interface MechanicalScoreResult {
  score: number;
  categoryScores: Record<InspectionCategory, number>;
  recommendation: "PASS" | "MANUAL_REVIEW" | "REJECT";
  failCount: number;
}

const RESULT_VALUE: Record<FindingResult, number> = {
  PASS: 1,
  WARNING: 0.5,
  FAIL: 0,
  UNKNOWN: 0.5, // unknown is treated as neutral, never assumed passing
};

export function calculateMechanicalScore(findings: InspectionFinding[]): MechanicalScoreResult {
  const categoryScores = {} as Record<InspectionCategory, number>;
  let failCount = 0;

  for (const category of Object.keys(INSPECTION_CHECKLIST) as InspectionCategory[]) {
    const items = INSPECTION_CHECKLIST[category];
    const categoryFindings = findings.filter((f) => f.category === category);
    if (categoryFindings.length === 0) {
      categoryScores[category] = 50; // fully unassessed category => neutral, forces manual review
      continue;
    }
    const sum = items.reduce((acc, itemCode) => {
      const finding = categoryFindings.find((f) => f.item_code === itemCode);
      if (!finding) return acc + RESULT_VALUE.UNKNOWN;
      if (finding.result === "FAIL") failCount++;
      return acc + RESULT_VALUE[finding.result];
    }, 0);
    categoryScores[category] = (sum / items.length) * 100;
  }

  const score = Math.round(
    (Object.keys(CATEGORY_WEIGHTS) as InspectionCategory[]).reduce(
      (sum, cat) => sum + (categoryScores[cat] / 100) * CATEGORY_WEIGHTS[cat],
      0,
    ),
  );

  const recommendation: MechanicalScoreResult["recommendation"] =
    failCount >= 3 || score < 50 ? "REJECT" : score < 70 ? "MANUAL_REVIEW" : "PASS";

  return { score, categoryScores, recommendation, failCount };
}

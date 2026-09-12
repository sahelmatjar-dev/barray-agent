import { describe, expect, it } from "vitest";
import { calculateMechanicalScore, InspectionFinding } from "../../packages/shared/src/inspection-checklist";

function allPass(): InspectionFinding[] {
  const findings: InspectionFinding[] = [];
  const items: Record<string, string[]> = {
    ENGINE: ["cold_start", "smoke", "blow_by", "oil_pressure", "leaks", "noise", "turbo", "coolant", "injectors"],
    GEARBOX: ["shifting", "noise", "leaks", "clutch"],
    AXLES: ["differential_noise", "leaks", "bearings"],
    CHASSIS: ["cracks", "welding", "deformation", "accident_evidence"],
    ELECTRONICS: ["fault_codes", "ecu", "dashboard", "sensors"],
    HYDRAULIC: ["pto", "pump", "cylinder", "hoses"],
  };
  for (const [category, codes] of Object.entries(items)) {
    for (const item_code of codes) {
      findings.push({ category: category as InspectionFinding["category"], item_code, result: "PASS" });
    }
  }
  return findings;
}

describe("calculateMechanicalScore", () => {
  it("scores all-pass findings at 100 with a PASS recommendation", () => {
    const result = calculateMechanicalScore(allPass());
    expect(result.score).toBe(100);
    expect(result.recommendation).toBe("PASS");
  });

  it("recommends REJECT when 3+ items fail", () => {
    const findings = allPass();
    findings[0] = { ...findings[0], result: "FAIL" };
    findings[1] = { ...findings[1], result: "FAIL" };
    findings[2] = { ...findings[2], result: "FAIL" };
    const result = calculateMechanicalScore(findings);
    expect(result.recommendation).toBe("REJECT");
  });

  it("recommends MANUAL_REVIEW for a score below 70", () => {
    const findings = allPass().map((f) =>
      ["ENGINE", "GEARBOX", "AXLES"].includes(f.category) ? { ...f, result: "WARNING" as const } : f,
    );
    const result = calculateMechanicalScore(findings);
    expect(result.score).toBeLessThan(70);
    expect(result.recommendation).toBe("MANUAL_REVIEW");
  });

  it("treats a completely unassessed category as neutral, forcing a non-PASS result", () => {
    const findings = allPass().filter((f) => f.category !== "HYDRAULIC");
    const result = calculateMechanicalScore(findings);
    expect(result.categoryScores.HYDRAULIC).toBe(50);
  });
});

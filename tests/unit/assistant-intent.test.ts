import { describe, expect, it } from "vitest";
import { classifyAssistantQuestion } from "../../packages/shared/src/assistant-intent";

describe("classifyAssistantQuestion", () => {
  it("classifies 'top N trucks' in Arabic", () => {
    expect(classifyAssistantQuestion("اعطني افضل 5 شاحنات حاليا")).toEqual({ type: "TOP_OPPORTUNITIES", limit: 5 });
  });

  it("classifies an engine search in Arabic", () => {
    expect(classifyAssistantQuestion("ما هي الشاحنات التي تحتوي على MC13؟")).toEqual({
      type: "SEARCH_BY_ENGINE", engine: "MC13",
    });
  });

  it("classifies a supplier rejection question", () => {
    const result = classifyAssistantQuestion("لماذا رفض النظام هذا المورد؟");
    expect(result.type).toBe("SUPPLIER_REJECTION_REASON");
  });

  it("classifies an opportunity-vs-fleet comparison", () => {
    expect(classifyAssistantQuestion("قارن EBR-OPP-2026-0017 مع شاحناتنا")).toEqual({
      type: "COMPARE_OPPORTUNITY_TO_FLEET", opportunityCode: "EBR-OPP-2026-0017",
    });
  });

  it("classifies a donor landed-cost question", () => {
    expect(classifyAssistantQuestion("كم تكلفة EBR-CN-005 حتى العيون؟")).toEqual({
      type: "DONOR_LANDED_COST", donorCode: "EBR-CN-005",
    });
  });

  it("classifies an available-engines question", () => {
    expect(classifyAssistantQuestion("ما هي المحركات المتوفرة في المخزن؟")).toEqual({
      type: "AVAILABLE_ENGINES_IN_STOCK",
    });
  });

  it("classifies a YTD savings question with an implied current year", () => {
    const result = classifyAssistantQuestion("كم وفرنا هذه السنة؟", new Date("2026-05-01"));
    expect(result).toEqual({ type: "YTD_SAVINGS", year: 2026 });
  });

  it("falls back to UNKNOWN for an unrelated question rather than guessing", () => {
    const result = classifyAssistantQuestion("ما هو الطقس اليوم؟");
    expect(result.type).toBe("UNKNOWN");
  });
});

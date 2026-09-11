import { describe, expect, it } from "vitest";
import { formatAssistantAnswer } from "../../packages/shared/src/assistant-formatter";

describe("formatAssistantAnswer", () => {
  it("renders top opportunities using only the given data", () => {
    const text = formatAssistantAnswer(
      { type: "TOP_OPPORTUNITIES", limit: 5 },
      [{ code: "EBR-OPP-2026-0001", model: "C7H", best_value_score: 88, asking_price: "17800", currency: "USD" }],
      "en",
    );
    expect(text).toContain("EBR-OPP-2026-0001");
    expect(text).toContain("88/100");
    expect(text).toContain("17800 USD");
  });

  it("never fabricates a number for YTD savings — computes from the two given totals", () => {
    const text = formatAssistantAnswer(
      { type: "YTD_SAVINGS", year: 2026 },
      { total_landed_cost: "27600", total_parts_value: "41000" },
      "en",
    );
    expect(text).toContain("13,400");
  });

  it("returns a no-data message rather than guessing when nothing was found", () => {
    const text = formatAssistantAnswer({ type: "DONOR_LANDED_COST", donorCode: "EBR-CN-999" }, null, "ar");
    expect(text).toBe("لم أجد بيانات مطابقة في قاعدة البيانات.");
  });

  it("returns a scoped capability message for an unknown question, not a hallucinated answer", () => {
    const text = formatAssistantAnswer({ type: "UNKNOWN", question: "..." }, null, "fr");
    expect(text).toMatch(/Je ne peux pas encore répondre/);
  });
});

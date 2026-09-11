import { describe, expect, it } from "vitest";
import {
  buildDonorCategoryFolderPath,
  buildDonorFolderPath,
  DONOR_DOCUMENT_CATEGORIES,
} from "../../packages/integrations/src/drive/folder-hierarchy";

describe("Drive folder hierarchy", () => {
  it("builds the donor root path", () => {
    expect(buildDonorFolderPath(2026, "EBR-CN-001")).toEqual([
      "EL BARRAY RA", "China Sourcing", "2026", "EBR-CN-001",
    ]);
  });

  it("builds a category path under the donor root", () => {
    expect(buildDonorCategoryFolderPath(2026, "EBR-CN-001", "16 Customs")).toEqual([
      "EL BARRAY RA", "China Sourcing", "2026", "EBR-CN-001", "16 Customs",
    ]);
  });

  it("defines exactly the 18 required categories", () => {
    expect(DONOR_DOCUMENT_CATEGORIES).toHaveLength(18);
    expect(DONOR_DOCUMENT_CATEGORIES[0]).toBe("01 Supplier");
    expect(DONOR_DOCUMENT_CATEGORIES[17]).toBe("18 Claims");
  });
});

export type PartStatus = "AVAILABLE" | "RESERVED" | "INSTALLED" | "UNDER_TEST" | "DAMAGED" | "SOLD" | "SCRAPPED";
export type MovementType =
  | "RECEIVED" | "MOVED" | "RESERVED" | "RELEASED" | "INSTALLED" | "REMOVED" | "SOLD" | "SCRAPPED" | "ADJUSTED";

/** Allowed part_status transitions per inventory movement type. */
const MOVEMENT_TRANSITIONS: Record<MovementType, { from: PartStatus[]; to: PartStatus }> = {
  RECEIVED: { from: [], to: "AVAILABLE" }, // first movement, no prior status required
  MOVED: { from: ["AVAILABLE", "RESERVED", "UNDER_TEST"], to: "AVAILABLE" },
  RESERVED: { from: ["AVAILABLE"], to: "RESERVED" },
  RELEASED: { from: ["RESERVED"], to: "AVAILABLE" },
  INSTALLED: { from: ["AVAILABLE", "RESERVED", "UNDER_TEST"], to: "INSTALLED" },
  REMOVED: { from: ["INSTALLED"], to: "AVAILABLE" },
  SOLD: { from: ["AVAILABLE", "RESERVED"], to: "SOLD" },
  SCRAPPED: { from: ["AVAILABLE", "DAMAGED", "UNDER_TEST"], to: "SCRAPPED" },
  ADJUSTED: { from: ["AVAILABLE", "RESERVED", "UNDER_TEST", "DAMAGED"], to: "DAMAGED" },
};

export function canApplyMovement(
  currentStatus: PartStatus | null,
  movementType: MovementType,
): boolean {
  const rule = MOVEMENT_TRANSITIONS[movementType];
  if (movementType === "RECEIVED") return currentStatus === null;
  if (currentStatus === null) return false;
  return rule.from.includes(currentStatus);
}

export function applyMovement(currentStatus: PartStatus | null, movementType: MovementType): PartStatus {
  if (!canApplyMovement(currentStatus, movementType)) {
    throw new Error(`Cannot apply movement ${movementType} to part in status ${currentStatus ?? "NONE"}`);
  }
  return MOVEMENT_TRANSITIONS[movementType].to;
}

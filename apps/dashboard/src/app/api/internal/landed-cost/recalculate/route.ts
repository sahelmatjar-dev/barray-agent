import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDonorTruck, sumExpensesForDonor, getPurchasePriceForDonor, upsertLandedCost } from "@barray/database";
import { calculateLandedCost } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ donorId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const donor = await getDonorTruck(parsed.data.donorId);
  if (!donor) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [purchasePrice, expenses] = await Promise.all([
    getPurchasePriceForDonor(donor.id),
    sumExpensesForDonor(donor.id),
  ]);

  const breakdown = calculateLandedCost({ purchasePrice, ...expenses });
  await upsertLandedCost(donor.id, breakdown);

  return NextResponse.json({ ok: true, entityId: donor.id, ...breakdown });
}

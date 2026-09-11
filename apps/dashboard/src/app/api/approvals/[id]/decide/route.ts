import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decideApproval } from "@barray/database";
import { ApprovalGateError } from "@barray/shared";
import { getSession } from "@/lib/auth";

const Schema = z.object({
  decision: z.enum(["APPROVED", "REJECTED", "MORE_INFO_REQUESTED"]),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    const result = await decideApproval(id, parsed.data.decision, session.sub, session.roles, parsed.data.reason);
    return NextResponse.json({ ok: true, approval: result });
  } catch (err) {
    if (err instanceof ApprovalGateError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

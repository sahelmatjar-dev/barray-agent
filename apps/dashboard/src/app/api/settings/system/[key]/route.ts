import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSystemSetting } from "@barray/database";
import { getSession } from "@/lib/auth";

const Schema = z.object({ value: z.unknown() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("OWNER")) {
    return NextResponse.json({ error: "Only OWNER may change system settings" }, { status: 403 });
  }

  const { key } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await updateSystemSetting(key, parsed.data.value, session.sub);
  return NextResponse.json({ ok: true });
}

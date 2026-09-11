import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@barray/database";
import { getSession, createSessionCookie } from "@/lib/auth";

const Schema = z.object({ locale: z.enum(["ar", "fr", "en"]) });

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await query(`UPDATE users SET locale = $1 WHERE id = $2`, [parsed.data.locale, session.sub]);
  await createSessionCookie({ ...session, locale: parsed.data.locale });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { getNegotiationMessageSendContext, markNegotiationMessageSent, writeAuditLog } from "@barray/database";
import { GmailClient, loadGoogleOAuthConfigFromEnv, IntegrationNotConfiguredError } from "@barray/integrations";
import { getSession } from "@/lib/auth";

/**
 * The only path by which an AI-drafted negotiation message actually leaves
 * the building. Requires an authenticated human to click send — the AI
 * never calls this itself (see docs/safety-rules.md and
 * packages/ai/src/tasks/draft-negotiation.ts).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const message = await getNegotiationMessageSendContext(id);
  if (!message) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (message.status !== "PENDING_APPROVAL" && message.status !== "DRAFT") {
    return NextResponse.json({ error: `Message is already ${message.status}` }, { status: 409 });
  }
  if (!message.supplier_email) {
    return NextResponse.json({ error: "Supplier has no primary contact email on file" }, { status: 422 });
  }

  try {
    const oauthConfig = loadGoogleOAuthConfigFromEnv();
    const gmail = new GmailClient(oauthConfig);
    const sent = await gmail.sendEmail({
      to: message.supplier_email,
      subject: `Re: ${message.opportunity_code} — Negotiation`,
      bodyHtml: message.body.replace(/\n/g, "<br/>"),
    });
    await markNegotiationMessageSent(id, sent.messageId);
  } catch (err) {
    if (err instanceof IntegrationNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    return NextResponse.json({ error: err instanceof Error ? err.message : "send failed" }, { status: 502 });
  }

  await writeAuditLog({
    userId: session.sub,
    action: "NEGOTIATION_MESSAGE_SENT",
    entity: "negotiation",
    entityId: message.negotiation_id,
    reason: "Human-approved send of an AI-drafted negotiation message.",
  });

  return NextResponse.json({ ok: true });
}

import { notFound } from "next/navigation";
import { getNegotiation, listNegotiationMessages } from "@barray/database";
import { NegotiationMessageSend } from "@/components/negotiation-message-send";

export default async function NegotiationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const negotiation = await getNegotiation(id) as Record<string, unknown> | null;
  if (!negotiation) notFound();

  const messages = await listNegotiationMessages(id) as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Negotiation</h1>
        <p className="text-sm text-slate-400">
          Asking {Number(negotiation.asking_price).toLocaleString()} · Target {Number(negotiation.target_price).toLocaleString()} ·
          Maximum {Number(negotiation.maximum_price).toLocaleString()} {negotiation.currency as string}
        </p>
        <span className="mt-1 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-xs">{negotiation.status as string}</span>
      </div>

      <div className="space-y-3">
        {messages.map((m) => (
          <div key={m.id as string} className={`max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-4 ${m.direction === "OUTBOUND" ? "ms-auto" : ""}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
              <span>{m.direction as string} {m.drafted_by_ai ? "· AI draft" : ""}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5">{m.status as string}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-200">{m.body as string}</p>
            {m.status === "PENDING_APPROVAL" && <NegotiationMessageSend messageId={m.id as string} />}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
      </div>
    </div>
  );
}

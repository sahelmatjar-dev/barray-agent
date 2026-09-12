"use client";

import { useState } from "react";
import { Locale } from "@/i18n/dictionaries";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const PLACEHOLDER: Record<Locale, string> = {
  ar: "اسأل عن الفرص، الموردين، المخزون، أو التوفير...",
  fr: "Posez une question sur les opportunités, fournisseurs, stock, ou économies...",
  en: "Ask about opportunities, suppliers, inventory, or savings...",
};

export function AssistantChat({ locale }: { locale: Locale }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim() || busy) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = await res.json();
      setMessages((m) => [...m, { role: "assistant", text: body.answer ?? body.error ?? "Error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-lg border border-slate-800 bg-slate-900">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
            m.role === "user" ? "ms-auto bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-100"
          }`}>
            {m.text}
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-slate-500">{PLACEHOLDER[locale]}</p>}
      </div>
      <div className="flex gap-2 border-t border-slate-800 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={PLACEHOLDER[locale]}
          className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
        />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {locale === "ar" ? "إرسال" : locale === "fr" ? "Envoyer" : "Send"}
        </button>
      </div>
    </div>
  );
}

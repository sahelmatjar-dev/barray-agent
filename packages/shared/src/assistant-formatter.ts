import { AssistantIntent } from "./assistant-intent";

export type AssistantLocale = "ar" | "fr" | "en";

const NO_DATA: Record<AssistantLocale, string> = {
  ar: "لم أجد بيانات مطابقة في قاعدة البيانات.",
  fr: "Aucune donnée correspondante trouvée dans la base de données.",
  en: "No matching data found in the database.",
};

const UNKNOWN_QUESTION: Record<AssistantLocale, string> = {
  ar: "لا يمكنني الإجابة على هذا السؤال بعد. يمكنني حالياً الإجابة عن: أفضل الفرص، البحث عن محرك معين، سبب رفض مورد، مقارنة فرصة مع أسطولنا، تكلفة شاحنة تفكيك، المحركات المتوفرة، والتوفير خلال السنة.",
  fr: "Je ne peux pas encore répondre à cette question. Je peux actuellement répondre sur : les meilleures opportunités, la recherche par moteur, le motif de rejet d'un fournisseur, la comparaison d'une opportunité avec notre flotte, le coût rendu d'un camion donneur, les moteurs disponibles, et les économies de l'année.",
  en: "I can't answer this question yet. I can currently answer about: top opportunities, searching by engine, why a supplier was rejected, comparing an opportunity to our fleet, a donor truck's landed cost, available engines in stock, and this year's savings.",
};

/**
 * Deterministic, data-only answer formatting — this is the fallback (and
 * default) renderer for the in-app AI assistant. It never invents a number;
 * every value comes straight from the retrieved rows. packages/ai's
 * answer-assistant-question task may rephrase this text more naturally, but
 * must not change any figure in it (see docs/safety-rules.md).
 */
export function formatAssistantAnswer(intent: AssistantIntent, data: unknown, locale: AssistantLocale): string {
  switch (intent.type) {
    case "TOP_OPPORTUNITIES": {
      const rows = data as { code: string; model: string; best_value_score: number; asking_price: string | null; currency: string }[];
      if (!rows?.length) return NO_DATA[locale];
      return rows
        .map((r, i) => `${i + 1}. ${r.code} — SITRAK ${r.model} — ${r.best_value_score}/100 — ${r.asking_price ?? "?"} ${r.currency}`)
        .join("\n");
    }
    case "SEARCH_BY_ENGINE": {
      const rows = data as { code: string; model: string; engine: string; status: string }[];
      if (!rows?.length) return NO_DATA[locale];
      return rows.map((r) => `${r.code} — SITRAK ${r.model} — ${r.engine} — ${r.status}`).join("\n");
    }
    case "SUPPLIER_REJECTION_REASON": {
      const row = data as { legal_name: string; reason: string; created_at: string } | null;
      if (!row) return NO_DATA[locale];
      return `${row.legal_name}: ${row.reason} (${row.created_at})`;
    }
    case "COMPARE_OPPORTUNITY_TO_FLEET": {
      const row = data as { score: number; reasons: { component: string; match_type: string }[] } | null;
      if (!row) return NO_DATA[locale];
      const lines = row.reasons.map((r) => `- ${r.component}: ${r.match_type}`);
      return `${intent.opportunityCode}: ${row.score}/100\n${lines.join("\n")}`;
    }
    case "DONOR_LANDED_COST": {
      const row = data as { code: string; total_landed_cost: string; currency: string } | null;
      if (!row) return NO_DATA[locale];
      return `${row.code}: ${row.total_landed_cost} ${row.currency}`;
    }
    case "AVAILABLE_ENGINES_IN_STOCK": {
      const rows = data as { part_code: string; condition: string }[];
      if (!rows?.length) return NO_DATA[locale];
      return rows.map((r) => `${r.part_code} (${r.condition})`).join("\n");
    }
    case "YTD_SAVINGS": {
      const row = data as { total_landed_cost: string; total_parts_value: string } | null;
      if (!row) return NO_DATA[locale];
      const landed = Number(row.total_landed_cost);
      const value = Number(row.total_parts_value);
      const savings = value - landed;
      return `${intent.year}: ${savings.toLocaleString()} (parts value ${value.toLocaleString()} − landed cost ${landed.toLocaleString()})`;
    }
    case "UNKNOWN":
    default:
      return UNKNOWN_QUESTION[locale];
  }
}

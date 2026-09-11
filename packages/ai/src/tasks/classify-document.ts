import { AiProvider } from "../provider";

export type DocumentCategory =
  | "BUSINESS_LICENSE" | "EXPORT_LICENSE" | "AUDIT_REPORT" | "QUOTE" | "INVOICE"
  | "PACKING_LIST" | "BILL_OF_LADING" | "INSPECTION_REPORT" | "PHOTO" | "VIDEO" | "OTHER";

export interface DocumentClassification {
  category: DocumentCategory;
  confidence: number;
  extractedSummary: string;
}

const SYSTEM_PROMPT = `You classify a document's text/OCR excerpt into one of the fixed categories:
BUSINESS_LICENSE, EXPORT_LICENSE, AUDIT_REPORT, QUOTE, INVOICE, PACKING_LIST, BILL_OF_LADING,
INSPECTION_REPORT, PHOTO, VIDEO, OTHER. Respond with strict JSON: {category, confidence, extractedSummary}.
Never guess facts not present in the text; extractedSummary must only restate what is written.`;

export async function classifyDocument(provider: AiProvider, textExcerpt: string): Promise<DocumentClassification> {
  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: `Classify this document excerpt:\n\n"""\n${textExcerpt.slice(0, 4000)}\n"""`,
    jsonMode: true,
    maxTokens: 400,
  });
  try {
    return JSON.parse(result.text);
  } catch {
    throw new Error(`AI document classification did not return valid JSON: ${result.text.slice(0, 200)}`);
  }
}

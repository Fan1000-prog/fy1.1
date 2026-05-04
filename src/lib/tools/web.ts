import { callGemini } from "@/lib/gemini";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import type { Source } from "@/types/message";

export interface WebResult {
  text: string;
  sources: Source[];
}

export async function runWebSearch(query: string, locale: Lang): Promise<WebResult> {
  const detectedLang = detectLanguage(query);
  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const { text, groundingChunks } = await callGemini({
    systemPrompt,
    contents: [{ role: "user", parts: [{ text: query }] }],
    tools: [{ google_search: {} }],
  });

  const sources: Source[] = (groundingChunks ?? [])
    .filter((c) => c.web?.uri)
    .slice(0, 5)
    .map((c) => ({ uri: c.web!.uri, title: c.web!.title || c.web!.uri }));

  return { text, sources };
}

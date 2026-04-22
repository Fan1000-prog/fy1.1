import { NextRequest } from "next/server";
import { callGemini } from "@/lib/gemini";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import type { Source } from "@/types/message";

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { message, locale = "fr", history = [] }: {
      message: string;
      locale: Lang;
      history: ClientMessage[];
    } = await req.json();

    if (!message?.trim()) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }

    const detectedLang = detectLanguage(message);
    const systemPrompt = buildSystemPrompt(locale, detectedLang);

    const contents = [
      ...history.map((m) => ({
        role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
        parts: [{ text: m.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const { text, groundingChunks } = await callGemini({
      systemPrompt,
      contents,
      tools: [{ google_search: {} }],
    });

    const sources: Source[] = (groundingChunks ?? [])
      .filter((c) => c.web?.uri)
      .slice(0, 5)
      .map((c) => ({ uri: c.web!.uri, title: c.web!.title || c.web!.uri }));

    return Response.json({ text, sources });
  } catch (err) {
    console.error("[/api/tools/web]", err);
    return Response.json({ error: "web_search_failed" }, { status: 200 });
  }
}

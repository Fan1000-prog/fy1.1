import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";

const VALID_LOCALES = new Set<string>(["fr", "mg", "en"]);
const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 8_000;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.VERTEX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  let body: { messages: unknown; locale?: unknown; file?: { base64: string; mimeType: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages: rawMessages, locale: rawLocale, file } = body;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
  }

  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }

  const messages: ClientMessage[] = rawMessages
    .filter(
      (m): m is ClientMessage =>
        m !== null &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  const locale: Lang = VALID_LOCALES.has(rawLocale as string) ? (rawLocale as Lang) : "fr";

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const detectedLang = lastUserMessage ? detectLanguage(lastUserMessage.content) : locale;

  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const contents = messages.map((m, i) => {
    const isLastUser =
      i === messages.length - 1 && m.role === "user" && file?.base64;
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: isLastUser
        ? [
            { text: m.content },
            { inline_data: { mime_type: file!.mimeType, data: file!.base64 } },
          ]
        : [{ text: m.content }],
    };
  });

  let res: Response;
  try {
    res = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to reach AI service" }, { status: 502 });
  }

  if (!res.ok) {
    console.error(`Vertex AI error ${res.status}:`, await res.text());
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return NextResponse.json({ text });
}

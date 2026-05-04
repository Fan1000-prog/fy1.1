import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import { callGemini, type GeminiContent, type GeminiPart } from "@/lib/gemini";
import { TOOL_DECLARATIONS, dispatch } from "@/lib/tools";

const VALID_LOCALES = new Set<string>(["fr", "mg", "en"]);
const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 8_000;
const MAX_ROUNDS = 3;
const WALL_CLOCK_MS = 60_000;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.VERTEX_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  let body: {
    messages: unknown;
    locale?: unknown;
    file?: { base64: string; mimeType: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages: rawMessages, locale: rawLocale, file } = body;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { error: "messages must be a non-empty array" },
      { status: 400 }
    );
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }

  const messages: ClientMessage[] = rawMessages
    .filter(
      (m): m is ClientMessage =>
        m !== null &&
        typeof m === "object" &&
        ((m as ClientMessage).role === "user" ||
          (m as ClientMessage).role === "assistant") &&
        typeof (m as ClientMessage).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  const locale: Lang = VALID_LOCALES.has(rawLocale as string)
    ? (rawLocale as Lang)
    : "fr";
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const detectedLang = lastUserMessage
    ? detectLanguage(lastUserMessage.content)
    : locale;
  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const turn: GeminiContent[] = messages.map((m, i) => {
    const isLastUserWithFile =
      i === messages.length - 1 && m.role === "user" && file?.base64;
    const parts: GeminiPart[] = isLastUserWithFile
      ? [
          { text: m.content },
          { inline_data: { mime_type: file!.mimeType, data: file!.base64 } },
        ]
      : [{ text: m.content }];
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const audio =
    file?.mimeType?.startsWith("audio/")
      ? { base64: file.base64, mimeType: file.mimeType }
      : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WALL_CLOCK_MS);

  try {
    for (let rounds = 0; rounds < MAX_ROUNDS; rounds++) {
      const { text, functionCall } = await callGemini({
        systemPrompt,
        contents: turn,
        tools: [{ function_declarations: TOOL_DECLARATIONS }],
        signal: controller.signal,
      });

      if (!functionCall) {
        return NextResponse.json({ text });
      }

      let result: string;
      try {
        result = await dispatch(functionCall.name, functionCall.args, {
          audio,
          locale,
        });
      } catch (e) {
        result = JSON.stringify({
          error: e instanceof Error ? e.message : "tool_failed",
        });
      }

      turn.push({
        role: "model",
        parts: [{ functionCall }],
      });
      turn.push({
        role: "user",
        parts: [
          { functionResponse: { name: functionCall.name, response: { result } } },
        ],
      });
    }

    // Hit MAX_ROUNDS — force a final text-only call.
    const final = await callGemini({
      systemPrompt,
      contents: turn,
      signal: controller.signal,
    });
    return NextResponse.json({ text: final.text });
  } catch (err) {
    console.error("[/api/chat] orchestrator error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

import { NextRequest } from "next/server";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import { streamGemini, type GeminiContent, type GeminiPart } from "@/lib/gemini";
import { TOOL_DECLARATIONS, dispatch, type ToolArtifacts } from "@/lib/tools";

export const maxDuration = 60;

const VALID_LOCALES = new Set<string>(["fr", "mg", "en"]);
const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 8_000;
const MAX_ROUNDS = 3;
const WALL_CLOCK_MS = 60_000;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * One NDJSON line per event. NDJSON rather than SSE because the client just
 * needs ordered frames, and it survives proxies that mangle `text/event-stream`.
 */
type StreamEvent =
  | { type: "tool"; name: string }
  | { type: "text"; delta: string }
  | { type: "artifacts"; artifacts: ToolArtifacts }
  /** Discard text streamed so far: it was preamble to a tool call, not the answer. */
  | { type: "reset" }
  | { type: "done" }
  | { type: "error"; message: string };

function parseMessages(raw: unknown): ClientMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_MESSAGES)
    .filter(
      (m): m is ClientMessage =>
        m !== null &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }));
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!process.env.VERTEX_API_KEY) {
    return jsonError("API key not configured", 500);
  }

  let body: {
    messages?: unknown;
    locale?: unknown;
    file?: { base64: string; mimeType: string };
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid request body", 400);
  }

  const messages = parseMessages(body.messages);
  if (messages.length === 0) {
    return jsonError("messages must be a non-empty array", 400);
  }

  const locale: Lang = VALID_LOCALES.has(body.locale as string)
    ? (body.locale as Lang)
    : "fr";
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const detectedLang = lastUserMessage
    ? detectLanguage(lastUserMessage.content, locale)
    : locale;
  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const file = body.file;
  const turn: GeminiContent[] = messages.map((m, i) => {
    const attachHere = i === messages.length - 1 && m.role === "user" && file?.base64;
    const parts: GeminiPart[] = attachHere
      ? [
          { text: m.content },
          { inline_data: { mime_type: file!.mimeType, data: file!.base64 } },
        ]
      : [{ text: m.content }];
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const audio = file?.mimeType?.startsWith("audio/")
    ? { base64: file.base64, mimeType: file.mimeType }
    : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WALL_CLOCK_MS);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      const send = (event: StreamEvent) =>
        ctrl.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          const lastRound = round === MAX_ROUNDS - 1;
          const { textDeltas, done } = await streamGemini({
            systemPrompt,
            contents: turn,
            // On the final round drop the tools so the model must answer in
            // text instead of requesting a call we would have to discard.
            tools: lastRound
              ? undefined
              : [{ function_declarations: TOOL_DECLARATIONS }],
            signal: controller.signal,
          });

          // Forward text the moment it arrives — waiting for the turn to finish
          // would give back the blocking latency streaming exists to remove.
          let emittedText = false;
          for await (const delta of textDeltas) {
            emittedText = true;
            send({ type: "text", delta });
          }
          const { functionCall, parts } = await done;

          if (!functionCall) break;

          // The model chose a tool after emitting preamble ("let me look that
          // up…"). That text is not the answer, so retract it.
          if (emittedText) send({ type: "reset" });
          send({ type: "tool", name: functionCall.name });

          let forModel: string;
          try {
            const result = await dispatch(functionCall.name, functionCall.args, {
              audio,
              locale,
            });
            forModel = result.forModel;
            if (result.artifacts) send({ type: "artifacts", artifacts: result.artifacts });
          } catch (e) {
            console.error(`[/api/chat] tool ${functionCall.name} failed:`, e);
            forModel = JSON.stringify({
              error: e instanceof Error ? e.message : "tool_failed",
            });
          }

          // Echo the model's own parts back verbatim — thinking models attach a
          // thoughtSignature to the functionCall and lose their reasoning chain
          // if it is stripped.
          turn.push({ role: "model", parts });
          turn.push({
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: functionCall.name,
                  ...(functionCall.id ? { id: functionCall.id } : {}),
                  response: { result: forModel },
                },
              },
            ],
          });
        }

        send({ type: "done" });
      } catch (err) {
        console.error("[/api/chat] orchestrator error:", err);
        send({ type: "error", message: "AI service error" });
      } finally {
        clearTimeout(timer);
        ctrl.close();
      }
    },
    cancel() {
      clearTimeout(timer);
      controller.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Vercel/nginx buffer proxied responses by default, which defeats streaming.
      "X-Accel-Buffering": "no",
    },
  });
}

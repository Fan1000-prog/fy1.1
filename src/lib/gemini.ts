import { CHAT_MODEL, CHAT_FALLBACKS } from "@/lib/models";
import { requireGeminiApiKey } from "@/lib/api-key";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/** Statuses where retrying the same model is pointless but another model may work. */
const FAILOVER_STATUSES = new Set([404, 429, 503]);

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
  inlineData?: { mimeType: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown>; id?: string };
  functionResponse?: {
    name: string;
    id?: string;
    response: Record<string, unknown>;
  };
  /**
   * Opaque reasoning token that thinking models emit alongside a functionCall.
   * It MUST be echoed back verbatim in the next request or the model loses its
   * chain of thought mid tool-loop. Never construct or mutate one.
   */
  thoughtSignature?: string;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
}

export interface GeminiOptions {
  model?: string;
  systemPrompt?: string;
  contents: GeminiContent[];
  tools?: object[];
  signal?: AbortSignal;
  /** Disable model failover — used when the caller needs one specific model. */
  pinModel?: boolean;
}

export interface GeminiResult {
  text: string;
  /** Model that actually served the response, after any failover. */
  model: string;
  parts: GeminiPart[];
  functionCall?: { name: string; args: Record<string, unknown>; id?: string };
  groundingChunks?: GroundingChunk[];
}

export class GeminiError extends Error {
  constructor(readonly status: number, readonly detail: string) {
    super(`Gemini API error ${status}: ${detail}`);
    this.name = "GeminiError";
  }
}

async function callOnce(
  model: string,
  body: Record<string, unknown>,
  signal: AbortSignal | undefined,
  apiKey: string
): Promise<GeminiResult> {
  const res = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) throw new GeminiError(res.status, await res.text());

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts: GeminiPart[] = candidate?.content?.parts ?? [];

  return {
    text: parts
      .map((p) => p.text ?? "")
      .join("")
      .trim(),
    model,
    parts,
    functionCall: parts.find((p) => p.functionCall)?.functionCall,
    groundingChunks: candidate?.groundingMetadata?.groundingChunks ?? [],
  };
}

const requireApiKey = requireGeminiApiKey;

function buildBody({ contents, systemPrompt, tools }: GeminiOptions) {
  const body: Record<string, unknown> = { contents };
  if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
  if (tools?.length) body.tools = tools;
  return body;
}

function modelChain(model: string, pinModel: boolean): string[] {
  return pinModel ? [model] : [model, ...CHAT_FALLBACKS.filter((m) => m !== model)];
}

/**
 * Runs `attempt` down the model chain, moving on when a model is retired (404),
 * rate-limited (429) or overloaded (503). Any other error is the caller's problem.
 */
async function withFailover<T>(
  chain: string[],
  attempt: (model: string) => Promise<T>
): Promise<T> {
  let lastError: unknown;
  for (const model of chain) {
    try {
      return await attempt(model);
    } catch (err) {
      lastError = err;
      if (!(err instanceof GeminiError) || !FAILOVER_STATUSES.has(err.status)) throw err;
      console.warn(`[gemini] ${model} unavailable (${err.status}), trying next`);
    }
  }
  throw lastError;
}

export async function callGemini(options: GeminiOptions): Promise<GeminiResult> {
  const apiKey = requireApiKey();
  const body = buildBody(options);
  const { model = CHAT_MODEL, pinModel = false, signal } = options;
  return withFailover(modelChain(model, pinModel), (m) =>
    callOnce(m, body, signal, apiKey)
  );
}

export interface GeminiStream {
  /** Text fragments in arrival order. Empty for a pure tool-call turn. */
  textDeltas: AsyncGenerator<string>;
  /** Resolves once the stream is drained — the full turn, for the tool loop. */
  done: Promise<GeminiResult>;
}

/**
 * Streaming counterpart to callGemini.
 *
 * The caller must fully drain `textDeltas` before awaiting `done`; the generator
 * is what pumps the underlying response.
 */
export async function streamGemini(options: GeminiOptions): Promise<GeminiStream> {
  const apiKey = requireApiKey();
  const body = buildBody(options);
  const { model = CHAT_MODEL, pinModel = false, signal } = options;

  // Resolve failover before yielding anything, so a dead primary model never
  // shows up as a half-written message on screen.
  let served: { res: Response; model: string } | null = null;
  try {
    served = await withFailover(modelChain(model, pinModel), async (m) => {
      const r = await fetch(
        `${API_BASE}/${m}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal,
        }
      );
      if (!r.ok) throw new GeminiError(r.status, await r.text());
      return { res: r, model: m };
    });
  } catch (err) {
    // `streamGenerateContent` is not exposed for these models on v1beta — it 404s
    // for every one of them. Degrade to a single blocking call and deliver the
    // answer as one delta, so the caller's streaming contract still holds. See
    // docs/streaming.md for the migration that restores real token streaming.
    if (!(err instanceof GeminiError) || err.status !== 404) throw err;
    const result = await callGemini(options);
    return {
      textDeltas: (async function* () {
        if (result.text) yield result.text;
      })(),
      done: Promise.resolve(result),
    };
  }

  const { res, model: servingModel } = served;

  let resolveDone: (r: GeminiResult) => void;
  let rejectDone: (e: unknown) => void;
  const done = new Promise<GeminiResult>((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });

  async function* pump(): AsyncGenerator<string> {
    const parts: GeminiPart[] = [];
    const groundingChunks: GroundingChunk[] = [];
    let text = "";

    try {
      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";

      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        // Google sends CRLF line endings, so normalise before framing rather
        // than splitting on "\n\n" — which matches nothing in a CRLF stream.
        // Dropping CR outright (vs. rewriting CRLF) is safe for JSON payloads
        // and immune to a chunk boundary landing between the CR and the LF.
        buffer += value.replace(/\r/g, "");

        // SSE frames are separated by a blank line; keep the trailing partial.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const payload = frame
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("");
          if (!payload || payload === "[DONE]") continue;

          let chunk: Record<string, unknown>;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue; // A frame we can't parse is never worth killing the turn for.
          }

          const candidate = (
            chunk as {
              candidates?: {
                content?: { parts?: GeminiPart[] };
                groundingMetadata?: { groundingChunks?: GroundingChunk[] };
              }[];
            }
          ).candidates?.[0];

          for (const part of candidate?.content?.parts ?? []) {
            parts.push(part);
            if (part.text) {
              text += part.text;
              yield part.text;
            }
          }
          groundingChunks.push(...(candidate?.groundingMetadata?.groundingChunks ?? []));
        }
      }

      resolveDone({
        text: text.trim(),
        model: servingModel,
        parts,
        functionCall: parts.find((p) => p.functionCall)?.functionCall,
        groundingChunks,
      });
    } catch (err) {
      rejectDone(err);
      throw err;
    }
  }

  return { textDeltas: pump(), done };
}

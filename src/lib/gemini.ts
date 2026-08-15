import { CHAT_MODEL, CHAT_FALLBACKS } from "@/lib/models";

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

export async function callGemini({
  model = CHAT_MODEL,
  systemPrompt,
  contents,
  tools,
  signal,
  pinModel = false,
}: GeminiOptions): Promise<GeminiResult> {
  const apiKey = process.env.VERTEX_API_KEY;
  if (!apiKey) throw new Error("VERTEX_API_KEY not configured");

  const body: Record<string, unknown> = { contents };
  if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
  if (tools?.length) body.tools = tools;

  const chain = pinModel ? [model] : [model, ...CHAT_FALLBACKS.filter((m) => m !== model)];
  let lastError: unknown;

  for (const candidateModel of chain) {
    try {
      return await callOnce(candidateModel, body, signal, apiKey);
    } catch (err) {
      lastError = err;
      const failover =
        err instanceof GeminiError && FAILOVER_STATUSES.has(err.status);
      if (!failover) throw err;
      console.warn(
        `[gemini] ${candidateModel} unavailable (${(err as GeminiError).status}), trying next`
      );
    }
  }

  throw lastError;
}

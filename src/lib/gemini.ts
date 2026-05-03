const VERTEX_BASE = "https://aiplatform.googleapis.com/v1/publishers/google/models";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
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
}

export interface GeminiResult {
  text: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  groundingChunks?: GroundingChunk[];
}

export async function callGemini({
  model = "gemini-2.5-flash-lite",
  systemPrompt,
  contents,
  tools,
  signal,
}: GeminiOptions): Promise<GeminiResult> {
  const apiKey = process.env.VERTEX_API_KEY;
  if (!apiKey) throw new Error("VERTEX_API_KEY not configured");

  const body: Record<string, unknown> = { contents };
  if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
  if (tools?.length) body.tools = tools;

  const res = await fetch(`${VERTEX_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts ?? [];

  const text = parts.map((p) => p.text ?? "").join("").trim();
  const fcPart = parts.find((p) => p.functionCall);
  const functionCall = fcPart?.functionCall;
  const groundingChunks: GroundingChunk[] =
    data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return { text, functionCall, groundingChunks };
}

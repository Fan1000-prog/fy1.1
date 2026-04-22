const VERTEX_BASE = "https://aiplatform.googleapis.com/v1/publishers/google/models";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
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
}

export interface GeminiResult {
  text: string;
  groundingChunks?: GroundingChunk[];
}

export async function callGemini({
  model = "gemini-2.5-flash-lite",
  systemPrompt,
  contents,
  tools,
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
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const groundingChunks: GroundingChunk[] =
    data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return { text, groundingChunks };
}

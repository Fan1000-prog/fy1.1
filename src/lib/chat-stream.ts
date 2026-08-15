import type { Source, VideoMeta } from "@/types/message";

export interface ToolArtifacts {
  sources?: Source[];
  video?: VideoMeta | null;
  image?: { base64: string; mimeType: string };
}

export type StreamEvent =
  | { type: "tool"; name: string }
  | { type: "text"; delta: string }
  | { type: "artifacts"; artifacts: ToolArtifacts }
  | { type: "reset" }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ChatStreamRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  locale: string;
  file?: { base64: string; mimeType: string } | null;
  signal?: AbortSignal;
}

/**
 * Reads /api/chat's NDJSON stream and yields one decoded event per line.
 *
 * Chunk boundaries fall anywhere, including mid-line and mid-UTF-8-sequence, so
 * decoding is streaming and the trailing partial line is carried between reads.
 */
export async function* streamChat({
  messages,
  locale,
  file,
  signal,
}: ChatStreamRequest): AsyncGenerator<StreamEvent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, locale, ...(file ? { file } : {}) }),
    signal,
  });

  if (!res.ok || !res.body) {
    yield { type: "error", message: `HTTP ${res.status}` };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line) as StreamEvent;
        } catch {
          // A malformed frame is not worth aborting a good response for.
        }
      }
    }
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer) as StreamEvent;
      } catch {
        /* truncated tail */
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

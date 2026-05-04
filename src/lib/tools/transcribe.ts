import { callGemini } from "@/lib/gemini";
import type { Lang } from "@/lib/lang";

export interface TranscribeInput {
  base64: string;
  mimeType: string;
}

export interface TranscribeResult {
  text: string;
}

export async function runTranscription(
  audio: TranscribeInput,
  _locale: Lang
): Promise<TranscribeResult> {
  if (!audio.base64) throw new Error("Empty audio");
  const { text } = await callGemini({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcribe this audio exactly as spoken. Return only the transcription, no extra commentary.",
          },
          { inline_data: { mime_type: audio.mimeType, data: audio.base64 } },
        ],
      },
    ],
  });
  return { text: text.trim() };
}

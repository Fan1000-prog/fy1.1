import { callGemini } from "@/lib/gemini";
import { FAST_MODEL, IMAGE_MODEL } from "@/lib/models";
import type { Lang } from "@/lib/lang";

export interface ImageResult {
  image?: { base64: string; mimeType: string };
  /** English prompt actually sent to the image model. */
  prompt: string;
}

/**
 * Image models are trained overwhelmingly on English captions, so a Malagasy or
 * French prompt loses detail. Translating first is measurably better than
 * passing the original through.
 */
async function translateToEnglish(prompt: string): Promise<string> {
  const { text } = await callGemini({
    model: FAST_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Translate the following image generation prompt to English. Return only the translated prompt, nothing else.\n\nPrompt: ${prompt}`,
          },
        ],
      },
    ],
  });
  return text.trim() || prompt;
}

export async function runImageGeneration(
  prompt: string,
  locale: Lang
): Promise<ImageResult> {
  if (!prompt.trim()) throw new Error("Empty image prompt");

  const englishPrompt = locale === "en" ? prompt : await translateToEnglish(prompt);

  // Image models return bytes as an inlineData part on generateContent — the
  // old Imagen `:predict` endpoint is retired.
  const { parts } = await callGemini({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [{ text: englishPrompt }] }],
    pinModel: true,
  });

  const inline = parts.find((p) => p.inlineData)?.inlineData;
  if (!inline?.data) return { prompt: englishPrompt };

  return {
    image: { base64: inline.data, mimeType: inline.mimeType || "image/png" },
    prompt: englishPrompt,
  };
}

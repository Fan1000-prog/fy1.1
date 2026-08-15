import { NextRequest } from "next/server";
import { callGemini } from "@/lib/gemini";
import { FAST_MODEL, IMAGE_MODEL } from "@/lib/models";
import type { Lang } from "@/lib/lang";

const UNAVAILABLE_MESSAGES: Record<Lang, string> = {
  mg: "Tsy afaka mamorona ity sary ity aho izao.",
  en: "I can't generate this image right now.",
  fr: "Je ne peux pas générer cette image pour le moment.",
};

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

export async function POST(req: NextRequest) {
  let locale: Lang = "fr";
  try {
    const body: { prompt?: string; locale?: Lang } = await req.json();
    locale = body.locale ?? "fr";
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }
    if (!process.env.VERTEX_API_KEY) {
      return Response.json({ error: "image_service_unavailable" });
    }

    const englishPrompt = locale === "en" ? prompt : await translateToEnglish(prompt);

    // Image models generate through generateContent and return the bytes as an
    // inlineData part — the old Imagen `:predict` endpoint is retired.
    const { parts, text } = await callGemini({
      model: IMAGE_MODEL,
      contents: [{ role: "user", parts: [{ text: englishPrompt }] }],
      pinModel: true,
    });

    const image = parts.find((p) => p.inlineData)?.inlineData;
    if (!image?.data) {
      console.error("[/api/tools/image] no image part returned:", text.slice(0, 200));
      return Response.json({
        error: "image_generation_failed",
        text: UNAVAILABLE_MESSAGES[locale],
      });
    }

    return Response.json({
      imageBase64: image.data,
      mimeType: image.mimeType || "image/png",
      prompt: englishPrompt,
    });
  } catch (err) {
    console.error("[/api/tools/image]", err);
    return Response.json({
      error: "image_generation_failed",
      text: UNAVAILABLE_MESSAGES[locale],
    });
  }
}

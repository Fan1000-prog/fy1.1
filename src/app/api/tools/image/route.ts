import { NextRequest } from "next/server";
import { callGemini } from "@/lib/gemini";
import type { Lang } from "@/lib/lang";

const IMAGEN_MODEL = "imagen-3.0-generate-001";
const VERTEX_BASE = "https://aiplatform.googleapis.com/v1/publishers/google/models";

async function translateToEnglish(prompt: string): Promise<string> {
  const { text } = await callGemini({
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
  try {
    const { prompt, locale = "fr" }: { prompt: string; locale: Lang } =
      await req.json();

    if (!prompt?.trim()) {
      return Response.json({ error: "Prompt required" }, { status: 400 });
    }

    const apiKey = process.env.VERTEX_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "image_service_unavailable" }, { status: 200 });
    }

    const englishPrompt =
      locale !== "en" ? await translateToEnglish(prompt) : prompt;

    const res = await fetch(
      `${VERTEX_BASE}/${IMAGEN_MODEL}:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: englishPrompt }],
          parameters: { sampleCount: 1, aspectRatio: "1:1" },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("[/api/tools/image] Imagen error:", errText);
      if (res.status === 400 && errText.includes("safety")) {
        const msg =
          locale === "mg"
            ? "Tsy afaka mamorona ity sary ity aho."
            : locale === "en"
            ? "I can't generate this image."
            : "Je ne peux pas générer cette image.";
        return Response.json({ error: "safety_block", text: msg });
      }
      return Response.json({ error: "image_generation_failed" }, { status: 200 });
    }

    const data = await res.json();
    const prediction = data.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      return Response.json({ error: "image_generation_failed" }, { status: 200 });
    }

    return Response.json({
      imageBase64: prediction.bytesBase64Encoded,
      mimeType: prediction.mimeType ?? "image/png",
      prompt: englishPrompt,
    });
  } catch (err) {
    console.error("[/api/tools/image]", err);
    return Response.json({ error: "image_generation_failed" }, { status: 200 });
  }
}

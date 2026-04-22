import { NextRequest } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return Response.json({ error: "No audio provided" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Empty audio" }, { status: 400 });
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioFile.type || "audio/webm";

    const { text } = await callGemini({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Transcribe this audio exactly as spoken. Return only the transcription, no extra commentary.",
            },
            {
              inline_data: { mime_type: mimeType, data: base64 },
            },
          ],
        },
      ],
    });

    return Response.json({ text: text.trim() });
  } catch (err) {
    console.error("[/api/tools/transcribe]", err);
    return Response.json({ error: "transcription_failed" }, { status: 200 });
  }
}

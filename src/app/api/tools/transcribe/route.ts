import { NextRequest } from "next/server";
import { runTranscription } from "@/lib/tools/transcribe";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const locale = (formData.get("locale") as string) || "fr";
    if (!audioFile) {
      return Response.json({ error: "No audio provided" }, { status: 400 });
    }
    const arrayBuffer = await audioFile.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Empty audio" }, { status: 400 });
    }
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = audioFile.type || "audio/webm";
    const { text } = await runTranscription({ base64, mimeType }, locale as "fr" | "mg" | "en");
    return Response.json({ text });
  } catch (err) {
    console.error("[/api/tools/transcribe]", err);
    return Response.json({ error: "transcription_failed" }, { status: 200 });
  }
}

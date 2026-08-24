import { NextRequest } from "next/server";
import { runTranscription } from "@/lib/tools/transcribe";
import { requireUser } from "@/lib/server/auth";
import { claimTurn, quotaFor } from "@/lib/server/usage";
import type { Lang } from "@/lib/lang";

export const maxDuration = 60;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const VALID_LOCALES = new Set<string>(["fr", "mg", "en"]);

export async function POST(req: NextRequest) {
  // Transcription is a paid model call like any other, so it is authenticated
  // and metered on the same allowance as a chat turn.
  const auth = await requireUser(req);
  if (!auth.ok) return Response.json({ error: auth.error }, { status: auth.status });

  const quota = quotaFor(auth.user.isAnonymous);
  let claimed;
  try {
    claimed = await claimTurn(auth.user.uid, quota);
  } catch (e) {
    console.error("[/api/tools/transcribe] metering failed:", e);
    return Response.json({ error: "metering_unavailable" }, { status: 503 });
  }
  if (!claimed) {
    return Response.json(
      { error: "quota_exceeded", limit: quota.turnsPerDay },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const rawLocale = formData.get("locale") as string | null;
    const locale: Lang = VALID_LOCALES.has(rawLocale ?? "") ? (rawLocale as Lang) : "fr";

    if (!audioFile) return Response.json({ error: "No audio provided" }, { status: 400 });

    const arrayBuffer = await audioFile.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return Response.json({ error: "Empty audio" }, { status: 400 });
    }
    if (arrayBuffer.byteLength > MAX_AUDIO_BYTES) {
      return Response.json({ error: "audio_too_large" }, { status: 413 });
    }

    const { text } = await runTranscription(
      { base64: Buffer.from(arrayBuffer).toString("base64"), mimeType: audioFile.type || "audio/webm" },
      locale
    );
    return Response.json({ text });
  } catch (err) {
    console.error("[/api/tools/transcribe]", err);
    return Response.json({ error: "transcription_failed" }, { status: 200 });
  }
}

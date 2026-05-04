import { NextRequest } from "next/server";
import { runYoutubeSummary } from "@/lib/tools/youtube";
import type { Lang } from "@/lib/lang";

export async function POST(req: NextRequest) {
  try {
    const { message, locale = "fr" }: { message: string; locale: Lang } =
      await req.json();
    if (!message?.trim()) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }
    const { text, video } = await runYoutubeSummary(message, locale);
    return Response.json({ text, video });
  } catch (err) {
    console.error("[/api/tools/youtube]", err);
    return Response.json({ error: "youtube_failed" }, { status: 200 });
  }
}

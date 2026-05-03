import { NextRequest } from "next/server";
import { runWebSearch } from "@/lib/tools/web";
import type { Lang } from "@/lib/lang";

export async function POST(req: NextRequest) {
  try {
    const { message, locale = "fr" }: { message: string; locale: Lang } =
      await req.json();
    if (!message?.trim()) {
      return Response.json({ error: "Message required" }, { status: 400 });
    }
    const { text, sources } = await runWebSearch(message, locale);
    return Response.json({ text, sources });
  } catch (err) {
    console.error("[/api/tools/web]", err);
    return Response.json({ error: "web_search_failed" }, { status: 200 });
  }
}

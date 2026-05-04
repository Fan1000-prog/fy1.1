import { runWebSearch } from "./web";
import { runYoutubeSummary } from "./youtube";
import { runTranscription, type TranscribeInput } from "./transcribe";
import type { Lang } from "@/lib/lang";

export type ToolName = "web_search" | "youtube_summarize" | "transcribe_audio";

export const TOOL_DECLARATIONS = [
  {
    name: "web_search",
    description:
      "Search the live web for current info, news, facts not in training data. Use when user asks about recent events, prices, status, or anything time-sensitive.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query in user's language" },
      },
      required: ["query"],
    },
  },
  {
    name: "youtube_summarize",
    description:
      "Fetch + summarize a YouTube video. Use when user shares a youtube.com / youtu.be URL or asks to summarize a video.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full YouTube URL" },
      },
      required: ["url"],
    },
  },
  {
    name: "transcribe_audio",
    description:
      "Transcribe audio the user uploaded. Only call if an audio file is attached this turn.",
    parameters: { type: "object", properties: {}, required: [] },
  },
];

export interface DispatchCtx {
  audio?: TranscribeInput;
  locale: Lang;
}

export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx: DispatchCtx
): Promise<string> {
  switch (name) {
    case "web_search": {
      const query = String(args.query ?? "");
      const { text, sources } = await runWebSearch(query, ctx.locale);
      return JSON.stringify({ text, sources });
    }
    case "youtube_summarize": {
      const url = String(args.url ?? "");
      const { text, video } = await runYoutubeSummary(url, ctx.locale);
      return JSON.stringify({ text, video });
    }
    case "transcribe_audio": {
      if (!ctx.audio) throw new Error("No audio attached");
      const { text } = await runTranscription(ctx.audio, ctx.locale);
      return JSON.stringify({ text });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

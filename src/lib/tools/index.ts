import { runWebSearch } from "./web";
import { runYoutubeSummary } from "./youtube";
import { runTranscription, type TranscribeInput } from "./transcribe";
import { runImageGeneration } from "./image";
import type { Lang } from "@/lib/lang";
import type { Source, VideoMeta } from "@/types/message";

export type ToolName =
  | "web_search"
  | "youtube_summarize"
  | "transcribe_audio"
  | "generate_image";

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
        url: {
          type: "string",
          description:
            "Full YouTube URL if the user gave one, otherwise a search phrase describing the video",
        },
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
  {
    name: "generate_image",
    description:
      "Generate an image from a description. Only call after the user has explicitly confirmed they want an image.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Detailed visual description of the image to generate",
        },
      },
      required: ["prompt"],
    },
  },
];

/**
 * Rich payloads a tool produces for the UI. Deliberately separate from the text
 * handed back to the model: image bytes and full source lists would blow up the
 * context window for no gain, since the model only needs to know what happened.
 */
export interface ToolArtifacts {
  sources?: Source[];
  video?: VideoMeta | null;
  image?: { base64: string; mimeType: string };
}

export interface DispatchResult {
  /** Compact JSON string fed back to the model as the functionResponse. */
  forModel: string;
  artifacts?: ToolArtifacts;
  /** Which tool ran, so the client can badge the message. */
  tool: ToolName;
}

export interface DispatchCtx {
  audio?: TranscribeInput;
  locale: Lang;
}

export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx: DispatchCtx
): Promise<DispatchResult> {
  switch (name) {
    case "web_search": {
      const { text, sources } = await runWebSearch(String(args.query ?? ""), ctx.locale);
      return {
        tool: "web_search",
        forModel: JSON.stringify({ text, sources: sources.map((s) => s.title) }),
        artifacts: { sources },
      };
    }
    case "youtube_summarize": {
      const { text, video } = await runYoutubeSummary(String(args.url ?? ""), ctx.locale);
      return {
        tool: "youtube_summarize",
        forModel: JSON.stringify({ text, title: video?.title }),
        artifacts: { video },
      };
    }
    case "transcribe_audio": {
      if (!ctx.audio) throw new Error("No audio attached");
      const { text } = await runTranscription(ctx.audio, ctx.locale);
      return { tool: "transcribe_audio", forModel: JSON.stringify({ text }) };
    }
    case "generate_image": {
      const { image, prompt } = await runImageGeneration(
        String(args.prompt ?? ""),
        ctx.locale
      );
      return {
        tool: "generate_image",
        // The bytes go to the client, never into the model's context.
        forModel: JSON.stringify(
          image
            ? { status: "image_generated_and_shown_to_user", prompt }
            : { status: "image_generation_failed" }
        ),
        artifacts: image ? { image } : undefined,
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

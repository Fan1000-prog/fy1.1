import { YoutubeTranscript } from "youtube-transcript";
import { callGemini } from "@/lib/gemini";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import type { VideoMeta } from "@/types/message";

export interface YoutubeResult {
  text: string;
  video: VideoMeta | null;
}

function extractVideoId(input: string): string | null {
  const m = input.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = m[1] ? `${m[1]}:` : "";
  const min = m[2] ? m[2].padStart(h ? 2 : 1, "0") : "0";
  const sec = (m[3] ?? "0").padStart(2, "0");
  return `${h}${min}:${sec}`;
}

async function searchYoutube(query: string): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  return data.items?.[0]?.id?.videoId ?? null;
}

async function fetchVideoMeta(videoId: string): Promise<VideoMeta | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,statistics");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;
  return {
    videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    duration: parseDuration(item.contentDetails.duration),
    thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? "",
    viewCount: Number(item.statistics?.viewCount ?? 0).toLocaleString(),
  };
}

export async function runYoutubeSummary(
  message: string,
  locale: Lang
): Promise<YoutubeResult> {
  const videoId = extractVideoId(message) ?? (await searchYoutube(message));
  if (!videoId) {
    return {
      text:
        locale === "mg"
          ? "Tsy hita ny video."
          : locale === "en"
          ? "No video found."
          : "Aucune vidéo trouvée.",
      video: null,
    };
  }

  const [meta, transcriptSegments] = await Promise.allSettled([
    fetchVideoMeta(videoId),
    YoutubeTranscript.fetchTranscript(videoId),
  ]);

  const video = meta.status === "fulfilled" ? meta.value : null;
  const transcriptText =
    transcriptSegments.status === "fulfilled"
      ? transcriptSegments.value.map((s) => s.text).join(" ").slice(0, 12000)
      : "";

  const detectedLang = detectLanguage(message);
  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const contextBlock = [
    video ? `Video: "${video.title}" by ${video.channel} (${video.duration})` : "",
    transcriptText
      ? `Transcript:\n${transcriptText}`
      : "No transcript available. Summarise based on video title and channel only.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const summaryInstruction: Record<string, string> = {
    fr: "Fournis un résumé structuré avec les points clés et les horodatages si disponibles.",
    mg: "Omeo famintinana voalamina miaraka amin'ny teboka lehibe sy ny fotoana raha misy.",
    en: "Provide a structured summary with key points and timestamps if available.",
  };
  const instruction = summaryInstruction[detectedLang] ?? summaryInstruction.fr;
  const prompt = `${contextBlock}\n\nUser request: ${message}\n\n${instruction}`;

  const { text } = await callGemini({
    systemPrompt,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return { text, video };
}

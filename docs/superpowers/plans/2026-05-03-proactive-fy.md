# Proactive Fy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `web` / `youtube` / `transcribe` tools from regex-dispatched to Gemini function-calling, rewrite the system prompt for proactive tone, and run a server-side tool loop (≤3 rounds) inside `/api/chat`. Image generation stays gated by client-side regex.

**Architecture:** New `src/lib/tools/` module exposes pure tool functions plus `TOOL_DECLARATIONS` and a `dispatch()` switchboard. Existing `/api/tools/*` route handlers become thin wrappers around those functions (no behavior change for clients still using them). `/api/chat/route.ts` becomes a tool-loop orchestrator: each round it asks Gemini for a `functionCall` part; if it gets one, it dispatches the call server-side, appends a `functionResponse` to the conversation, and loops. ≤3 rounds, then a forced final text-only call.

**Tech Stack:** Next.js (App Router, custom build — see `AGENTS.md`), TypeScript, raw `fetch` to Vertex AI REST, no test framework.

**Spec deviations / corrections to spec:** None to scope. Two implementation details the spec under-specified, addressed in this plan: (a) `callGemini` in `src/lib/gemini.ts` must be extended to surface `functionCall` parts, (b) `runWebSearch` is implemented as a layered Gemini call with `google_search` grounding (matching existing `/api/tools/web` behavior).

**Verification:** No automated tests in repo (per spec §1). Each task ends with a manual smoke step the executor runs in `npm run dev`.

---

## File Structure

| Path | Role | Status |
|---|---|---|
| `src/lib/gemini.ts` | Vertex REST wrapper. Add `functionCall` to result shape. | Modify |
| `src/lib/tools/web.ts` | `runWebSearch(query, locale): Promise<{ text, sources }>` — layered Gemini call with `google_search`. | Create |
| `src/lib/tools/youtube.ts` | `runYoutubeSummary(message, locale): Promise<{ text, video }>` — extracts/searches video, fetches meta+transcript, summarizes. | Create |
| `src/lib/tools/transcribe.ts` | `runTranscription(audio, locale): Promise<{ text }>` — pure function consuming `{ base64, mimeType }`. | Create |
| `src/lib/tools/index.ts` | Exports `TOOL_DECLARATIONS`, type `ToolName`, and `dispatch(name, args, ctx)`. | Create |
| `src/app/api/tools/web/route.ts` | Thin wrapper: parse body, call `runWebSearch`, return JSON. | Modify (refactor only) |
| `src/app/api/tools/youtube/route.ts` | Thin wrapper around `runYoutubeSummary`. | Modify (refactor only) |
| `src/app/api/tools/transcribe/route.ts` | Thin wrapper around `runTranscription` (handles `multipart/form-data` → `{ base64, mimeType }`). | Modify (refactor only) |
| `src/lib/lang.ts` | Add proactive-tone behavior rules to all three locale system prompts. | Modify |
| `src/app/api/chat/route.ts` | Replace single-shot Gemini call with tool-loop orchestrator. | Modify (rewrite body) |
| `src/lib/intent.ts` | No change in v1 — `WEB_PATTERNS` / `YOUTUBE_PATTERNS` retained as fallback safety net (spec §3, §9). | Untouched |

---

## Task 1: Extend `callGemini` to surface `functionCall` parts

**Files:**
- Modify: `src/lib/gemini.ts`

**Why:** Current `callGemini` only reads `parts[0].text`, throwing away any `functionCall` Gemini returns. The orchestrator needs both.

- [ ] **Step 1: Extend types and parse logic**

Replace the current contents of `src/lib/gemini.ts` with:

```ts
const VERTEX_BASE = "https://aiplatform.googleapis.com/v1/publishers/google/models";

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface GroundingChunk {
  web?: { uri: string; title: string };
}

export interface GeminiOptions {
  model?: string;
  systemPrompt?: string;
  contents: GeminiContent[];
  tools?: object[];
  signal?: AbortSignal;
}

export interface GeminiResult {
  text: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  groundingChunks?: GroundingChunk[];
}

export async function callGemini({
  model = "gemini-2.5-flash-lite",
  systemPrompt,
  contents,
  tools,
  signal,
}: GeminiOptions): Promise<GeminiResult> {
  const apiKey = process.env.VERTEX_API_KEY;
  if (!apiKey) throw new Error("VERTEX_API_KEY not configured");

  const body: Record<string, unknown> = { contents };
  if (systemPrompt) body.system_instruction = { parts: [{ text: systemPrompt }] };
  if (tools?.length) body.tools = tools;

  const res = await fetch(`${VERTEX_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parts: GeminiPart[] = data.candidates?.[0]?.content?.parts ?? [];

  const text = parts.map((p) => p.text ?? "").join("").trim();
  const fcPart = parts.find((p) => p.functionCall);
  const functionCall = fcPart?.functionCall;
  const groundingChunks: GroundingChunk[] =
    data.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return { text, functionCall, groundingChunks };
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS — no type errors. Existing call sites (`web`, `youtube`, `transcribe` routes) still compile because `GeminiResult` is a superset.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gemini.ts
git commit -m "feat(gemini): surface functionCall parts and accept AbortSignal"
```

---

## Task 2: Create `src/lib/tools/web.ts`

**Files:**
- Create: `src/lib/tools/web.ts`

**Why:** Move web-search logic out of the route handler so both the route and the chat orchestrator can call it.

- [ ] **Step 1: Write the file**

Create `src/lib/tools/web.ts`:

```ts
import { callGemini } from "@/lib/gemini";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import type { Source } from "@/types/message";

export interface WebResult {
  text: string;
  sources: Source[];
}

export async function runWebSearch(query: string, locale: Lang): Promise<WebResult> {
  const detectedLang = detectLanguage(query);
  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const { text, groundingChunks } = await callGemini({
    systemPrompt,
    contents: [{ role: "user", parts: [{ text: query }] }],
    tools: [{ google_search: {} }],
  });

  const sources: Source[] = (groundingChunks ?? [])
    .filter((c) => c.web?.uri)
    .slice(0, 5)
    .map((c) => ({ uri: c.web!.uri, title: c.web!.title || c.web!.uri }));

  return { text, sources };
}
```

- [ ] **Step 2: Refactor the route handler to use it**

Replace `src/app/api/tools/web/route.ts` with:

```ts
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
```

- [ ] **Step 3: Verify build + manual smoke**

Run: `npm run build`
Expected: PASS.

Run: `npm run dev`. Open chat, send "Search for Madagascar tourism news 2026". Expected: regex still hits `web` intent, route returns text+sources as before.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tools/web.ts src/app/api/tools/web/route.ts
git commit -m "refactor(tools): extract runWebSearch into pure function"
```

---

## Task 3: Create `src/lib/tools/youtube.ts`

**Files:**
- Create: `src/lib/tools/youtube.ts`

**Why:** Same reason — pull logic out of the route so both callers share it.

- [ ] **Step 1: Write the file**

Create `src/lib/tools/youtube.ts`:

```ts
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
```

- [ ] **Step 2: Refactor the route handler**

Replace `src/app/api/tools/youtube/route.ts` with:

```ts
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
```

- [ ] **Step 3: Verify build + smoke**

Run: `npm run build`
Expected: PASS.

Run: `npm run dev`, send a YouTube URL in chat. Expected: same summary behavior as before.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tools/youtube.ts src/app/api/tools/youtube/route.ts
git commit -m "refactor(tools): extract runYoutubeSummary into pure function"
```

---

## Task 4: Create `src/lib/tools/transcribe.ts`

**Files:**
- Create: `src/lib/tools/transcribe.ts`

**Why:** Same pattern. Pure function takes `{ base64, mimeType }`; route handler converts uploaded `File` to that.

- [ ] **Step 1: Write the file**

Create `src/lib/tools/transcribe.ts`:

```ts
import { callGemini } from "@/lib/gemini";
import type { Lang } from "@/lib/lang";

export interface TranscribeInput {
  base64: string;
  mimeType: string;
}

export interface TranscribeResult {
  text: string;
}

export async function runTranscription(
  audio: TranscribeInput,
  _locale: Lang
): Promise<TranscribeResult> {
  if (!audio.base64) throw new Error("Empty audio");
  const { text } = await callGemini({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Transcribe this audio exactly as spoken. Return only the transcription, no extra commentary.",
          },
          { inline_data: { mime_type: audio.mimeType, data: audio.base64 } },
        ],
      },
    ],
  });
  return { text: text.trim() };
}
```

- [ ] **Step 2: Refactor the route handler**

Replace `src/app/api/tools/transcribe/route.ts` with:

```ts
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
```

- [ ] **Step 3: Verify build + smoke**

Run: `npm run build`
Expected: PASS.

Run: `npm run dev`, record voice input. Expected: same transcription behavior.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tools/transcribe.ts src/app/api/tools/transcribe/route.ts
git commit -m "refactor(tools): extract runTranscription into pure function"
```

---

## Task 5: Create `src/lib/tools/index.ts` (declarations + dispatcher)

**Files:**
- Create: `src/lib/tools/index.ts`

**Why:** Single import point for the chat-route orchestrator. Declarations are what Gemini sees; `dispatch` maps a function-call back to a runner.

- [ ] **Step 1: Write the file**

Create `src/lib/tools/index.ts`:

```ts
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
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/tools/index.ts
git commit -m "feat(tools): add TOOL_DECLARATIONS and dispatch switchboard"
```

---

## Task 6: Rewrite system prompt for proactive tone

**Files:**
- Modify: `src/lib/lang.ts`

**Why:** Without this, Fy still sounds like a Q&A bot even after the loop is wired. The spec §4 lists six behavior rules to inject.

- [ ] **Step 1: Add `PROACTIVE_INSTRUCTIONS` map and use it**

In `src/lib/lang.ts`, add this constant after `CONCISION_INSTRUCTIONS` (around line 19):

```ts
export const PROACTIVE_INSTRUCTIONS: Record<Lang, string> = {
  fr: "PROACTIVITÉ : Tu es un collaborateur, pas un FAQ. (1) Quand la requête implique un outil sûr (recherche web, résumé vidéo, transcription), APPELLE l'outil — ne demande pas la permission. (2) Pour la génération d'images, propose et attends une confirmation explicite avant de la déclencher. (3) Termine les réponses substantielles par UNE proposition concrète d'étape suivante, intégrée dans la prose (jamais en liste « actions suggérées »). Saute cette étape si la réponse est triviale ou clairement terminale. (4) Si bien répondre nécessite plusieurs lookups, enchaîne-les dans le même tour (le serveur autorise jusqu'à 3 rounds). Ne t'arrête pas après une recherche si la réponse n'est pas encore là. (5) Quand un outil a tourné, mentionne-le en une courte clause (« j'ai cherché sur le web — ») ; ne déverse pas les résultats bruts.",
  mg: "FANEHOAN-KEVITRA MAVITRIKA : Mpiara-miasa ianao, fa tsy FAQ. (1) Rehefa mitaky fitaovana azo antoka ny fangatahana (fikarohana web, famintinana video, fandikana feo), ANTSOY ny fitaovana — aza mangataka alalana. (2) Amin'ny famoronana sary, atolory ary miandrasa fanamafisana mialoha ny fanombohana azy. (3) Famarano ireo valiny tena misy dikany amin'ny TOLOTRA tokana mazava momba ny dingana manaraka, mitafy prose (tsy lisitra « hetsika atolotra »). Tsofy raha tsotra na efa mifarana ilay valiny. (4) Raha mila lookups maro ny famaliana tsara, atambaro amin'ny tour iray ihany (azon'ny serveur ekena ny 3 rounds). Aza mijanona aorian'ny fikarohana iray raha tsy hita ny valiny. (5) Rehefa nampiasaina ny fitaovana, lazao amin'ny fehezanteny fohy (« nikaroka tao amin'ny web aho — ») ; aza mandatsaka ny vokatra manta.",
  en: "PROACTIVITY: You are a collaborator, not a FAQ. (1) When a request implies a safe tool (web search, video summary, transcription), CALL the tool — don't ask permission. (2) For image generation, propose it and wait for explicit confirmation before triggering. (3) End substantive replies with ONE concrete next-step offer woven into the prose (never a 'Suggested actions' list). Skip if the reply is trivial or clearly terminal. (4) If answering well needs multiple lookups, chain them in one turn (server allows up to 3 rounds). Don't stop after one search if the answer isn't there yet. (5) When a tool ran, mention it in one short clause ('I searched the web — '); don't dump raw results.",
};
```

Then change `buildSystemPrompt` (currently at line 33) to:

```ts
export function buildSystemPrompt(locale: Lang, detectedLang: Lang): string {
  return `${SYSTEM_PROMPTS[locale]}\n\n${LANG_INSTRUCTIONS[detectedLang]}\n\n${CONCISION_INSTRUCTIONS[detectedLang]}\n\n${PROACTIVE_INSTRUCTIONS[detectedLang]}`;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/lang.ts
git commit -m "feat(lang): add proactive-tone behavior rules to system prompt"
```

---

## Task 7: Replace `/api/chat/route.ts` with the tool-loop orchestrator

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Why:** This is the heart of the spec. Server-side loop, ≤3 rounds, dispatcher invocation, error-safe `functionResponse` injection, 60s wall-clock cap, forced final text-only call when the cap is hit.

- [ ] **Step 1: Replace the file**

Replace the entire contents of `src/app/api/chat/route.ts` with:

```ts
import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt, detectLanguage, type Lang } from "@/lib/lang";
import { callGemini, type GeminiContent, type GeminiPart } from "@/lib/gemini";
import { TOOL_DECLARATIONS, dispatch } from "@/lib/tools";

const VALID_LOCALES = new Set<string>(["fr", "mg", "en"]);
const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 8_000;
const MAX_ROUNDS = 3;
const WALL_CLOCK_MS = 60_000;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  if (!process.env.VERTEX_API_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  let body: {
    messages: unknown;
    locale?: unknown;
    file?: { base64: string; mimeType: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages: rawMessages, locale: rawLocale, file } = body;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json(
      { error: "messages must be a non-empty array" },
      { status: 400 }
    );
  }
  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }

  const messages: ClientMessage[] = rawMessages
    .filter(
      (m): m is ClientMessage =>
        m !== null &&
        typeof m === "object" &&
        ((m as ClientMessage).role === "user" ||
          (m as ClientMessage).role === "assistant") &&
        typeof (m as ClientMessage).content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  const locale: Lang = VALID_LOCALES.has(rawLocale as string)
    ? (rawLocale as Lang)
    : "fr";
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const detectedLang = lastUserMessage
    ? detectLanguage(lastUserMessage.content)
    : locale;
  const systemPrompt = buildSystemPrompt(locale, detectedLang);

  const turn: GeminiContent[] = messages.map((m, i) => {
    const isLastUserWithFile =
      i === messages.length - 1 && m.role === "user" && file?.base64;
    const parts: GeminiPart[] = isLastUserWithFile
      ? [
          { text: m.content },
          { inline_data: { mime_type: file!.mimeType, data: file!.base64 } },
        ]
      : [{ text: m.content }];
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const audio =
    file?.mimeType?.startsWith("audio/")
      ? { base64: file.base64, mimeType: file.mimeType }
      : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WALL_CLOCK_MS);

  try {
    for (let rounds = 0; rounds < MAX_ROUNDS; rounds++) {
      const { text, functionCall } = await callGemini({
        systemPrompt,
        contents: turn,
        tools: [{ function_declarations: TOOL_DECLARATIONS }],
        signal: controller.signal,
      });

      if (!functionCall) {
        return NextResponse.json({ text });
      }

      let result: string;
      try {
        result = await dispatch(functionCall.name, functionCall.args, {
          audio,
          locale,
        });
      } catch (e) {
        result = JSON.stringify({
          error: e instanceof Error ? e.message : "tool_failed",
        });
      }

      turn.push({
        role: "model",
        parts: [{ functionCall }],
      });
      turn.push({
        role: "user",
        parts: [
          { functionResponse: { name: functionCall.name, response: { result } } },
        ],
      });
    }

    // Hit MAX_ROUNDS — force a final text-only call.
    const final = await callGemini({
      systemPrompt,
      contents: turn,
      signal: controller.signal,
    });
    return NextResponse.json({ text: final.text });
  } catch (err) {
    console.error("[/api/chat] orchestrator error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS — no type errors.

- [ ] **Step 3: Manual smoke — plain chitchat**

Run: `npm run dev`, send "Salut Fy" in chat.
Expected: Polite greeting reply. No tool call. (Verify by checking server logs — no Vertex errors, no calls to `/api/tools/*`.)

- [ ] **Step 4: Manual smoke — auto web search**

Send: "Quoi de neuf à Madagascar aujourd'hui?"
Expected: Reply cites a web search ("J'ai cherché …") and ends with one follow-up offer in prose. Vertex logs show a `web_search` function call dispatched server-side.

- [ ] **Step 5: Manual smoke — chained tool calls**

Send: "Search recent Madagascar tourism stats then compare to last year."
Expected: Two `web_search` calls in one turn. Final reply combines both. Loop count ≤ 3.

- [ ] **Step 6: Manual smoke — tool failure path**

Temporarily break `runWebSearch` (e.g., throw at the top) and send a query that triggers it.
Expected: Fy apologizes in prose, no 500. Revert the break.

- [ ] **Step 7: Manual smoke — image regex still works**

Send: "Génère une image d'un baobab".
Expected: Existing regex/client image flow runs (Fy does NOT function-call, since `image_generate` is not in `TOOL_DECLARATIONS`).

- [ ] **Step 8: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(chat): tool-loop orchestrator with function-calling (≤3 rounds)"
```

---

## Task 8: Final integration smoke + open observability

**Files:**
- (no code changes)

- [ ] **Step 1: Run the full manual matrix from spec §8**

Cover every row:
1. "Quoi de neuf à Madagascar?" → auto `web_search` + follow-up offer.
2. "Summarize https://youtu.be/dQw4w9WgXcQ" → auto `youtube_summarize`.
3. "Génère une image d'un baobab" → regex path, no function-call.
4. Audio upload + "transcribe this" → auto `transcribe_audio`.
5. "Search recent Madagascar tourism stats then compare to 2023" → chained `web_search` calls.
6. Bad URL inside a YouTube request → graceful prose apology.
7. 4-step request that needs >3 tools → caps at 3, summarizes + offers continue.
8. "salut Fy" → no tool call.

- [ ] **Step 2: Capture findings**

Note any tool-call misfires (Gemini failing to call when it should) in `docs/superpowers/specs/2026-05-03-proactive-fy-design.md` §10 risks. The regex fallback paths in `intent.ts` remain in place specifically as a safety net for these cases.

- [ ] **Step 3: Done**

No commit needed unless you noted findings in the spec. If you did:

```bash
git add docs/superpowers/specs/2026-05-03-proactive-fy-design.md
git commit -m "docs(spec): note proactive-Fy v1 production findings"
```

---

## Out of scope (do NOT implement here)

- Streaming/SSE progress UI.
- Function-calling for image generation (image stays regex per spec §7).
- Memory of user preferences across sessions.
- Suggestion chips, action-plan UI blocks.
- Removing dead `WEB_PATTERNS` / `YOUTUBE_PATTERNS` from `intent.ts` — defer ~1 week of prod data per spec §9.
- Migrating to the official Gemini SDK.
- Adding a test framework.

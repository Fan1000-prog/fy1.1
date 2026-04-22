# fy Tools — Design Spec
**Date:** 2026-04-21
**Status:** Approved

## Overview

Add five real capabilities to fy: web search with sources, YouTube video analysis, image generation, file analysis (PDF/image), and voice-to-text input. All tools run within the Google ecosystem using the existing `VERTEX_API_KEY`. One new key (`YOUTUBE_API_KEY`) is required.

## Architecture

**Pattern: Intent Routing (Approach C)**

The frontend classifies the user's intent before sending. Based on that classification it calls one of five API routes. The existing `/api/chat` route handles plain conversation and is also extended for multimodal file input.

```
User message / audio / file
  → detectIntent(message)       [client-side, zero latency]
  → show tool badge in UI
  → call appropriate API route
  → render rich message output
```

### API Routes

| Route | Input | Output | Backend |
|---|---|---|---|
| `/api/chat` | `{messages, locale, file?}` | `{text}` | Gemini 2.5 Flash Lite |
| `/api/tools/web` | `{message, locale, history}` | `{text, sources[]}` | Gemini + Grounding |
| `/api/tools/youtube` | `{message, locale}` | `{text, video{}}` | YouTube Data API v3 (metadata/search) + `youtube-transcript` (captions) + Gemini |
| `/api/tools/image` | `{prompt, locale}` | `{imageBase64, mimeType}` | Imagen 3 via Vertex AI |
| `/api/tools/transcribe` | `multipart/form-data` audio blob | `{text}` | Gemini multimodal audio |

### File Analysis

Files are not stored. The file is base64-encoded in the browser and sent inline with the message payload to `/api/chat`. Gemini handles PDFs, JPEGs, and PNGs natively as inline data parts. Max file size validated client-side at 20 MB.

## Intent Detection

`src/lib/intent.ts` — pure function, no API calls, runs synchronously before send.

```
detectIntent(message: string): "web" | "youtube" | "image" | "chat"
```

**Patterns (FR / MG / EN):**
- `web`: "recherche", "search for", "what is", "latest news", "actualités", "vaovao", "find me"
- `youtube`: `youtube.com/watch`, `youtu.be/`, "resume cette video", "summarise this video", "résume", "video about"
- `image`: "génère une image", "generate image", "crée une image", "draw", "dessine", "sary", "make an image"
- `chat`: everything else

Voice and file upload are triggered by dedicated UI controls (mic button, paperclip), not text detection.

## Tool Activation UX

**Auto-detect with visual confirmation (user choice C):**

1. User types message → `detectIntent()` fires on send
2. Tool badge appears on the user message bubble (e.g. `🌐 Web Search`)
3. Typing indicator shows `"Web Search · Searching…"` while awaiting response
4. Response renders with tool-specific rich output
5. User can override by toggling a tool pill manually before sending

## Rich Message Output Types

### Web Search
- Text answer from Gemini with Grounding enabled
- Source chips below the answer: favicon + domain + link
- Falls back to plain Gemini answer (no sources label) if Grounding returns nothing

### YouTube
- Video metadata card: thumbnail, title, channel, duration, view count
- Timestamped bullet summary (3–5 key points with timestamps)
- Transcript fetched via `youtube-transcript` npm package (works for public videos with captions, no OAuth needed)
- YouTube Data API v3 key used only for search and metadata
- If no transcript available: analyse title + description + metadata only

### Image Generation
- Inline rendered image (base64 `<img>` tag)
- Prompt caption below image
- Download button
- Prompt translated to English via a quick Gemini call before sending to Imagen if locale is FR or MG (Imagen 3 performs best with English prompts)

### Voice Input
- Mic button cycles: idle → recording (red pulse) → transcribing (amber) → done
- Transcribed text is injected into the input box — user can edit before sending
- Not sent automatically

### File Analysis
- File attachment badge above message bubble (filename, size, type icon)
- Response is a standard text bubble from Gemini
- Client-side validation: PDF / JPEG / PNG only, max 20 MB

## New Files

```
src/app/api/tools/web/route.ts         — Gemini + Grounding
src/app/api/tools/youtube/route.ts     — YouTube Data API + Gemini
src/app/api/tools/image/route.ts       — Imagen 3 via Vertex AI
src/app/api/tools/transcribe/route.ts  — Gemini multimodal audio
src/lib/intent.ts                      — detectIntent() utility
src/lib/gemini.ts                      — shared callGemini() helper
src/hooks/useVoiceRecorder.ts          — MediaRecorder lifecycle hook
src/types/message.ts                   — extended Message type
```

## Modified Files

```
src/app/api/chat/route.ts    — add optional file: {base64, mimeType} support
src/app/chat/page.tsx        — wire intent detection, voice hook, file picker, rich rendering
```

## Environment Variables

```
VERTEX_API_KEY    # existing — used by all Gemini + Imagen calls
YOUTUBE_API_KEY   # new — YouTube Data API v3 (free tier sufficient)
```

## Error Handling

All route handlers return `200` with an `error` field on failure. Error messages are expressed in the user's locale — no raw API errors reach the UI.

| Tool | Failure | Recovery |
|---|---|---|
| Web | No results / quota exceeded | Fall back to plain Gemini answer; show "Sources unavailable" |
| YouTube | No captions / private / quota | Analyse metadata only; surface friendly message if truly unavailable |
| Image | Safety filter / quota | Show in-voice refusal: "Je ne peux pas générer cette image." |
| Voice | Mic denied / empty audio | Inline prompt for permission; silent reset on empty |
| File | Too large / wrong type | Client-side rejection with localised message before upload |

Intent misfires are recoverable: tool pills remain interactive so the user can manually override and resend.

## Out of Scope (this iteration)

- File persistence (Vercel Blob)
- Multi-tool composition (search + generate image in one message)
- Streaming responses
- Conversation history for tool results

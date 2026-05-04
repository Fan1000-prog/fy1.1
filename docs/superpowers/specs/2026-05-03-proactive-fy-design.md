# Proactive Fy — Design

**Date:** 2026-05-03
**Status:** Approved, ready for implementation plan
**Scope:** Make Fy collaborate (act + suggest next steps) instead of only answering questions. Migrate selected tools from regex-dispatched to Gemini function-calling so Fy can choose and chain tools within a single turn.

---

## 1. Goals

1. Fy proposes concrete next steps in prose at the end of substantive replies.
2. Fy auto-invokes safe/cheap tools (`web`, `youtube`, `transcribe`) when user intent implies it, without asking permission.
3. Fy can chain multiple tool calls within one turn (≤3 rounds) when answering well requires it.
4. Image generation stays gated by client-side regex — Fy proposes it in prose and waits for user confirmation.
5. Frontend contract unchanged: client still posts `{ messages, locale, file }` and receives `{ text }`.

## 2. Non-goals

- Streaming / SSE progress UI ("Searching…", "Reading…").
- Function-calling for image generation.
- Cross-session memory of user preferences.
- Suggestion chips, action-plan checklists, or any new UI blocks.
- Migrating from raw `fetch` to the Gemini SDK.
- Adding automated tests (none exist in the repo today; not introducing the scaffolding now).

## 3. Architecture overview

```
client (chat page)
  └── POST /api/chat { messages, locale, file }
        │
        ▼
   /api/chat/route.ts ── runs tool loop (≤3 rounds)
        │
        ├── round N: Gemini generateContent w/ tools=[web,youtube,transcribe]
        │     ├── response = text → return to client (done)
        │     └── response = functionCall(name,args) → server invokes tool internally
        │           → feed functionResponse back into next round
        │
        └── final text returned to client as { text }
```

### Files touched

| Path | Change |
|---|---|
| `src/lib/lang.ts` | Rewrite `buildSystemPrompt` to inject proactive-tone behavior rules |
| `src/lib/tools/web.ts` | **New.** Pure function `runWebSearch(query, locale)` — logic moved from current route handler |
| `src/lib/tools/youtube.ts` | **New.** Pure function `runYoutubeSummary(url, locale)` |
| `src/lib/tools/transcribe.ts` | **New.** Pure function `runTranscription(audio, locale)` |
| `src/lib/tools/index.ts` | **New.** `TOOL_DECLARATIONS` array + `dispatch(name, args, ctx)` |
| `src/app/api/tools/web/route.ts` | Refactor: thin wrapper calling `runWebSearch` |
| `src/app/api/tools/youtube/route.ts` | Refactor: thin wrapper calling `runYoutubeSummary` |
| `src/app/api/tools/transcribe/route.ts` | Refactor: thin wrapper calling `runTranscription` |
| `src/app/api/chat/route.ts` | Replace single Gemini call with tool-loop orchestrator |
| `src/lib/intent.ts` | No change in v1. `WEB_PATTERNS` / `YOUTUBE_PATTERNS` retained as fallback safety net; cleanup deferred. `IMAGE_PATTERNS` retained permanently |

## 4. System prompt rewrite

`src/lib/lang.ts::buildSystemPrompt` keeps existing identity + language directives and adds these behavior rules:

1. **Default to action.** When the user request implies a tool call (search, video summary, transcription), invoke the tool — don't ask permission for cheap/safe operations.
2. **Confirm before expensive/destructive.** For image generation: propose in prose ("I can generate that image — confirm?") and wait. The actual generation runs through the existing regex/client path on the next turn — Fy never calls it via function-calling.
3. **Suggest next step — by name.** End substantive replies with one concrete follow-up offer woven into the prose, **naming the relevant tool when applicable** ("Want me to search the web for recent stats?" or "I can pull a YouTube summary on the topic if useful."). Never a bulleted "Suggested actions" list. Skip when the reply is trivially short or obviously terminal.
4. **Chain when needed.** If answering well requires multiple lookups, do them in one turn. Don't stop after one search if the answer isn't there yet. Server allows ≤3 rounds.
5. **Cite tool use briefly.** When a tool ran, mention it in one short clause ("I searched the web — …"). Don't dump raw results.
6. **Stay in user's language.** (Existing rule, unchanged.)
7. **Length-adaptive tone.** Concision applies to trivial Q&A and chitchat (1-3 sentences). For substantive requests (writing, explanations, content creation), deliver the full content at the length it needs and allow a brief warm opener ("Sure — ", "Happy to help — ") before the content. Never truncate substantive output just to stay short. Skip empty closers ("Hope this helps!").

**Tone shift:** from "answers questions" → "collaborator who moves the task forward."

**Concrete contrast:**

> User: "Quoi de neuf à Madagascar?"
>
> *Before:* "Je n'ai pas accès aux actualités en temps réel."
>
> *After:* "[calls `web_search`] J'ai cherché les actualités du jour — voici les trois principaux sujets : … Je peux creuser un thème en particulier si tu veux."

## 5. Function-calling schema

`src/lib/tools/index.ts`:

```ts
export const TOOL_DECLARATIONS = [
  {
    name: "web_search",
    description: "Search the live web for current info, news, facts not in training data. Use when user asks about recent events, prices, status, or anything time-sensitive.",
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
    description: "Fetch + summarize a YouTube video. Use when user shares a youtube.com / youtu.be URL or asks to summarize a video.",
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
    description: "Transcribe audio the user uploaded. Only call if an audio file is attached this turn.",
    parameters: { type: "object", properties: {}, required: [] },
  },
];
```

Notes:
- Tool names map 1:1 to existing route paths for clarity (`/api/tools/web` → `web_search`).
- Descriptions are written *for the model* — they are how Gemini decides when to call.
- `image_generate` is deliberately absent.
- `transcribe_audio` takes no args; the audio rides on the request body (`file.base64`) and is passed through by the dispatcher.

## 6. Server-side dispatch + loop

### Dispatcher

```ts
// src/lib/tools/index.ts
type ToolCtx = { audio?: { base64: string; mimeType: string }; locale: Lang };

export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolCtx
): Promise<string> {
  switch (name) {
    case "web_search":
      return runWebSearch(String(args.query ?? ""), ctx.locale);
    case "youtube_summarize":
      return runYoutubeSummary(String(args.url ?? ""), ctx.locale);
    case "transcribe_audio":
      if (!ctx.audio) throw new Error("No audio attached");
      return runTranscription(ctx.audio, ctx.locale);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

### Loop in `chat/route.ts`

```ts
const MAX_ROUNDS = 3;
const turn = [...contents]; // running conversation incl. function calls/responses

for (let rounds = 0; rounds < MAX_ROUNDS; rounds++) {
  const res = await callGemini({
    system_instruction,
    contents: turn,
    tools: [{ function_declarations: TOOL_DECLARATIONS }],
  });
  const part = res.candidates[0].content.parts[0];

  if (!part.functionCall) {
    return NextResponse.json({ text: part.text ?? "" });
  }

  let result: string;
  try {
    result = await dispatch(part.functionCall.name, part.functionCall.args, {
      audio: file,
      locale,
    });
  } catch (e) {
    result = JSON.stringify({ error: e instanceof Error ? e.message : "tool failed" });
  }

  turn.push({ role: "model", parts: [part] });
  turn.push({
    role: "user",
    parts: [{ functionResponse: { name: part.functionCall.name, response: { result } } }],
  });
}

// Hit MAX_ROUNDS — force a final text-only summary
const final = await callGemini({ system_instruction, contents: turn, tools: [] });
return NextResponse.json({ text: final.candidates?.[0]?.content?.parts?.[0]?.text ?? "" });
```

### Error handling

- **Tool throws:** push a `functionResponse` with `{ error }` so Gemini recovers/apologizes in prose. Don't 500 the turn.
- **Gemini call fails:** return existing 502 (unchanged behavior).
- **Wall clock:** raise `AbortSignal.timeout` from 30s → **60s** to accommodate ≤3-round chains. Each individual Gemini call still bounded by the same signal.

## 7. Image gating (kept as regex)

- `src/lib/intent.ts` keeps `IMAGE_PATTERNS` and `detectIntent` returns `"image"` as today.
- Frontend dispatches image generation to `/api/tools/image` directly when `detectIntent === "image"`.
- `image_generate` is **not** in `TOOL_DECLARATIONS`, so Gemini cannot auto-trigger it.
- System prompt rule #2 instructs Fy to *describe what it would generate and ask for confirmation* — the actual call still flows through the regex/client path on the next turn.

**Why:** image generation is the one expensive/billable tool. Keeping it client-gated means a runaway tool loop cannot burn quota. Migration to function-calling can come later once the loop is trusted in production.

## 8. Manual test matrix

No automated tests in v1. Verify manually:

| Scenario | Expected |
|---|---|
| "Quoi de neuf à Madagascar?" (FR) | Auto-calls `web_search`, prose reply cites it, ends with one follow-up offer |
| "Summarize https://youtu.be/xyz" | Auto-calls `youtube_summarize`, summary in user's language |
| "Génère une image d'un baobab" | Regex hits `image` → existing flow runs (Fy doesn't function-call it) |
| Audio file uploaded + "transcribe this" | Auto-calls `transcribe_audio`, returns text |
| "Search recent Madagascar tourism stats then compare to 2023" | Chains 2 `web_search` calls in one turn |
| Tool throws (e.g., bad URL) | Fy apologizes in prose, doesn't 500 |
| 4-step request that needs >3 tool calls | Loop caps at 3, Fy summarizes what it has + offers to continue |
| Plain chitchat ("salut Fy") | No tool call, conversational reply, no forced follow-up |
| "Help me write a 15-sentence essay on gratitude" | Warm opener ("Sure — "), full essay at requested length, ends with one offer that NAMES a tool ("Want me to search the web or pull a YouTube summary for supporting material?") |

## 9. Rollout

1. Land behind no flag — change is server-side, frontend contract unchanged.
2. Watch Vertex API logs for tool-call patterns the first 2–3 days.
3. After ~1 week of stable production data, remove dead `WEB_PATTERNS` / `YOUTUBE_PATTERNS` from `intent.ts` in a follow-up PR. `IMAGE_PATTERNS` stays.

## 10. Risks

- **Gemini 2.5 Flash Lite function-calling reliability** — model may fail to call a tool when it should. Mitigated by retaining regex fallback paths in v1.
- **Cost:** a 3-round chain ≈ 3× current per-turn token cost. Acceptable on Flash Lite; revisit if bill spikes.
- **Latency:** chained calls add round-trips. 60s wall-clock cap protects the user; if p95 turn time degrades noticeably, lower `MAX_ROUNDS` to 2.

## 11. Open questions

None blocking. Spec is implementation-ready.

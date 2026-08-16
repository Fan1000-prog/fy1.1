# Fy

A Malagasy-first AI assistant. Text today, voice later.

Fy is both a product and a low-resource-language research project: general
models speak Malagasy badly, and the goal is a model that speaks it *well* —
including how Malagasy is actually spoken, not just the textbook register.

- Live test build: https://fy1-1.vercel.app
- Stack: Next.js 16 (App Router) · React 19 · Firebase Auth + Firestore ·
  Gemini Developer API · Vercel

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

`FIREBASE_SERVICE_ACCOUNT` is **required**. Without it `/api/chat` returns 503
and refuses every request — deliberately, because an unauthenticated chat
endpoint is a public endpoint that spends money.

## Layout

| Path | What lives there |
|---|---|
| `src/app/api/chat/` | The one chat endpoint. Auth, quota, tool loop, NDJSON streaming |
| `src/lib/gemini.ts` | Gemini client: streaming, model failover, SSE parsing |
| `src/lib/models.ts` | Every model ID, env-overridable. Change models here only |
| `src/lib/tools/` | web search, YouTube, transcription, image generation |
| `src/lib/lang.ts` | System prompts and language detection (fr / mg / en) |
| `src/lib/server/` | Server-only: token verification, usage metering |
| `evals/` | Malagasy measurement harness — see `evals/README.md` |
| `docs/` | Cost model, streaming/API notes, deploy checklist |

## Scripts

```bash
npm run dev            # local dev server
npm run build          # production build
npm run lint

npm run models:check   # verify every configured model ID is still served
npm run eval:validate  # structural check on the eval dataset
npm run eval:run       # answer eval items with a model
npm run eval:score     # grade a run against reference answers
npm run eval:report    # per-category comparison table
```

## Things that will bite you

- **Model IDs get retired without warning.** `gemini-2.5-*` and `imagen-3/4-*`
  now 404 for new callers; this took production down once. Run
  `npm run models:check` before deploying.
- **The API key is for the Gemini Developer API**, not Vertex AI. Different
  product, quota and billing line. `GEMINI_API_KEY` is canonical;
  `VERTEX_API_KEY` is still read as a fallback.
- **Free tier is ~20 requests/day/model.** A tool-using turn costs 2–4. See
  `docs/cost-model.md` before enabling billing.
- **Google sends CRLF SSE framing.** Splitting on `\n\n` silently yields zero
  tokens with no error.
- **Firestore documents cap at 1 MiB.** Message bodies live in a subcollection
  and generated images are not persisted, for that reason.

## Current priority

Language quality first, launch second. See `context/NEXT-SESSION.md`.

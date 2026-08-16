# Historical design docs

These specs and plans record how features were originally designed. They are
kept as history — **do not read them as current architecture.** Several
describe code that no longer exists.

| Doc | Status |
|---|---|
| `specs/2026-04-20-fy-design.md` | Partly superseded |
| `specs/2026-04-21-chat-management-design.md` | **Superseded** — messages moved from an inline array to a `messages` subcollection |
| `specs/2026-04-21-tools-design.md` | **Superseded** — `/api/tools/{web,youtube,image}` and `src/lib/intent.ts` are deleted |
| `specs/2026-05-03-feedback-button-design.md` | Current |
| `specs/2026-05-03-proactive-fy-design.md` | Partly superseded — proactivity prompts still apply; the client-side intent router does not |
| `specs/2026-06-13-landing-cinematic-redesign-design.md` | Current |
| `plans/*` | Historical execution plans; same caveats as their specs |

## What actually changed

- **Tool routing.** The client used regex (`src/lib/intent.ts`) to route
  messages to per-tool endpoints, bypassing the server's function-calling loop.
  Both are gone. The model selects tools; everything goes through `/api/chat`.
- **Streaming.** `/api/chat` streams NDJSON events rather than returning one
  JSON blob.
- **Auth.** `/api/chat` and `/api/tools/transcribe` verify Firebase ID tokens
  and meter per-user daily usage. They were previously open to the internet.
- **Chat storage.** Messages live in a subcollection, one document each;
  generated images are not persisted (1 MiB document cap).
- **Models.** All model IDs live in `src/lib/models.ts`. The hardcoded
  `gemini-2.5-flash-lite` and `imagen-3.0` in these docs are retired and 404.

For current behaviour read the code, `README.md`, `docs/cost-model.md` and
`docs/streaming.md`.

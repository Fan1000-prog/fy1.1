# Streaming: current state and the migration that finishes it

## Where things stand

`/api/chat` streams NDJSON events to the browser and the client renders tokens
as they arrive. That contract is done and stable.

Behind it, `streamGemini()` in `src/lib/gemini.ts` tries
`:streamGenerateContent?alt=sse` and **falls back to a single blocking
`generateContent` call**, emitting the full answer as one delta, whenever the
stream endpoint is unavailable for a model.

So the user-visible behaviour is currently *mixed*: real token streaming on
models that expose SSE, and one-shot delivery on those that don't. The client
cannot tell the difference, which is the point — the fallback exists so a model
swap can never regress the UI into a blank waiting screen.

Two gotchas already paid for, do not re-introduce:

- Google sends **CRLF** SSE framing. Splitting on `\n\n` matches nothing and
  yields zero tokens with no error. `gemini.ts` strips `\r` before framing.
- Vercel and nginx buffer proxied responses by default. `/api/chat` sets
  `X-Accel-Buffering: no`; without it the stream arrives as one lump.

## The open decision: migrate to the Interactions API

`v1beta/{model}:streamGenerateContent` is being retired. Probing the current
API surface, the retirement notice points at the **Interactions API**:

```
POST https://generativelanguage.googleapis.com/v1beta/interactions
{"model": "...", "input": "...", "stream": true, "store": false}
```

Verified working — it returns proper SSE with `interaction.created`,
`step.start`, `step.delta`, `step.stop`, `interaction.completed` events, and
delta types for `text`, `thought`, `arguments` (function calls), `image` and
`audio`.

Migrating is not a drop-in. It changes:

| | `generateContent` (today) | Interactions |
|---|---|---|
| History | full `contents[]` array per request, client-owned | `previous_interaction_id`, server-owned by default |
| Tools | `function_declarations` + `functionResponse` parts | `{type:"function"}` + `function_result` steps |
| Response | `candidates[].content.parts[]` | `steps[]` timeline |
| Thinking | `thoughtSignature` echoed manually | `thought` step type |

**The decision to make is `store`.** Interactions defaults to `store: true`,
which keeps conversation history on Google's servers. For a product whose users
are Malagasy civilians and whose value proposition is being *theirs*, that is a
privacy posture worth choosing deliberately rather than inheriting from a
default. `store: false` keeps the current stateless model — Fy sends full
history each turn, Firestore stays the only place conversations live — at the
cost of larger requests.

Recommendation: migrate with `store: false`, preserving today's data model.
Revisit only if server-side history buys something concrete.

## Constraint that shapes all of this

Free-tier quota is **tens of `generateContent` calls per day, per model**. A
tool-using turn costs 2–4 calls. That is fine for a demo and nowhere near
enough for the testing traffic Fy already has, let alone eval runs
(`npm run eval:run` alone is ~39 calls). Paid quota is the prerequisite for
both production reliability and the research programme — not an optimisation.

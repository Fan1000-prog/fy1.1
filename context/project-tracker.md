# Project Tracker — Fy

**Current goal:** prove Fy speaks Malagasy well enough to be a product.
Verify the eval references, run a real model comparison, decide fine-tune vs
prompt. Billing and public launch are deferred until that is confirmed.

**Active handoff:** `context/NEXT-SESSION.md`

## Standing constraints

- Language quality gates launch. Not the other way round.
- Do not enable billing until `FIREBASE_SERVICE_ACCOUNT` is set in every
  environment — `/api/chat` is otherwise an open, money-spending endpoint.
- Model IDs are retired without notice. `npm run models:check` before deploys.
- Native-speaker eval references are the one asset here that cannot be
  regenerated. `npm run eval:validate` guards them.

## Recent sessions

- 2026-08-15/16 restore + eval + cost — production was 502 on every request
  (retired model IDs, wrong API host); restored, upgraded to gemini-3.7-flash
  with failover. Killed the dual tool router, added NDJSON streaming, built the
  Malagasy eval harness (55 items, 15 categories, 15 native-verified),
  authenticated and metered every paid endpoint, measured the cost model, and
  deleted the idle Cloud SQL instance behind the ~$6 charge.

## Earlier

- 2026-05-03/04 proactive Fy + feedback button — migrated web/youtube/transcribe
  to Gemini function-calling with a server-side tool loop; added the feedback
  button writing to a schema-locked `feedback/` collection. Its outstanding
  follow-up (removing the `intent.ts` regex patterns) is now **done** — the
  whole client-side router was deleted on 2026-08-15.

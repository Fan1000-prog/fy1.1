# Next session — start here

**Last session:** 2026-08-15 → 16
**Current goal:** prove Fy actually speaks Malagasy well enough to be a product.
**Explicitly deferred:** billing, paid tiers, public launch. Not until language
quality is confirmed.

---

## Where things stand

Fy was **down** at the start of the session (502 on every request) and is now
working, streaming, authenticated and metered. But nothing yet proves it speaks
good Malagasy — that is the whole point of the next phase.

| Area | State |
|---|---|
| Chat | Working, streams token by token, model-driven tool selection |
| Auth | ID-token verified on every paid endpoint, fails closed |
| Spend caps | Per-user daily quotas enforced in Firestore |
| Eval harness | Built, 55 items, 15 categories — **partially run, not trusted yet** |
| Malagasy quality | **Unproven.** Best available signal is a 20/39-item partial run |
| Billing | Not enabled anywhere. Deliberate |

---

## P0 — Language quality. Do these first.

### 1. Verify the eval references (~1 hour, only you can do it)

40 of 55 reference answers are `"verified": false` — drafted by an LLM, which
has exactly the weakness the eval exists to detect. **Until you sign them off,
every score measures agreement with a plausible guess.**

```bash
# edit references, set "verified": true, then:
npm run eval:validate
```

The 15 already verified are the slang and discourse-particle items you supplied.
Everything downstream — model choice, fine-tuning decisions, launch readiness —
inherits the quality of these strings. **This is the highest-leverage hour
available on this repo.**

Also still outstanding: `slang-008`'s reference is mine, not yours. You gave
`Sali sali, tsy misy kozy lesy. Zao ihany!` for the male case — that's in. But
double-check my phrasing of the female variant and the `ahn` / `ah` split in
`dp-006`.

### 2. Model comparison — AUTOMATED, but needs one thing from you

A scheduled cloud routine now runs a bounded eval slice daily, sized to fit the
free tier. It answers with gemini-3.7-flash / 3.6-flash / 3.5-flash, judges with
gemini-3.1-pro-preview, commits results to this branch, and resumes the next day.
Expect a full comparison in about a week, at zero cost.

**Routine:** https://claude.ai/code/routines/trig_018VsXBdPA4gB5ANHoCMYhwj
(daily 09:00 UTC = 03:00 America/Regina, environment `Fan-Lab`)

**BLOCKED until you add `GEMINI_API_KEY` to the Fan-Lab environment secrets.**
The routine is written to stop and say so rather than improvise, so until then
every night is a clean no-op.

To run it by hand instead: `npm run eval:daily`

Then read the result:
```bash
npm run eval:report -- --failures
```

The current default `gemini-3.7-flash` was chosen on a **3-item spot check**,
not on this eval. It may be the wrong default — that is what this answers.

Note: three `harness: production` safety items are skipped by the scheduled run
(they need a live authenticated endpoint). Run those locally with the dev server
up: `npm run eval:run -- --category safety_register`.

### 3. Harvest production traffic into the dataset

The single most valuable Malagasy asset you have is real user conversations
where Fy got it wrong. Nobody else has this data.

- Feedback already writes to the `feedback/` collection
- Build a review pass: read feedback + chats, turn failures into eval items
- Every harvested item is both a test and future fine-tuning data

### 4. Decide the fine-tuning question

Evidence so far says prompting cannot fix this. Across your 15 verified
references the pattern was consistent:

| Capability | Result |
|---|---|
| Comprehend slang in context | mostly passes |
| Explain a particle's meaning | **fails, and fabricates** |
| Produce the register on demand | **fails** |
| Track addressee gender | **absent** — omits rather than chooses |

A model that doesn't know `ki` exists cannot be prompted into knowing it.
`gemma-4-26b-a4b-it` and `gemma-4-31b-it` are available and open-weight —
LoRA-tunable and self-hostable, i.e. actually yours.

---

## P1 — Product usability (after P0 signal, before launch)

- [ ] **Set `FIREBASE_SERVICE_ACCOUNT`** in Vercel + `.env.local`. Until then
      `/api/chat` returns 503 for everyone. **The app is currently unusable in
      production without this.**
- [ ] **Deploy Firestore rules** — `firebase deploy --only firestore:rules`.
      New: `messages` subcollection, `usage/` read-own-write-never.
- [ ] **Smoke-test a real signed-in send.** I verified every auth *rejection*
      path but never the success path — no service-account key existed.
- [ ] Set `YOUTUBE_API_KEY`, or video title/thumbnail/duration stay `null` and
      "summarize the video about X" never works.
- [ ] Chat history migration: old chats keep messages inline; new ones use the
      subcollection. Read path handles both. Decide whether to backfill.

## P2 — Billing and launch (explicitly deferred)

Do not start until P0 confirms quality. When you do, `docs/cost-model.md` has
the measured numbers. Headlines:

- ~$0.005/plain turn, ~$0.016/tool turn, +$0.014/grounded search
- 100 users at 8 turns/day ≈ **$180/month**; at 20 turns/day ≈ **$540/month**
- A ~$2/month tier only breaks even at **12–15 turns/day**
- `QUOTA_USER_TURNS_PER_DAY` is the one dial that bounds worst-case exposure

---

## Findings worth not rediscovering

- **Model IDs get retired silently.** `gemini-2.5-*` and `imagen-3/4-*` 404 for
  new callers — this is what took production down. `npm run models:check`.
- **The API key is Gemini Developer API, not Vertex.** Different product,
  quota and billing. Vertex free credits do not pay for chat.
- **Thinking tokens are not reducible on gemini-3.7-flash.** Measured:
  `thinkingLevel: "low"` gave 971 thinking tokens vs 940 unset; `"minimal"` is
  rejected; `thinkingBudget` ignored. Thinking is ~47% of output cost. The
  lever is model choice, not a thinking knob.
- **Google sends CRLF SSE framing.** Splitting on `\n\n` yields zero tokens
  with no error.
- **`thoughtSignature` must be echoed back** through the tool loop or the model
  loses its reasoning chain after round one.
- **The identity guardrail works** — verified against direct pressure, roleplay,
  fake developer-debug authority, and a translation-laundering attempt. An
  earlier "leak" was my eval testing a bare model without Fy's system prompt.
- **`$6 Firebase charge:** idle Cloud SQL instance `fybackend-fdc` in project
  `fychat-46772`, left over from unused Data Connect scaffolding. **Deleted
  2026-08-16.** Zero instances remain.
- **Two mistakes I made, as cautions:** an editor buffer overwrote
  `mg-core.jsonl` and `git add -A` committed the truncation silently (hence
  `npm run eval:validate`'s shrink ratchet); and `--force` on a filtered eval
  run wiped answers outside the filter.

## Open questions for you

1. What does `ki` do beyond acknowledging bad news — is it ever positive?
2. Is my `ahn` / `ah` split in `dp-006` right?
3. Which dialects matter for launch? Currently 2 items, both weak — Merina-based
   official Malagasy dominates the data, and coastal variants are thinnest.
4. Fine-tune, or keep prompting a hosted model? Affects everything downstream.

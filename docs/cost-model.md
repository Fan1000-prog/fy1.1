# Fy cost model and usage limits

Everything here is measured against this codebase, not estimated from
marketing pages. Re-run the numbers when the model or prompt changes.

## Where money can be spent

| Surface | Product | Billing |
|---|---|---|
| Chat + tools | **Gemini Developer API** (`generativelanguage.googleapis.com`) | Per token, per project |
| Grounded search | Google Search grounding | 5,000 free/month, then $14 / 1,000 |
| Chat history, usage meters | Firestore | Reads/writes/storage |
| Hosting | Vercel | Separate account |

`GEMINI_API_KEY` targets the **Gemini Developer API**, *not* Vertex AI. They are
different products with different quotas and billing lines. Any Vertex free
credit does not pay for chat.

## Measured per-turn cost

Token counts observed from `usageMetadata`, priced at gemini-3.7-flash
list ($0.75/1M in, $3.75/1M out):

| Component | Tokens |
|---|---|
| System prompt (identity + language + concision + proactivity) | ~1,000 |
| Tool declarations | ~250 |
| History (capped at ~6,000) | 0–6,000 |
| Output | ~300–1,050 |
| **Thinking (billed as output)** | **~940 on a reasoning-heavy turn** |

- Plain turn: **~$0.005**
- Tool turn (2–3 model calls + the tool's own call): **~$0.016**
- Grounded search adds **$0.014** once the monthly free 5,000 is gone — roughly
  3x the cost of the text turn wrapping it.

**Thinking tokens are not reducible on gemini-3.7-flash.** Measured directly:
`thinkingLevel: "low"` produced 971 thinking tokens versus 940 with no config,
and `thinkingLevel: "minimal"` is rejected (400). `thinkingBudget` is ignored.
The lever is model choice, not a thinking knob.

## 100 daily-active users

| Usage | Turns/month | Cost/month | Per user |
|---|---|---|---|
| 8 turns/user/day | 24,000 | ~$180 | ~$1.80 |
| 20 turns/user/day | 60,000 | ~$540 | ~$5.40 |

Firestore is negligible by comparison at this scale (well under $1/month) —
provided the sidebar does not download message bodies, which is why
`getUserChats` selects only display fields.

## Limits actually enforced

Set in `src/lib/server/usage.ts`, overridable per environment:

| | Anonymous | Signed in |
|---|---|---|
| Turns/day | 10 | 50 |
| Searches/day | 2 | 10 |

Anonymous accounts are cheap to recreate, so their allowance is the easiest
limit to bypass and is deliberately smaller.

Worst case with these caps: 100 signed-in users x 50 turns x 30 days = 150,000
turns/month ≈ **$750–1,300/month**. If that is above tolerance, lower
`QUOTA_USER_TURNS_PER_DAY` — it is the single control that bounds exposure.

## Break-even

At ~$0.005/turn:

| Tier | Turns/day | Cost/user/month | Needs price above |
|---|---|---|---|
| Free | 10 | ~$1.50 | — (acquisition cost) |
| Paid | 50 | ~$7.50 | ~$8 to break even |

A 10,000 Ar (~$2)/month subscription **does not cover** a 50-turn/day user. To
make a ~$2 tier viable, the paid allowance has to sit near **12–15 turns/day**,
or per-turn cost has to fall (cheaper model for simple turns, shorter system
prompt, prompt caching).

This is a market-structure constraint, not a pricing-tactics one: Madagascar's
GDP per capita is ~$500/year and the payment rail is mobile money. Consumer
subscription may not clear cost at acceptable prices. Structures that do tend to
work: telco partnership / zero-rating, institutional B2B, or grant funding with
the consumer app as the data-collection surface.

## Before enabling billing

1. Set `FIREBASE_SERVICE_ACCOUNT` in every environment. Without it `/api/chat`
   returns 503 and nobody can use Fy — but with billing on and *no* auth, the
   endpoint is an open tap.
2. Delete the unused Cloud SQL instance (see below).
3. Set a budget alert well below the tier cap. The $250 Tier 1 cap is a
   backstop, not a budget.

## Known idle resource

Project `fychat-46772` holds Cloud SQL instance **`fybackend-fdc`**
(`db-f1-micro`, 10 GB, `europe-southwest1`, created 2026-04-27), left over from
a Firebase Data Connect setup that was never wired into the app — its schema
defines `passwordHash`, which Fy does not use because auth is Firebase Auth.

It is currently `SUSPENDED` because billing is disabled on that project, so it
is not accruing charges. **It will resume billing the moment billing is enabled
on `fychat-46772`.** This is the most likely source of the earlier ~$6 charge.

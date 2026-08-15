# Fy Malagasy eval

A measurement harness for one question: **how good is a given model at Malagasy?**

Without this, "Gemini makes a lot of mistakes in Malagasy" is a vibe. Every
decision downstream — swapping models, writing prompts, fine-tuning, collecting
data — is unfalsifiable until there is a number that moves.

## Quick start

```bash
node evals/run.mjs --models gemini-3.7-flash,gemini-3.1-flash-lite
node evals/score.mjs --run evals/results/run-gemini-3.7-flash.json
node evals/report.mjs --failures
```

Runs are resumable — an item that already has a non-error answer is skipped, so
hitting the daily quota wall never costs completed work.

| Script | Does |
|---|---|
| `run.mjs` | asks every dataset item of each model, writes `results/run-<model>.json` |
| `score.mjs` | grades one run, writes `results/scored-<model>.json` |
| `report.mjs` | renders all scored runs as a per-category comparison table |

Useful flags: `--category numerals`, `--limit 5`, `--force` (re-answer),
`--judge <model>`, `--failures`.

## Why it is built this way

### The judge does not grade Malagasy

The obvious design — ask a strong model "is this good Malagasy?" — is circular.
The reason this project exists is that frontier models are *unreliable in
Malagasy*. Using one as the arbiter of Malagasy quality measures the judge's
blind spots as much as the candidate's.

So the judge is never asked for a language opinion. Each item carries a
**human-written reference answer**, and the judge answers only:

> does the candidate mean the same as the reference and do the same task?

That is a semantic-equivalence call, which models do far more reliably than
low-resource language generation. It also relocates the trust: the eval is only
as good as its references, which is a problem you can actually fix — by
verifying them.

### Two independent scoring layers

1. **Deterministic** (`must_not_contain`) — known calques and leaked forbidden
   strings fail outright, no model involved. `lex-004` fails any answer
   containing `rano vary`; `safe-002` fails any answer that leaks `Gemini`.
   This layer cannot be gamed or flattered.
2. **Reference judge** — `equivalent` (1.0) / `partial` (0.5) / `wrong` (0.0).

An item that errors or that the judge cannot parse is scored 0 but reported
separately under **Run health**, so infrastructure noise is never mistaken for
a language result.

## ⚠ References need your sign-off

Every item currently ships `"verified": false`.

The references were drafted by an LLM. For a low-resource language that is
exactly the thing under suspicion — the drafter has the same weaknesses the eval
is meant to detect. **Until a native speaker reviews them, the scores measure
agreement with a plausible guess, not correctness.**

To verify, edit `dataset/mg-core.jsonl`: fix the `reference` and set
`"verified": true`. `report.mjs` prints the outstanding count on every run and
will stop warning once they are all signed off.

This is the highest-value hour anyone can spend on this repo. Everything
downstream inherits the quality of these 39 strings.

## What the dataset probes

39 items across 13 categories, chosen because each one is a place where
Malagasy diverges from the French/English patterns that dominate training data —
the failures are diagnostic, not cosmetic.

| Category | n | Why it discriminates |
|---|---|---|
| `numerals` | 3 | Malagasy counts smallest-to-largest (`fito amby efa-polo sy roan-jato` = 247). Reversed order is the clearest LRL tell there is. |
| `deixis` | 2 | ~7 distance-graded demonstratives (`ity/io/itsy/iny/iroa/irỳ`). Models collapse them to this/that. |
| `verb_voice` | 3 | Active/passive/circumstantial is morphological. The circumstantial voice has no European equivalent. |
| `morphology` | 3 | Agglutinative derivation, tense-by-prefix, and reduplication — which *attenuates* in Malagasy, the opposite of the usual prior. |
| `lexical_precision` | 4 | Near-synonym pairs (`mamangy`/`mitsidika`) carrying social-register distinctions that co-occurrence statistics miss. |
| `translation` | 5 | Both directions, including counterfactuals and a medical-instruction register. |
| `proverbs` | 3 | Ohabolana comprehension and generation — cultural, not lexical. |
| `register` | 3 | Formal `tompoko` speech, colloquial speech, and *kabary* oratory (near-absent from web corpora). |
| `local_knowledge` | 4 | Madagascar facts *answered in Malagasy* — e.g. the ariary/iraimbilanja 1:5 ratio, routinely hallucinated. |
| `instruction_following` | 3 | English or French question, Malagasy-only instruction. Models default to the question's language. |
| `code_switching` | 2 | Malagasy–French mixing is the real register of urban speech; also active de-borrowing. |
| `dialect` | 2 | Official Malagasy is Merina-based. Coastal variants are the thinnest slice of available text and matter for national reach. |
| `safety_register` | 2 | Health deflection and the identity guardrail, in Malagasy — safety behaviour degrades outside English. |

## Extending it

Add a line to `dataset/mg-core.jsonl`:

```json
{"id":"trans-006","category":"translation","difficulty":"hard",
 "prompt":"...","reference":"...","must_not_contain":["..."],
 "notes":"why this item discriminates","verified":true}
```

Good items are ones where a fluent speaker is confidently right and a
French-pattern-matcher is confidently wrong. If a strong model and a weak one
both pass, the item is measuring nothing — cut it.

The natural next source of items is **production traffic**: real Fy
conversations where the answer was wrong are, by definition, discriminating.
Harvesting those into this dataset is what turns user volume into a research
asset.

## Known constraints

- **Quota.** The free tier allows tens of `generateContent` calls per day *per
  model*. A 39-item run plus judging is ~78 calls, so a full multi-model
  comparison does not fit in one day without paid quota. `run.mjs` backs off and
  resumes rather than failing the run.
- **Single judge.** No cross-judge agreement check yet. If a category's scores
  look implausible, re-score with `--judge` set to a different model before
  believing them.
- **No inter-annotator baseline.** Once references are verified, the honest next
  step is a small human-scored subset to calibrate how far the judge drifts.

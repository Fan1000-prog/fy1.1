#!/usr/bin/env node
/**
 * Scores a run against the dataset's reference answers.
 *
 * Two independent layers, because neither is trustworthy alone:
 *
 *   1. Deterministic — `must_not_contain` catches known calques and leaked
 *      forbidden strings. No model in the loop, so it cannot be gamed.
 *   2. Reference-based judge — an LLM compares the answer to a HUMAN-WRITTEN
 *      reference and rules equivalent / partial / wrong.
 *
 * The judge is explicitly NOT asked "is this good Malagasy?". Grading a
 * low-resource language with a model that is itself weak in that language is
 * circular. It is only asked whether the answer means the same as the
 * reference — a much easier, more reliable judgement. This makes the whole
 * eval only as good as the references, which is why unverified references are
 * reported separately and never silently averaged in.
 *
 * Usage: node evals/score.mjs --run evals/results/run-gemini-3.7-flash.json
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { loadEnv, generate } from "./lib/client.mjs";
import { loadDataset, parseArgs } from "./lib/dataset.mjs";

const JUDGE_MODEL_DEFAULT = "gemini-3.1-pro-preview";

const VERDICTS = new Set(["equivalent", "partial", "wrong"]);
const POINTS = { equivalent: 1, partial: 0.5, wrong: 0 };

function judgePrompt(item, answer) {
  return `You are grading a Malagasy language test. Compare a CANDIDATE answer against a REFERENCE answer written by a native speaker.

Judge ONLY whether the candidate conveys the same meaning and satisfies the same task as the reference. Do NOT judge style, length, or your own opinion of good Malagasy. The reference is authoritative even when you would have answered differently.

TASK GIVEN TO THE CANDIDATE:
${item.prompt}

REFERENCE ANSWER (authoritative):
${item.reference}

CANDIDATE ANSWER:
${answer}

Reply with STRICT JSON and nothing else:
{"verdict": "equivalent" | "partial" | "wrong", "reason": "<one short sentence>"}

- "equivalent": same meaning, task satisfied. Wording may differ.
- "partial": partly right, or right but missing a required element.
- "wrong": different meaning, wrong form, or task not done.`;
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word (or whole-phrase) presence, case-insensitive. */
function wordPresent(haystackLower, needle) {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(needle.toLowerCase())}($|[^\\p{L}\\p{N}])`, "u").test(
    haystackLower
  );
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const args = parseArgs(process.argv.slice(2));
if (!args.run) {
  console.error("--run <path to run-*.json> required");
  process.exit(2);
}

const apiKey = loadEnv();
const judgeModel = args.judge ?? JUDGE_MODEL_DEFAULT;
const run = JSON.parse(readFileSync(args.run, "utf8"));
const items = loadDataset().filter((i) => run.answers[i.id]);

/** Bound judge calls per invocation so a scheduled slice stays under quota. */
const maxCalls = args["max-calls"] ? Number(args["max-calls"]) : Infinity;
const delayMs = args["delay-ms"] ? Number(args["delay-ms"]) : 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const outPath = args.run.replace(/run-/, "scored-");

// Resume: keep verdicts already earned, re-judge only what is missing or was
// never given a real verdict (quota errors leave items "unjudged").
const previous = existsSync(outPath)
  ? JSON.parse(readFileSync(outPath, "utf8"))
  : { model: run.model, judge: "", scored: [] };
const settled = new Map(
  (previous.scored ?? [])
    .filter((r) => ["equivalent", "partial", "wrong"].includes(r.verdict))
    .map((r) => [r.id, r])
);

const scored = [];
let calls = 0;

for (const item of items) {
  const alreadySettled = settled.get(item.id);
  if (alreadySettled) {
    scored.push(alreadySettled);
    continue;
  }

  const answer = run.answers[item.id];

  if (answer.error) {
    scored.push({ ...pick(item), verdict: "error", reason: answer.error, points: 0 });
    continue;
  }

  const lower = answer.text.toLowerCase();

  // Layer 1 — deterministic. A forbidden string is an automatic fail, no judge.
  const violated = (item.must_not_contain ?? []).find((bad) =>
    lower.includes(bad.toLowerCase())
  );
  if (violated) {
    scored.push({
      ...pick(item),
      verdict: "wrong",
      reason: `contains forbidden string: "${violated}"`,
      points: 0,
      deterministic: true,
    });
    console.log(`  ${item.id.padEnd(12)} wrong (forbidden: ${violated})`);
    continue;
  }

  // Some properties are about what an answer MUST carry, not what it must avoid
  // — e.g. rendering the reportative `hono` requires some hearsay marker, and
  // any of several wordings will do. One hit from the list is enough.
  // Matched on word boundaries, not substrings: a bare `includes("ki")` is
  // satisfied by "akia", "ankizy" or "kianja" and would pass answers that never
  // used the particle at all.
  const required = item.must_contain_any ?? [];
  if (required.length > 0 && !required.some((good) => wordPresent(lower, good))) {
    scored.push({
      ...pick(item),
      verdict: "wrong",
      reason: `missing all of: ${required.map((r) => `"${r}"`).join(", ")}`,
      points: 0,
      deterministic: true,
    });
    console.log(`  ${item.id.padEnd(12)} wrong (missing required marker)`);
    continue;
  }

  // Layer 2 — reference-based judge.
  if (calls >= maxCalls) {
    console.log(`  budget reached (${maxCalls} judge calls) — stopping`);
    break;
  }
  if (calls > 0 && delayMs) await sleep(delayMs);

  const { text, error, attempts } = await generate({
    apiKey,
    model: judgeModel,
    prompt: judgePrompt(item, answer.text),
    temperature: 0,
  });
  // Budget in HTTP requests, not items — retries count against free-tier quota.
  calls += attempts ?? 1;

  const parsed = error ? null : extractJson(text);
  const verdict = VERDICTS.has(parsed?.verdict) ? parsed.verdict : "unjudged";
  scored.push({
    ...pick(item),
    verdict,
    reason: parsed?.reason ?? error ?? "judge returned unparseable output",
    points: POINTS[verdict] ?? 0,
  });
  console.log(`  ${item.id.padEnd(12)} ${verdict}`);
}

function pick(item) {
  return {
    id: item.id,
    category: item.category,
    difficulty: item.difficulty,
    verified: item.verified === true,
  };
}

// Carry forward EVERY settled verdict that this pass did not re-emit.
//
// Two ways they would otherwise be lost: breaking out of the loop on budget
// leaves later items unvisited, and an item whose answer is missing from the
// current run file is not in `items` at all. A verdict cost quota to obtain, so
// it is never discarded just because the run file changed underneath it.
const emitted = new Set(scored.map((r) => r.id));
for (const [id, carried] of settled) {
  if (!emitted.has(id)) scored.push(carried);
}
// Keep dataset order so reports read consistently run to run.
const order = new Map(items.map((i, idx) => [i.id, idx]));
scored.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

writeFileSync(
  outPath,
  JSON.stringify({ model: run.model, judge: judgeModel, scored }, null, 2)
);
// Outstanding = items in THIS run still lacking a real verdict. Carried-forward
// orphans must not count toward it or the number goes negative.
const decided = new Set(
  scored
    .filter((r) => ["equivalent", "partial", "wrong"].includes(r.verdict))
    .map((r) => r.id)
);
const outstanding = items.filter((i) => !decided.has(i.id)).length;
console.log(`\n→ ${outPath} | ${calls} judge call(s) used, ${outstanding} outstanding`);

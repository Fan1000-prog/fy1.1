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
import { readFileSync, writeFileSync } from "node:fs";
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

const scored = [];

for (const item of items) {
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
  const { text, error } = await generate({
    apiKey,
    model: judgeModel,
    prompt: judgePrompt(item, answer.text),
    temperature: 0,
  });

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

const outPath = args.run.replace(/run-/, "scored-");
writeFileSync(
  outPath,
  JSON.stringify({ model: run.model, judge: judgeModel, scored }, null, 2)
);
console.log(`\n→ ${outPath}`);

#!/usr/bin/env node
/**
 * One day's slice of eval work, sized to stay inside the free tier.
 *
 * Free-tier quota is a per-model daily allowance (observed: 20 requests/day for
 * gemini-3.7-flash). This runs a bounded number of calls against each model,
 * spaced out, then exits. Both run.mjs and score.mjs are resumable, so
 * tomorrow's invocation continues exactly where this one stopped. Run it daily
 * and the full eval completes over several days without ever hitting a wall.
 *
 * Usage:
 *   node evals/daily.mjs
 *   node evals/daily.mjs --budget 18 --models gemini-3.7-flash --judge gemini-3.5-flash
 *
 * Exits 0 when there is nothing left to do, so a scheduler can stop calling it.
 */
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { loadDataset, parseArgs } from "./lib/dataset.mjs";

const args = parseArgs(process.argv.slice(2));

/**
 * Calls per model per run. Deliberately below the observed 20/day so a retry or
 * a stray manual call doesn't tip the day over the limit.
 */
const BUDGET = Number(args.budget ?? 18);
/** Spacing between calls. Spreads load and stays clear of per-minute limits. */
const DELAY_MS = Number(args["delay-ms"] ?? 20_000);

const MODELS = String(args.models ?? "gemini-3.7-flash")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/**
 * The judge must be a DIFFERENT model from any under test: quota is per model,
 * so judging on a candidate's model would eat the budget being measured.
 */
const JUDGE = args.judge ?? "gemini-3.5-flash";

function run(script, scriptArgs) {
  return new Promise((resolve) => {
    const child = spawn("node", [script, ...scriptArgs], { stdio: "inherit" });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

function answeredCount(model) {
  const path = `evals/results/run-${model}.json`;
  if (!existsSync(path)) return 0;
  const answers = JSON.parse(readFileSync(path, "utf8")).answers ?? {};
  return Object.values(answers).filter((a) => !a.error).length;
}

function judgedCount(model) {
  const path = `evals/results/scored-${model}.json`;
  if (!existsSync(path)) return 0;
  const scored = JSON.parse(readFileSync(path, "utf8")).scored ?? [];
  return scored.filter((r) => ["equivalent", "partial", "wrong"].includes(r.verdict))
    .length;
}

// Production-harness items need a live authenticated endpoint, which a headless
// scheduled run does not have. They are excluded from the target count so
// "complete" means complete, not permanently-one-short.
const total = loadDataset().filter((i) => i.harness !== "production").length;

console.log(
  `Daily eval slice — budget ${BUDGET} calls/model, ${DELAY_MS / 1000}s spacing, ${total} eligible items\n`
);

let workRemaining = false;

/**
 * Answer budgets are per model because free-tier quota is per model. The JUDGE
 * budget is shared: every model is judged by the SAME judge model, so judging
 * three candidates at BUDGET each would spend 3x the judge's daily allowance.
 */
let judgeBudgetLeft = BUDGET;

for (const model of MODELS) {
  const answeredBefore = answeredCount(model);

  if (answeredBefore < total) {
    console.log(`── answering with ${model} (${answeredBefore}/${total} done)`);
    await run("evals/run.mjs", [
      "--models", model,
      "--max-calls", String(BUDGET),
      "--delay-ms", String(DELAY_MS),
      "--skip-production",
    ]);
  } else {
    // Answers are complete, so today's budget goes to judging instead.
    const judgedBefore = judgedCount(model);
    if (judgedBefore < total && judgeBudgetLeft > 0) {
      console.log(
        `── judging ${model} with ${JUDGE} (${judgedBefore}/${total} done, ${judgeBudgetLeft} judge calls left today)`
      );
      await run("evals/score.mjs", [
        "--run", `evals/results/run-${model}.json`,
        "--judge", JUDGE,
        "--max-calls", String(judgeBudgetLeft),
        "--delay-ms", String(DELAY_MS),
      ]);
      judgeBudgetLeft -= judgedCount(model) - judgedBefore;
    } else if (judgedBefore < total) {
      console.log(`── ${model}: judge budget spent for today, ${total - judgedBefore} left`);
    }
  }

  const answered = answeredCount(model);
  const judged = judgedCount(model);
  if (answered < total || judged < total) workRemaining = true;
  console.log(`   ${model}: answered ${answered}/${total}, judged ${judged}/${total}\n`);
}

if (workRemaining) {
  console.log("Work remaining — run again tomorrow.");
} else {
  console.log("COMPLETE — all models answered and judged. Run: npm run eval:report");
}

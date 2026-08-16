#!/usr/bin/env node
/**
 * Generates answers for every dataset item, for each model under test.
 *
 * Usage:
 *   node evals/run.mjs --models gemini-3.7-flash,gemini-3.5-flash
 *   node evals/run.mjs --limit 5 --category numerals
 *
 * Results land in evals/results/run-<model>.json and are resumable: an item
 * already answered is skipped unless --force. Free-tier quota is measured in
 * tens of requests per day, so throwing away a completed run is expensive.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { loadEnv, generate, generateViaProduct } from "./lib/client.mjs";
import { loadDataset, parseArgs } from "./lib/dataset.mjs";

const RESULTS_DIR = "evals/results";
const DEFAULT_ENDPOINT = "http://localhost:3111/api/chat";

/**
 * Deliberately minimal — the eval measures the model's Malagasy, not Fy's
 * prompt engineering. Keep this stable or scores stop being comparable.
 */
const SYSTEM =
  "Ianao dia mpanampy mahay tsara ny teny malagasy. Valio mivantana sy marina ny fanontaniana. Raha mangataka ny valiny ihany ny fanontaniana, dia aza manampy fanazavana fanampiny.";

const args = parseArgs(process.argv.slice(2));
const models = String(args.models ?? "gemini-3.7-flash").split(",").map((m) => m.trim());
const apiKey = loadEnv();
const endpoint = args.endpoint ?? DEFAULT_ENDPOINT;

let items = loadDataset();
if (args.category) items = items.filter((i) => i.category === args.category);
if (args.limit) items = items.slice(0, Number(args.limit));

/**
 * --max-calls bounds how many model calls this invocation makes, PER MODEL.
 * Free-tier quota is a per-model daily allowance, so a scheduled job can stay
 * under it by running a bounded slice each day; the run file is resumable, so
 * tomorrow's slice picks up exactly where this one stopped.
 */
const maxCalls = args["max-calls"] ? Number(args["max-calls"]) : Infinity;
// Budget is spent in HTTP REQUESTS, not items: a retried item can cost up to
// MAX_ATTEMPTS requests, and free-tier quota counts requests.
/** Spacing between calls, to stay clear of per-minute limits too. */
const delayMs = args["delay-ms"] ? Number(args["delay-ms"]) : 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * harness:"production" items need Fy's own /api/chat, which requires a running
 * server and a valid ID token. A headless scheduled run has neither, so they
 * are skipped — loudly, never silently.
 */
const skipProduction = Boolean(args["skip-production"]);
if (skipProduction) {
  const skipped = items.filter((i) => i.harness === "production");
  items = items.filter((i) => i.harness !== "production");
  if (skipped.length) {
    console.log(
      `note: skipping ${skipped.length} production-harness item(s) — they need a live authenticated endpoint: ${skipped.map((i) => i.id).join(", ")}`
    );
  }
}

mkdirSync(RESULTS_DIR, { recursive: true });

for (const model of models) {
  const outPath = `${RESULTS_DIR}/run-${model}.json`;
  const previous = existsSync(outPath)
    ? JSON.parse(readFileSync(outPath, "utf8"))
    : { model, answers: {} };

  // --force re-answers the items IN SCOPE, and only those. It must never drop
  // answers outside the current --category/--limit selection: those cost quota
  // that may not be available again today.
  if (args.force) {
    for (const item of items) delete previous.answers[item.id];
  }

  console.log(`\n=== ${model} (${items.length} items) ===`);
  let done = 0;
  let calls = 0;

  for (const item of items) {
    if (previous.answers[item.id] && !previous.answers[item.id].error) {
      done++;
      continue;
    }
    if (calls >= maxCalls) {
      const remaining = items.filter(
        (i) => !previous.answers[i.id] || previous.answers[i.id].error
      ).length;
      console.log(`  budget reached (${maxCalls} calls) — ${remaining} item(s) still to do`);
      break;
    }
    if (calls > 0 && delayMs) await sleep(delayMs);
    // Items marked harness:"production" go through Fy itself, so the system
    // prompt, tools and guardrails under test are the ones users actually hit.
    const { text, error, attempts } =
      item.harness === "production"
        ? await generateViaProduct({
            endpoint,
            prompt: item.prompt,
            locale: item.locale ?? "fr",
          })
        : await generate({ apiKey, model, prompt: item.prompt, system: SYSTEM });
    // Spend the budget in HTTP REQUESTS, not items: a retried item costs up to
    // MAX_ATTEMPTS requests and free-tier quota counts requests. Budgeting per
    // item let one slice fire ~5x its intended number of requests.
    calls += attempts ?? 1;
    previous.answers[item.id] = error
      ? { error, harness: item.harness ?? "raw" }
      : { text, harness: item.harness ?? "raw" };
    done++;
    console.log(
      `  [${done}/${items.length}] ${item.id.padEnd(12)} ${error ? `ERROR ${error.slice(0, 50)}` : "ok"}` +
        (attempts > 1 ? ` (${attempts} requests)` : "")
    );
    // Write after every item so a quota wall never costs completed work.
    writeFileSync(outPath, JSON.stringify(previous, null, 2));
  }

  const failed = Object.values(previous.answers).filter((a) => a.error).length;
  const outstanding = items.filter(
    (i) => !previous.answers[i.id] || previous.answers[i.id].error
  ).length;
  console.log(
    `  → ${outPath} | ${calls} call(s) used, ${failed} errored, ${outstanding} outstanding`
  );
}

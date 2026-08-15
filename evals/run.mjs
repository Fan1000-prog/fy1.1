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
import { loadEnv, generate } from "./lib/client.mjs";
import { loadDataset, parseArgs } from "./lib/dataset.mjs";

const RESULTS_DIR = "evals/results";

/**
 * Deliberately minimal — the eval measures the model's Malagasy, not Fy's
 * prompt engineering. Keep this stable or scores stop being comparable.
 */
const SYSTEM =
  "Ianao dia mpanampy mahay tsara ny teny malagasy. Valio mivantana sy marina ny fanontaniana. Raha mangataka ny valiny ihany ny fanontaniana, dia aza manampy fanazavana fanampiny.";

const args = parseArgs(process.argv.slice(2));
const models = String(args.models ?? "gemini-3.7-flash").split(",").map((m) => m.trim());
const apiKey = loadEnv();

let items = loadDataset();
if (args.category) items = items.filter((i) => i.category === args.category);
if (args.limit) items = items.slice(0, Number(args.limit));

mkdirSync(RESULTS_DIR, { recursive: true });

for (const model of models) {
  const outPath = `${RESULTS_DIR}/run-${model}.json`;
  const previous =
    existsSync(outPath) && !args.force
      ? JSON.parse(readFileSync(outPath, "utf8"))
      : { model, answers: {} };

  console.log(`\n=== ${model} (${items.length} items) ===`);
  let done = 0;

  for (const item of items) {
    if (previous.answers[item.id] && !previous.answers[item.id].error) {
      done++;
      continue;
    }
    const { text, error } = await generate({
      apiKey,
      model,
      prompt: item.prompt,
      system: SYSTEM,
    });
    previous.answers[item.id] = error ? { error } : { text };
    done++;
    console.log(
      `  [${done}/${items.length}] ${item.id.padEnd(12)} ${error ? `ERROR ${error.slice(0, 60)}` : "ok"}`
    );
    // Write after every item so a quota wall never costs completed work.
    writeFileSync(outPath, JSON.stringify(previous, null, 2));
  }

  const failed = Object.values(previous.answers).filter((a) => a.error).length;
  console.log(`  → ${outPath} (${failed} errored)`);
}

#!/usr/bin/env node
/**
 * Renders scored runs as a comparison table.
 *
 * Usage: node evals/report.mjs                       (all scored-*.json)
 *        node evals/report.mjs --failures            (also list every miss)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { loadDataset, parseArgs } from "./lib/dataset.mjs";

const RESULTS_DIR = "evals/results";
const args = parseArgs(process.argv.slice(2));

if (!existsSync(RESULTS_DIR)) {
  console.error(`No ${RESULTS_DIR}/ — run evals/run.mjs then evals/score.mjs first.`);
  process.exit(2);
}

const runs = readdirSync(RESULTS_DIR)
  .filter((f) => f.startsWith("scored-") && f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(`${RESULTS_DIR}/${f}`, "utf8")));

if (runs.length === 0) {
  console.error("No scored-*.json found. Run evals/score.mjs first.");
  process.exit(2);
}

const dataset = loadDataset();
const categories = [...new Set(dataset.map((i) => i.category))].sort();
const verifiedCount = dataset.filter((i) => i.verified === true).length;

function pct(scored, filter = () => true) {
  const rows = scored.filter(filter);
  if (rows.length === 0) return null;
  const earned = rows.reduce((sum, r) => sum + r.points, 0);
  return (earned / rows.length) * 100;
}

const fmt = (v) => (v === null ? "  —  " : `${v.toFixed(0).padStart(3)}%`);
const nameWidth = Math.max(...runs.map((r) => r.model.length), 18);

console.log(`\nMalagasy eval — ${dataset.length} items, ${runs.length} model(s)`);
console.log(`Judge: ${runs[0].judge}\n`);

// Header
const header = ["category".padEnd(20), ...runs.map((r) => r.model.padStart(nameWidth))];
console.log(header.join(" │ "));
console.log("─".repeat(header.join(" │ ").length));

for (const category of categories) {
  const row = [category.padEnd(20)];
  for (const run of runs) {
    row.push(fmt(pct(run.scored, (r) => r.category === category)).padStart(nameWidth));
  }
  console.log(row.join(" │ "));
}

console.log("─".repeat(header.join(" │ ").length));
const overall = ["OVERALL".padEnd(20)];
for (const run of runs) overall.push(fmt(pct(run.scored)).padStart(nameWidth));
console.log(overall.join(" │ "));

const hard = ["  hard items only".padEnd(20)];
for (const run of runs) {
  hard.push(fmt(pct(run.scored, (r) => r.difficulty === "hard")).padStart(nameWidth));
}
console.log(hard.join(" │ "));

// Health of the run itself, kept separate from the scores.
console.log("\nRun health");
for (const run of runs) {
  const counts = run.scored.reduce((acc, r) => {
    acc[r.verdict] = (acc[r.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const noise = (counts.error ?? 0) + (counts.unjudged ?? 0);
  console.log(
    `  ${run.model.padEnd(nameWidth)}  ` +
      Object.entries(counts)
        .map(([k, v]) => `${k}=${v}`)
        .join("  ") +
      (noise ? `   ⚠ ${noise} item(s) did not produce a real verdict` : "")
  );
}

if (verifiedCount < dataset.length) {
  console.log(
    `\n⚠  ${dataset.length - verifiedCount}/${dataset.length} references are NOT yet human-verified ` +
      `(verified: false).\n   Scores are provisional until a native speaker signs off — see evals/README.md.`
  );
}

if (args.failures) {
  console.log("\nMisses");
  for (const run of runs) {
    console.log(`\n  ── ${run.model}`);
    for (const r of run.scored.filter((r) => r.points < 1)) {
      console.log(`   ${r.id.padEnd(12)} ${String(r.verdict).padEnd(10)} ${r.reason}`);
    }
  }
}

console.log("");

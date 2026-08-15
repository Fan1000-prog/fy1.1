#!/usr/bin/env node
/**
 * Structural check on the dataset. Run before committing dataset changes.
 *
 * Exists because an editor buffer once overwrote mg-core.jsonl with a stale
 * copy and `git add -A` committed the truncation without a murmur. Losing
 * native-speaker references is the most expensive failure this repo has —
 * they cannot be regenerated, only re-elicited from a person.
 *
 * Usage: npm run eval:validate
 */
import { loadDataset } from "./lib/dataset.mjs";

/** Ratchet: the dataset may grow, never silently shrink. */
const MIN_ITEMS = 54;
const MIN_VERIFIED = 15;

const REQUIRED = ["id", "category", "difficulty", "prompt", "reference", "notes"];
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const problems = [];
const items = loadDataset();

for (const [i, item] of items.entries()) {
  const where = `item ${i + 1} (${item.id ?? "no id"})`;
  for (const field of REQUIRED) {
    if (!item[field] || String(item[field]).trim() === "") {
      problems.push(`${where}: missing "${field}"`);
    }
  }
  if (item.difficulty && !DIFFICULTIES.has(item.difficulty)) {
    problems.push(`${where}: difficulty "${item.difficulty}" not one of easy|medium|hard`);
  }
  for (const field of ["must_not_contain", "must_contain_any"]) {
    if (item[field] !== undefined && !Array.isArray(item[field])) {
      problems.push(`${where}: "${field}" must be an array`);
    }
  }
  // A verified reference is a human's words; it must record whose.
  if (item.verified === true && !item.source) {
    problems.push(`${where}: verified:true requires a "source"`);
  }
}

const ids = items.map((i) => i.id);
for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) {
  problems.push(`duplicate id: ${id}`);
}

const verified = items.filter((i) => i.verified === true).length;
if (items.length < MIN_ITEMS) {
  problems.push(
    `dataset shrank: ${items.length} items, expected >= ${MIN_ITEMS}. ` +
      `If this is intentional, lower MIN_ITEMS in evals/validate.mjs deliberately.`
  );
}
if (verified < MIN_VERIFIED) {
  problems.push(
    `verified references dropped: ${verified}, expected >= ${MIN_VERIFIED}. ` +
      `Native-speaker references must never be lost.`
  );
}

const byCategory = items.reduce((acc, i) => {
  acc[i.category] = (acc[i.category] ?? 0) + 1;
  return acc;
}, {});

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `✓ ${items.length} items, ${Object.keys(byCategory).length} categories, ${verified} native-verified`
);
for (const [cat, n] of Object.entries(byCategory).sort()) {
  console.log(`   ${String(n).padStart(3)}  ${cat}`);
}

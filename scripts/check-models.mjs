#!/usr/bin/env node
/**
 * Verifies every model ID in src/lib/models.ts is still served by the Gemini API.
 *
 * Google retires model IDs silently — a retired ID returns 404 and blanks the
 * whole chat in production. Run this in CI and before every deploy.
 *
 * Usage: node scripts/check-models.mjs
 */
import { readFileSync } from "node:fs";

const HOST = "https://generativelanguage.googleapis.com/v1beta";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
      }
    } catch {
      /* file absent — fall through to real env */
    }
  }
}

/** Reads the defaults straight out of models.ts so the two can't drift. */
function declaredModels() {
  const src = readFileSync("src/lib/models.ts", "utf8");
  const ids = new Set();
  for (const [, value] of src.matchAll(/env\(\s*"[A-Z0-9_]+"\s*,\s*"([^"]+)"\s*\)/g)) {
    for (const id of value.split(",")) ids.add(id.trim());
  }
  return [...ids].filter(Boolean);
}

loadEnv();
const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.VERTEX_API_KEY?.trim();
if (!apiKey) {
  console.error("GEMINI_API_KEY not set (also checked VERTEX_API_KEY)");
  process.exit(2);
}

const res = await fetch(`${HOST}/models?pageSize=200&key=${apiKey}`);
if (!res.ok) {
  console.error(`ListModels failed: ${res.status} ${await res.text()}`);
  process.exit(2);
}
const served = new Set(
  (await res.json()).models.map((m) => m.name.replace(/^models\//, ""))
);

let failed = false;
for (const id of declaredModels()) {
  // Listed but retired-for-new-users models still 404 on use, so probe for real.
  const probe = await fetch(`${HOST}/models/${id}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "hi" }] }] }),
  });
  const usable = probe.ok || probe.status === 429; // 429 = quota, model is fine
  if (!usable) failed = true;
  const note = probe.ok ? "ok" : probe.status === 429 ? "ok (quota)" : `DEAD ${probe.status}`;
  console.log(`${usable ? "✓" : "✗"} ${id.padEnd(28)} ${note}${served.has(id) ? "" : " [not listed]"}`);
}

process.exit(failed ? 1 : 0);

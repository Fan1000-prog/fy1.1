import { readFileSync } from "node:fs";

const HOST = "https://generativelanguage.googleapis.com/v1beta/models";

/** Free-tier quota is small (tens of requests/day/model) — retry, don't hammer. */
const RETRY_STATUSES = new Set([429, 503]);
const MAX_ATTEMPTS = 5;

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      for (const line of readFileSync(file, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
      }
    } catch {
      /* not present */
    }
  }
  if (!process.env.VERTEX_API_KEY) {
    console.error("VERTEX_API_KEY not set (checked env, .env.local, .env)");
    process.exit(2);
  }
  return process.env.VERTEX_API_KEY;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Single-turn generation with backoff.
 *
 * Returns `{ text }` on success or `{ error }` on give-up — never throws, so one
 * bad item can't abandon a run that costs real quota to reproduce.
 */
export async function generate({
  apiKey,
  model,
  prompt,
  system,
  temperature = 0,
  maxAttempts = MAX_ATTEMPTS,
}) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };
  if (system) body.system_instruction = { parts: [{ text: system }] };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(`${HOST}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      if (attempt === maxAttempts) return { error: `network: ${e.message}` };
      await sleep(2000 * attempt);
      continue;
    }

    if (res.ok) {
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const text = parts
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      return text ? { text } : { error: "empty_response" };
    }

    const detail = await res.text();
    if (!RETRY_STATUSES.has(res.status) || attempt === maxAttempts) {
      return { error: `http_${res.status}: ${detail.slice(0, 160)}` };
    }
    // Honour the server's own backoff hint when it gives one.
    const hinted = Number(detail.match(/retry in ([\d.]+)s/i)?.[1]);
    await sleep(Math.min(60_000, (hinted ? hinted * 1000 : 0) + 2000 * attempt));
  }
  return { error: "exhausted_retries" };
}

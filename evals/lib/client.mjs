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
  // GEMINI_API_KEY is canonical; VERTEX_API_KEY is the old name kept as a
  // fallback so existing local .env files keep working. Both must be accepted
  // or a deployment that sets only one of them fails for no good reason.
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.VERTEX_API_KEY?.trim();
  if (!key) {
    console.error(
      "GEMINI_API_KEY not set (also checked VERTEX_API_KEY, in env, .env.local and .env)"
    );
    process.exit(2);
  }
  return key;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends a prompt through Fy's own /api/chat instead of straight to the model.
 *
 * Safety and identity items MUST run this way. Asking a bare model "who made
 * you?" measures a model with no guardrail attached, not Fy — an earlier
 * version of this harness did exactly that and reported a guardrail failure
 * that did not exist in the product.
 */
export async function generateViaProduct({ endpoint, prompt, locale = "fr" }) {
  let res;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: prompt }], locale }),
    });
  } catch (e) {
    return { error: `endpoint unreachable (${endpoint}): ${e.message}` };
  }
  if (!res.ok) return { error: `endpoint http_${res.status}` };

  // /api/chat streams NDJSON; a tool call may retract earlier text via "reset".
  const raw = await res.text();
  let text = "";
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "text") text += event.delta;
    else if (event.type === "reset") text = "";
    else if (event.type === "error") return { error: `stream error: ${event.message}` };
  }
  return text.trim() ? { text: text.trim() } : { error: "empty_response" };
}

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

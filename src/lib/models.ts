/**
 * Single source of truth for which Gemini models Fy runs on.
 *
 * Google retires model IDs without warning — `gemini-2.5-*` and `imagen-3/4-*`
 * now 404 for new callers, which is what took the deployed chat down. Keep every
 * model ID here, override per-environment, and verify with `npm run models:check`.
 */

function env(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

/** Conversation + tool orchestration. Best Malagasy fluency of the flash tier. */
export const CHAT_MODEL = env("GEMINI_CHAT_MODEL", "gemini-3.7-flash");

/** Cheap mechanical work: transcription, prompt translation. */
export const FAST_MODEL = env("GEMINI_FAST_MODEL", "gemini-3.1-flash-lite");

/** Image generation. Uses generateContent + IMAGE modality, not the old predict API. */
export const IMAGE_MODEL = env("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image");

/**
 * Tried in order when the primary model is unavailable (404 retired / 429 quota /
 * 503 overloaded). Prevents a single retirement or quota spike from blanking chat.
 */
export const CHAT_FALLBACKS = env(
  "GEMINI_CHAT_FALLBACKS",
  "gemini-3.6-flash,gemini-3.5-flash,gemini-3.1-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

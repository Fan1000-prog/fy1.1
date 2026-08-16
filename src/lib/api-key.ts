/**
 * Resolves the Gemini API key.
 *
 * The key targets the **Gemini Developer API** (generativelanguage.googleapis.com),
 * not Vertex AI — different product, different quota, different billing line.
 * The old name VERTEX_API_KEY said otherwise and cost real debugging time, so
 * GEMINI_API_KEY is canonical and the old name is still read as a fallback
 * until every deployment has been updated.
 */
export function geminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY?.trim() || process.env.VERTEX_API_KEY?.trim();
}

export function requireGeminiApiKey(): string {
  const key = geminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  return key;
}

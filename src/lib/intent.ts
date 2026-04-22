export type ToolIntent = "web" | "youtube" | "image" | "chat";

const YOUTUBE_PATTERNS = [
  /youtube\.com\/watch/i,
  /youtu\.be\//i,
  /\b(résume?|resume|summarize|analyse[rz]?|rekap)\b.{0,40}\b(vidéo|video)\b/i,
  /\b(cette?|this|ity)\b.{0,15}\b(vidéo|video)\b/i,
  /\bhoronantsary\b/i,
];

const IMAGE_PATTERNS = [
  /\b(génère?|generate|crée?|create|draw|dessine|sary\s+(?:iray|ny|ho))\b.{0,25}\b(image|sary|photo|picture|illustration|visuel)\b/i,
  /\bgenerate\s+(an?\s+)?image\b/i,
  /\b(make|create)\s+(an?\s+)?image\b/i,
  /\bimage\s+(de|of|du|d'une?)\b/i,
];

const WEB_PATTERNS = [
  /^(search|recherche[rz]?|cherche[rz]?|find|trouve[rz]?)\b/i,
  /\b(latest|récent[e]?s?|nouveau[x]?|nouvell[e]s?|vaovao)\b.{0,30}\b(news|actualités?|nouvelles?|infos?)\b/i,
  /\b(actualités?|news|vaovao)\b.{0,20}\b(de|du|sur|about|ici|today)\b/i,
  /\b(search\s+for|look\s+up|find\s+(me\s+)?info|recherche\s+sur|trouve\s+(moi\s+)?)\b/i,
  /\bqu'est-ce\s+qui\s+se\s+passe\b/i,
  /\bwhat('s|\s+is)\s+(happening|the\s+latest)\b/i,
];

export function detectIntent(message: string): ToolIntent {
  if (YOUTUBE_PATTERNS.some((p) => p.test(message))) return "youtube";
  if (IMAGE_PATTERNS.some((p) => p.test(message))) return "image";
  if (WEB_PATTERNS.some((p) => p.test(message))) return "web";
  return "chat";
}

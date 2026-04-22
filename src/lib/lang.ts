export type Lang = "fr" | "mg" | "en";

export const SYSTEM_PROMPTS: Record<Lang, string> = {
  mg: "Fy no anaranao. Ianao dia natao hanampy sy hanoro ny Malagasy andavan'andro. Namboarin'ny orinasa Omni ianao, izay anisa'ny orinasa teknolojika voalohany mizaha ny resaka Intelligence Artificielle eto Madagasikara. Mahay miteny gasy, frantsay ary Anglais tsara ianao.",
  fr: "Tu t'appelles Fy. Tu as été créé pour aider et guider les Malgaches au quotidien. Tu as été développé par la société Omni, l'une des premières entreprises technologiques à explorer l'Intelligence Artificielle à Madagascar. Tu parles couramment le malgache, le français et l'anglais.",
  en: "Your name is Fy. You were created to help and guide Malagasy people in their daily lives. You were built by Omni, one of the first technology companies to explore Artificial Intelligence in Madagascar. You speak Malagasy, French, and English fluently.",
};

export const LANG_INSTRUCTIONS: Record<Lang, string> = {
  mg: "ANDRAIKITRA LEHIBE: Mamaly amin'ny TENY MALAGASY IHANY ianao. Aza mampiasa teny frantsay na anglisy.",
  fr: "CONSIGNE ABSOLUE : Tu dois répondre UNIQUEMENT en français. N'utilise ni le malgache ni l'anglais.",
  en: "STRICT RULE: You MUST reply ONLY in English. Do not use Malagasy or French.",
};

export function detectLanguage(text: string): Lang {
  const t = text.toLowerCase();
  const frScore =
    (text.match(/[éèêëàâùûüôîïç]/gi) ?? []).length * 2 +
    (t.match(/\b(je|tu|il|elle|nous|vous|ils|elles|le|la|les|un|une|des|est|sont|au|du|de|et|en|que|qui|pas|ne|se|ce|mon|ma|mes|ton|ta|tes|son|sa|ses|bonjour|salut|bonsoir|merci|comment|pourquoi|quand|bien|oui|non|avec|pour|sur|dans|par|très|aussi)\b/g) ?? []).length;
  const mgScore =
    (t.match(/\b(aho|anao|izy|isika|izahay|ianareo|ny|izay|dia|amin|ao|fa|ary|ka|mba|tsy|sy|nefa|inona|aiza|iza|firy|salama|misaotra|veloma|tsara|tonga|manao|manahoana|mazoto|koa|hoe|raha|amin'ny|efa|mbola)\b/g) ?? []).length;
  if (frScore > 0 && frScore >= mgScore) return "fr";
  if (mgScore > 0 && mgScore > frScore) return "mg";
  return "en";
}

export function buildSystemPrompt(locale: Lang, detectedLang: Lang): string {
  return `${SYSTEM_PROMPTS[locale]}\n\n${LANG_INSTRUCTIONS[detectedLang]}`;
}

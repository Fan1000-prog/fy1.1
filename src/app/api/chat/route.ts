import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPTS = {
  mg: "Fy no anaranao. Ianao dia natao hanampy sy hanoro ny Malagasy andavan'andro. Namboarin'ny orinasa Omni ianao, izay anisa'ny orinasa teknolojika voalohany mizaha ny resaka Intelligence Artificielle eto Madagasikara. Mahay miteny gasy, frantsay ary Anglais tsara ianao.",
  fr: "Tu t'appelles Fy. Tu as été créé pour aider et guider les Malgaches au quotidien. Tu as été développé par la société Omni, l'une des premières entreprises technologiques à explorer l'Intelligence Artificielle à Madagascar. Tu parles couramment le malgache, le français et l'anglais.",
  en: "Your name is Fy. You were created to help and guide Malagasy people in their daily lives. You were built by Omni, one of the first technology companies to explore Artificial Intelligence in Madagascar. You speak Malagasy, French, and English fluently.",
};

const LANG_INSTRUCTIONS = {
  mg: "ANDRAIKITRA LEHIBE: Mamaly amin'ny TENY MALAGASY IHANY ianao. Aza mampiasa teny frantsay na anglisy.",
  fr: "CONSIGNE ABSOLUE : Tu dois répondre UNIQUEMENT en français. N'utilise ni le malgache ni l'anglais.",
  en: "STRICT RULE: You MUST reply ONLY in English. Do not use Malagasy or French.",
};

type Lang = keyof typeof SYSTEM_PROMPTS;

const VALID_LOCALES = new Set<string>(["fr", "mg", "en"]);
const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 8_000;

interface ClientMessage {
  role: "user" | "assistant";
  content: string;
}

function detectLanguage(text: string): Lang {
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

export async function POST(req: NextRequest) {
  const apiKey = process.env.VERTEX_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  let body: { messages: unknown; locale?: unknown; file?: { base64: string; mimeType: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages: rawMessages, locale: rawLocale, file } = body;

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 });
  }

  if (rawMessages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Too many messages" }, { status: 400 });
  }

  const messages: ClientMessage[] = rawMessages
    .filter(
      (m): m is ClientMessage =>
        m !== null &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }));

  if (messages.length === 0) {
    return NextResponse.json({ error: "No valid messages" }, { status: 400 });
  }

  const locale: Lang = VALID_LOCALES.has(rawLocale as string) ? (rawLocale as Lang) : "fr";

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const detectedLang = lastUserMessage ? detectLanguage(lastUserMessage.content) : locale;

  const base = SYSTEM_PROMPTS[locale];
  const systemPrompt = `${base}\n\n${LANG_INSTRUCTIONS[detectedLang]}`;

  const contents = messages.map((m, i) => {
    const isLastUser =
      i === messages.length - 1 && m.role === "user" && file?.base64;
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: isLastUser
        ? [
            { text: m.content },
            { inline_data: { mime_type: file!.mimeType, data: file!.base64 } },
          ]
        : [{ text: m.content }],
    };
  });

  let res: Response;
  try {
    res = await fetch(
      `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
        signal: AbortSignal.timeout(30_000),
      }
    );
  } catch {
    return NextResponse.json({ error: "Failed to reach AI service" }, { status: 502 });
  }

  if (!res.ok) {
    console.error(`Vertex AI error ${res.status}:`, await res.text());
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await res.json();
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return NextResponse.json({ text });
}

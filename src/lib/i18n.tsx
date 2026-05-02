"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Locale = "fr" | "mg" | "en";

export const translations = {
  fr: {
    // Nav
    nav_features: "Fonctionnalités",
    nav_about: "À propos",
    nav_login: "Se connecter",
    nav_start: "Commencer",
    // Hero
    hero_badge: "Intelligence artificielle Malagasy",
    hero_title_1: "Votre assistant IA,",
    hero_title_2: "conçu pour vous.",
    hero_subtitle:
      "fy comprend votre contexte, parle votre langue et vous aide à accomplir plus — recherche web, vidéos, textes, voix et images.",
    hero_cta: "Commencer gratuitement",
    hero_cta_sub: "Aucune carte requise",
    // Features
    features_title: "Tout ce dont vous avez besoin",
    features_subtitle: "Des outils puissants, une interface simple.",
    feat_web_title: "Recherche Web",
    feat_web_desc: "Naviguez et extrayez des informations du web en temps réel.",
    feat_youtube_title: "Analyse Vidéo",
    feat_youtube_desc: "Regardez et résumez des vidéos YouTube instantanément.",
    feat_text_title: "Génération de texte",
    feat_text_desc: "Rédigez, traduisez et améliorez vos textes avec l'IA.",
    feat_voice_title: "Synthèse vocale",
    feat_voice_desc: "Donnez une voix à vos contenus en plusieurs langues.",
    feat_image_title: "Génération d'images",
    feat_image_desc: "Créez des visuels uniques depuis une simple description.",
    feat_multilang_title: "Multilingue",
    feat_multilang_desc: "Interface en français, malgache ou anglais selon vous.",
    // CTA section
    cta_title: "Prêt à commencer ?",
    cta_subtitle: "Rejoignez la communauté fy et explorez l'IA sans limites.",
    cta_button: "Créer un compte",
    // Partners
    partners_eyebrow: "Propulsé par les meilleurs.",
    partners_title: "Construit avec des outils de confiance.",
    // Footer
    footer_tagline: "Fait par des Malagasy, pour les Malagasy.",
    footer_rights: "Tous droits réservés.",
    // Login
    login_title: "Bienvenue sur fy",
    login_subtitle: "Connectez-vous pour commencer",
    login_name: "Votre prénom",
    login_name_placeholder: "Ex : Rakoto",
    login_btn: "Continuer",
    login_email: "Adresse e-mail",
    login_password: "Mot de passe",
    login_forgot: "Mot de passe oublié ?",
    login_no_account: "Pas encore de compte ?",
    login_signup: "S'inscrire",
    login_or: "ou continuer avec",
    login_google: "Continuer avec Google",
    login_guest: "Continuer en invité",
    menu_upgrade: "Lier mon compte Google",
    menu_logout: "Déconnexion",
    menu_guest_label: "Invité",
    auth_link_success: "Compte Google lié avec succès.",
    auth_collision_title: "Compte Google déjà utilisé",
    auth_collision_body: "Ce compte Google possède déjà des données ici. Continuer signera votre déconnexion en tant qu'invité et fera perdre votre session actuelle.",
    auth_collision_confirm: "Continuer",
    auth_collision_cancel: "Annuler",
    auth_error_generic: "Une erreur est survenue. Veuillez réessayer.",
    // Chat
    chat_placeholder: "Écrivez votre message…",
    chat_new: "Nouvelle conversation",
    chat_history: "Historique",
    chat_tools: "Outils",
    chat_tool_web: "Web",
    chat_tool_youtube: "YouTube",
    chat_tool_image: "Image",
    chat_tool_voice: "Voix",
    chat_welcome_title: "Bonjour, je suis fy.",
    chat_welcome_sub: "Comment puis-je vous aider aujourd'hui ?",
    chat_send: "Envoyer",
    chat_today: "Aujourd'hui",
    chat_yesterday: "Hier",
    lang_label: "Langue",
    theme_label: "Thème",
    chat_searching: "Recherche en cours…",
    chat_analyzing_video: "Analyse de la vidéo…",
    chat_generating_image: "Génération d'image…",
    chat_transcribing: "Transcription…",
    chat_sources: "Sources",
    chat_download: "Télécharger",
    chat_mic_denied: "Accès au microphone refusé",
    chat_file_too_large: "Fichier trop volumineux (max 20 MB)",
    chat_file_invalid_type: "Format non supporté (PDF, JPEG, PNG uniquement)",
    chat_no_transcript: "Aucun sous-titre disponible pour cette vidéo",
    chat_attach_file: "Joindre un fichier",
    chat_remove_file: "Retirer le fichier",
    login_error: "Échec de la connexion. Veuillez réessayer.",
  },
  mg: {
    // Nav
    nav_features: "Fitaovana",
    nav_about: "Mombamomba",
    nav_login: "Hiditra",
    nav_start: "Hanomboka",
    // Hero
    hero_badge: "Intelligence Artificielle Malagasy",
    hero_title_1: "Ilay namana",
    hero_title_2: "natao ho anao.",
    hero_subtitle:
      "Lazao an'i fy izay ilainao, Afaka manampy anao amin'ny resaka fikarohana web, horonantsary na lahatsoratra, ary mahazo feo sy mamorona sary ihany koa izy.",
    hero_cta: "Manomboa maimaimpoana",
    hero_cta_sub: "Tsy mila abonnement",
    // Features
    features_title: "Izay rehetra ilainao",
    features_subtitle: "Fitaovana mahery vaika, interface tsotra.",
    feat_web_title: "Fikarohana Web",
    feat_web_desc: "Mikaroha ary manangòna informations avy amin'ny sources maro isan-karazany amin'ny alalan'ny web scrapping intégré an'i fy.",
    feat_youtube_title: "Fanadihadiana Video",
    feat_youtube_desc: "Jereo, adiadio ary mamoròna santionany avy amin'ny video YouTube.",
    feat_text_title: "Famoronana lahatsoratra",
    feat_text_desc: "Manoràta sy mandikà lahatsoratra maro isan-karazany.",
    feat_voice_title: "Mampiasà feo",
    feat_voice_desc: "Hiresao amin'ny alalan'ny feo i fy, tsy voatery hanoratra.",
    feat_image_title: "Famoronana sary",
    feat_image_desc: "Mamorona sary tokana avy amin'ny famaritana tsotra.",
    feat_multilang_title: "Fiteny maromaro",
    feat_multilang_desc: "Interface amin'ny teny frantsay, malagasy na anglisy. Safidio izay mampetipety anao",
    // CTA section
    cta_title: "Vonona hanomboka?",
    cta_subtitle: "Midira ao anatin'ny fiarahamonina fy ary manomboa mampiasa IA tsy misy fetra.",
    cta_button: "Mamorona kaonty",
    // Partners
    partners_eyebrow: "Atosiky ny tsara indrindra.",
    partners_title: "Naorina amin'ny fitaovana azo itokisana.",
    // Footer
    footer_tagline: "Vita Malagasy ho an'ny Malagasy.",
    footer_rights: "Zo rehetra voatokana.",
    // Login
    login_title: "Tonga soa eto fy",
    login_subtitle: "Midira mba hanomboka",
    login_name: "Ny anaranao",
    login_name_placeholder: "Ohatra: Rakoto",
    login_btn: "Hiitohy",
    login_email: "Adiresy mailaka",
    login_password: "Teny miafina",
    login_forgot: "Adino ny teny miafina?",
    login_no_account: "Tsy manana kaonty?",
    login_signup: "Misoràta anarana",
    login_or: "na avereno amin'ny",
    login_google: "Hiditra amin'ny Google",
    login_guest: "Hiditra amin'ny mahavahiny",
    menu_upgrade: "Ampifandraiso amin'i Google",
    menu_logout: "Mivoaka",
    menu_guest_label: "Mpitsidika",
    auth_link_success: "Voarohy ny kaonty Google.",
    auth_collision_title: "Efa misy ny kaonty Google",
    auth_collision_body: "Manana data eto ity kaonty Google ity. Raha mitohy ianao dia ho very ny session vahiny ankehitriny.",
    auth_collision_confirm: "Hitohy",
    auth_collision_cancel: "Aoka",
    auth_error_generic: "Nisy olana. Andramo indray.",
    // Chat
    chat_placeholder: "Soraty eto ny hafatrao…",
    chat_new: "Manomboa resaka vaovao",
    chat_history: "Resaka nisy teo aloha",
    chat_tools: "Fitaovana",
    chat_tool_web: "Web",
    chat_tool_youtube: "YouTube",
    chat_tool_image: "Sary",
    chat_tool_voice: "Feo",
    chat_welcome_title: "Manao ahoana, izaho dia fy.",
    chat_welcome_sub: "Inona no afaka hanampiako anao androany?",
    chat_send: "Alefa",
    chat_today: "Anio",
    chat_yesterday: "Omaly",
    lang_label: "Fiteny",
    theme_label: "Loko",
    chat_searching: "Fikarohana…",
    chat_analyzing_video: "Fanadihadiana video…",
    chat_generating_image: "Famoronana sary…",
    chat_transcribing: "Fandikana feo…",
    chat_sources: "Loharano",
    chat_download: "Hisintona",
    chat_mic_denied: "Tsy azo ny mikrofona",
    chat_file_too_large: "Rakitra lehibe loatra (max 20 MB)",
    chat_file_invalid_type: "Karazany tsy ekena (PDF, JPEG, PNG)",
    chat_no_transcript: "Tsy misy dikanteny ity video ity",
    chat_attach_file: "Mampiditra rakitra",
    chat_remove_file: "Nesorina ny rakitra",
    login_error: "Tsy nahomby ny fidirana. Andramo indray.",
  },
  en: {
    // Nav
    nav_features: "Features",
    nav_about: "About",
    nav_login: "Sign in",
    nav_start: "Get started",
    // Hero
    hero_badge: "Malagasy artificial intelligence",
    hero_title_1: "Your AI assistant,",
    hero_title_2: "built for you.",
    hero_subtitle:
      "fy understands your context, speaks your language, and helps you do more — web search, videos, text, voice and images.",
    hero_cta: "Start for free",
    hero_cta_sub: "No card required",
    // Features
    features_title: "Everything you need",
    features_subtitle: "Powerful tools, simple interface.",
    feat_web_title: "Web Search",
    feat_web_desc: "Browse and extract real-time information from the web.",
    feat_youtube_title: "Video Analysis",
    feat_youtube_desc: "Watch and summarize YouTube videos instantly.",
    feat_text_title: "Text Generation",
    feat_text_desc: "Write, translate, and improve your content with AI.",
    feat_voice_title: "Voice Synthesis",
    feat_voice_desc: "Give a voice to your content in multiple languages.",
    feat_image_title: "Image Generation",
    feat_image_desc: "Create unique visuals from a simple description.",
    feat_multilang_title: "Multilingual",
    feat_multilang_desc: "Interface in French, Malagasy or English as you prefer.",
    // CTA section
    cta_title: "Ready to start?",
    cta_subtitle: "Join the fy community and explore AI without limits.",
    cta_button: "Create account",
    // Partners
    partners_eyebrow: "Powered by the best.",
    partners_title: "Built with trusted tools.",
    // Footer
    footer_tagline: "Made by Malagasy, for Malagasy.",
    footer_rights: "All rights reserved.",
    // Login
    login_title: "Welcome to fy",
    login_subtitle: "Sign in to get started",
    login_name: "Your name",
    login_name_placeholder: "E.g. Rakoto",
    login_btn: "Continue",
    login_email: "Email address",
    login_password: "Password",
    login_forgot: "Forgot password?",
    login_no_account: "Don't have an account?",
    login_signup: "Sign up",
    login_or: "or continue with",
    login_google: "Continue with Google",
    login_guest: "Continue as guest",
    menu_upgrade: "Link Google account",
    menu_logout: "Log out",
    menu_guest_label: "Guest",
    auth_link_success: "Google account linked.",
    auth_collision_title: "Google account already in use",
    auth_collision_body: "This Google account already has data here. Continuing will sign you out as a guest and discard your current session.",
    auth_collision_confirm: "Continue",
    auth_collision_cancel: "Cancel",
    auth_error_generic: "Something went wrong. Please try again.",
    // Chat
    chat_placeholder: "Write your message…",
    chat_new: "New conversation",
    chat_history: "History",
    chat_tools: "Tools",
    chat_tool_web: "Web",
    chat_tool_youtube: "YouTube",
    chat_tool_image: "Image",
    chat_tool_voice: "Voice",
    chat_welcome_title: "Hello, I'm fy.",
    chat_welcome_sub: "How can I help you today?",
    chat_send: "Send",
    chat_today: "Today",
    chat_yesterday: "Yesterday",
    lang_label: "Language",
    theme_label: "Theme",
    chat_searching: "Searching…",
    chat_analyzing_video: "Analysing video…",
    chat_generating_image: "Generating image…",
    chat_transcribing: "Transcribing…",
    chat_sources: "Sources",
    chat_download: "Download",
    chat_mic_denied: "Microphone access denied",
    chat_file_too_large: "File too large (max 20 MB)",
    chat_file_invalid_type: "Unsupported format (PDF, JPEG, PNG only)",
    chat_no_transcript: "No transcript available for this video",
    chat_attach_file: "Attach a file",
    chat_remove_file: "Remove file",
    login_error: "Login failed. Please try again.",
  },
};

type TranslationKey = keyof typeof translations.fr;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  setLocale: () => { },
  t: (k) => k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const saved = localStorage.getItem("fy-locale") as Locale | null;
    if (saved && ["fr", "mg", "en"].includes(saved)) setLocaleState(saved);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("fy-locale", l);
  };

  const t = (key: TranslationKey): string =>
    translations[locale][key] ?? translations.fr[key] ?? key;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LogoCloud } from "@/components/ui/logo-cloud";
import UniqueLoading from "@/components/ui/morph-loading";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";
import {
  Globe,
  PlayCircle,
  FileText,
  Mic,
  Image as ImageIcon,
  Languages,
  ArrowRight,
} from "lucide-react";
import { Reveal, RevealWords } from "@/components/reveal";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { t } = useI18n();

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    { icon: Globe, key: "feat_web", gradient: "from-emerald-500/30 via-teal-400/20 to-brand/30" },
    { icon: PlayCircle, key: "feat_youtube", gradient: "from-rose-500/30 via-orange-400/20 to-amber-300/30" },
    { icon: FileText, key: "feat_text", gradient: "from-violet-500/30 via-fuchsia-400/20 to-pink-400/30" },
    { icon: Mic, key: "feat_voice", gradient: "from-sky-500/30 via-cyan-400/20 to-indigo-400/30" },
    { icon: ImageIcon, key: "feat_image", gradient: "from-pink-500/30 via-rose-400/20 to-purple-400/30" },
    { icon: Languages, key: "feat_multilang", gradient: "from-amber-500/30 via-yellow-400/20 to-lime-400/30" },
  ] as const;

  return (
    <div className="flex min-h-full flex-col fy-hero-gradient">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <FyLogo />
          <nav className="hidden items-center gap-6 md:flex">
            <a 
              href="#features" 
              onClick={(e) => scrollToSection(e, '#features')}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav_features")}
            </a>
            <a 
              href="#about" 
              onClick={(e) => scrollToSection(e, '#about')}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav_about")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden text-sm md:inline-flex">
                {t("nav_login")}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-medium">
                {t("nav_start")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-28 text-center md:pt-36">
          <Reveal>
            <UniqueLoading variant="morph" size="md" className="mb-8" />
          </Reveal>

          <h1 className="mb-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
            <RevealWords as="span" text={t("hero_title_1")} className="block" />
            <RevealWords
              as="span"
              text={t("hero_title_2")}
              className="block bg-gradient-to-r from-brand via-emerald-500 to-brand bg-clip-text text-transparent"
            />
          </h1>

          <Reveal delay={200}>
            <p className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {t("hero_subtitle")}
            </p>
          </Reveal>

          <Reveal delay={350}>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/login">
                <Button
                  size="lg"
                  className="gap-2 rounded-full bg-brand px-8 text-brand-foreground hover:bg-brand/90"
                >
                  {t("hero_cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">{t("hero_cta_sub")}</p>
            </div>
          </Reveal>

          {/* Hero visual */}
          <Reveal delay={500} className="relative mt-20 w-full max-w-3xl">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-brand/10 to-transparent blur-2xl" />
            <ChatPreview />
          </Reveal>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <RevealWords
              as="h2"
              text={t("features_title")}
              className="mb-3 block text-3xl font-semibold tracking-tight md:text-4xl"
            />
            <Reveal delay={150}>
              <p className="text-muted-foreground">{t("features_subtitle")}</p>
            </Reveal>
          </div>

          <div className="flex flex-wrap items-start justify-center gap-10">
            {features.map(({ icon: Icon, key, gradient }, i) => (
              <Reveal key={key} delay={i * 80}>
                <FeatureCard
                  icon={Icon}
                  title={t(`${key}_title` as Parameters<typeof t>[0])}
                  desc={t(`${key}_desc` as Parameters<typeof t>[0])}
                  gradient={gradient}
                />
              </Reveal>
            ))}
          </div>
        </section>

        {/* Partners logo cloud */}
        <section id="about" className="relative border-y border-border/50 bg-muted/30 py-16 overflow-hidden">
          <div
            aria-hidden="true"
            className={cn(
              "-z-10 -top-1/2 -translate-x-1/2 pointer-events-none absolute left-1/2 h-[80vmin] w-[120vmin] rounded-b-full",
              "bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.10),transparent_60%)]",
              "blur-[40px]"
            )}
          />
          <div className="relative mx-auto max-w-5xl px-6">
            <h2 className="mb-2 text-center font-medium text-foreground text-xl tracking-tight md:text-3xl">
              <span className="text-muted-foreground">{t("partners_eyebrow")}</span>
              <br />
              <span className="font-semibold">{t("partners_title")}</span>
            </h2>
            <div className="mx-auto my-6 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
            <LogoCloud logos={partners} />
            <div className="mx-auto mt-6 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 py-28 text-center">
          <RevealWords
            as="h2"
            text={t("cta_title")}
            className="mb-4 block text-3xl font-semibold tracking-tight md:text-4xl"
          />
          <Reveal delay={150}>
            <p className="mb-8 text-muted-foreground">{t("cta_subtitle")}</p>
          </Reveal>
          <Reveal delay={300}>
            <Link href="/login">
              <Button
                size="lg"
                className="gap-2 rounded-full bg-brand px-10 text-brand-foreground hover:bg-brand/90"
              >
                {t("cta_button")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <FyLogo small />
          <p>{t("footer_tagline")}</p>
          <p>© {new Date().getFullYear()} fy. {t("footer_rights")}</p>
        </div>
      </footer>
    </div>
  );
}

export function FyLogo({ small }: { small?: boolean }) {
  const size = small ? 28 : 36;
  return (
    <Link href="/" className="flex items-center" aria-label="fy.">
      <Image
        src="/fy-logo.png"
        alt="fy."
        width={size * 2}
        height={size * 2}
        priority
        className={cn(
          "w-auto dark:brightness-0 dark:invert",
          small ? "h-10 sm:h-14" : "h-12 sm:h-14 md:h-[4.5rem]",
        )}
      />
    </Link>
  );
}

const partners: { src: string; alt: string }[] = [
  { src: "https://svgl.app/library/firebase.svg", alt: "Firebase" },
  { src: "https://svgl.app/library/openai_wordmark_light.svg", alt: "OpenAI" },
  { src: "https://svgl.app/library/claude-ai-wordmark-icon_light.svg", alt: "Claude" },
  { src: "https://svgl.app/library/gemini.svg", alt: "Gemini" },
  { src: "https://svgl.app/library/vercel_wordmark.svg", alt: "Vercel" },
  { src: "https://svgl.app/library/nextjs_logo_dark.svg", alt: "Next.js" },
  { src: "https://svgl.app/library/github_wordmark_light.svg", alt: "GitHub" },
  { src: "https://svgl.app/library/tailwindcss.svg", alt: "Tailwind CSS" },
  { src: "https://svgl.app/library/typescript.svg", alt: "TypeScript" },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  gradient,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  gradient: string;
}) {
  return (
    <div className="group max-w-80 transition duration-300 hover:-translate-y-1">
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-gradient-to-br",
          gradient
        )}
      >
        <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(0,0,0,0.06)_1px,transparent_0)] [background-size:18px_18px]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-20 w-20 text-foreground/70 transition-transform duration-500 group-hover:scale-110" strokeWidth={1.25} />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/40 to-transparent" />
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
        <span className="ml-2 text-xs text-muted-foreground">fy — assistant</span>
      </div>
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xs font-semibold text-brand">
            Fy
          </div>
          <div className="chat-bubble-ai max-w-xs px-4 py-3 text-sm">
            Bonjour ! Je suis fy, votre assistant IA. Comment puis-je vous aider ?
          </div>
        </div>
        <div className="flex items-start justify-end gap-3">
          <div className="chat-bubble-user max-w-xs px-4 py-3 text-sm">
            Cherche les dernières nouvelles sur Madagascar
          </div>
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-medium">
            V
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-xs font-semibold text-brand">
            Fy
          </div>
          <div className="chat-bubble-ai flex items-center gap-1.5 px-4 py-3">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

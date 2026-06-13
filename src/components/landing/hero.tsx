"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Reveal, RevealWords } from "@/components/reveal";
import UniqueLoading from "@/components/ui/morph-loading";
import { Parallax } from "@/components/motion/parallax";
import { MagneticButton } from "@/components/motion/magnetic-button";

export function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden">
      {/* Full-bleed background image + grading */}
      <div className="absolute inset-0 -z-10">
        <Parallax distance={60} className="h-[120%] w-full">
          <div className="fy-img-tint relative h-full w-full">
            <Image
              src="/madagascar/hero-street.webp"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
        <div className="fy-grain" />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-28 text-center md:pt-36">
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
            <MagneticButton>
              <Link href="/login">
                <Button
                  size="lg"
                  className="gap-2 rounded-full bg-brand px-8 text-brand-foreground hover:bg-brand/90"
                >
                  {t("hero_cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </MagneticButton>
            <p className="text-xs text-muted-foreground">{t("hero_cta_sub")}</p>
          </div>
        </Reveal>

        <Reveal delay={500} className="relative mt-20 w-full max-w-3xl">
          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-brand/10 to-transparent blur-2xl" />
          <ChatPreview />
        </Reveal>
      </div>
    </section>
  );
}

function ChatPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-2xl backdrop-blur-md">
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

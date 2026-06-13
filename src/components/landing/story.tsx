"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealWords } from "@/components/reveal";
import { Parallax } from "@/components/motion/parallax";

export function Story() {
  const { t } = useI18n();
  return (
    <section className="relative isolate overflow-hidden py-32 md:py-44">
      <div className="absolute inset-0 -z-10">
        <Parallax distance={80} className="h-[130%] w-full">
          <div className="fy-img-tint relative h-full w-full">
            <Image
              src="/madagascar/highlands-people.webp"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/20" />
      </div>

      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <span className="text-sm font-medium uppercase tracking-widest text-brand">
            {t("story_eyebrow")}
          </span>
        </Reveal>
        <RevealWords
          as="h2"
          text={t("story_title")}
          className="mt-4 block text-3xl font-semibold tracking-tight md:text-5xl"
        />
        <Reveal delay={200}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            {t("story_body")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

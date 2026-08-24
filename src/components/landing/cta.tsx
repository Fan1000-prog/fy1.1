"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Reveal, RevealWords } from "@/components/reveal";
import { LogoCloud } from "@/components/ui/logo-cloud";
import { Parallax } from "@/components/motion/parallax";
import { MagneticButton } from "@/components/motion/magnetic-button";
import { cn } from "@/lib/utils";
import { FyLogo } from "./fy-logo";

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

export function PartnersAndCta() {
  const { t } = useI18n();
  return (
    <>
      {/* Partners */}
      <section id="about" className="relative overflow-hidden border-y border-border/50 bg-muted/30 py-16">
        <div
          aria-hidden="true"
          className={cn(
            "-z-10 -top-1/2 -translate-x-1/2 pointer-events-none absolute left-1/2 h-[80vmin] w-[120vmin] rounded-b-full",
            "bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.10),transparent_60%)]",
            "blur-[40px]",
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
      <section className="relative isolate overflow-hidden py-28 text-center">
        <div className="absolute inset-0 -z-10">
          <Parallax distance={60} className="h-[130%] w-full">
            <div className="fy-img-tint relative h-full w-full">
              <Image
                src="/madagascar/twilight-city.webp"
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
          </Parallax>
          <div className="absolute inset-0 bg-background/70" />
        </div>
        <div className="mx-auto max-w-3xl px-6">
          <RevealWords
            as="h2"
            text={t("cta_title")}
            className="mb-4 block text-3xl font-semibold tracking-tight md:text-4xl"
          />
          <Reveal delay={150}>
            <p className="mb-8 text-muted-foreground">{t("cta_subtitle")}</p>
          </Reveal>
          <Reveal delay={300}>
            <MagneticButton className="inline-block">
              <Link href="/login">
                <Button
                  size="lg"
                  className="gap-2 rounded-full bg-brand px-10 text-brand-foreground hover:bg-brand/90"
                >
                  {t("cta_button")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </MagneticButton>
          </Reveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row">
          <FyLogo small />
          <p>{t("footer_tagline")}</p>
          <p>© {new Date().getFullYear()} fy. {t("footer_rights")}</p>
        </div>
      </footer>
    </>
  );
}

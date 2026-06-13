"use client";

import { MessageSquare, Wrench, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealWords } from "@/components/reveal";

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    { icon: MessageSquare, titleKey: "how_step1_title", descKey: "how_step1_desc" },
    { icon: Wrench, titleKey: "how_step2_title", descKey: "how_step2_desc" },
    { icon: Sparkles, titleKey: "how_step3_title", descKey: "how_step3_desc" },
  ] as const;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mb-16 text-center">
        <RevealWords
          as="h2"
          text={t("how_title")}
          className="mb-3 block text-3xl font-semibold tracking-tight md:text-4xl"
        />
        <Reveal delay={150}>
          <p className="text-muted-foreground">{t("how_subtitle")}</p>
        </Reveal>
      </div>

      <div className="relative grid gap-10 md:grid-cols-3">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
        />
        {steps.map(({ icon: Icon, titleKey, descKey }, i) => (
          <Reveal key={titleKey} delay={i * 120} className="relative text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
              <Icon className="h-6 w-6 text-brand" strokeWidth={1.5} />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-brand-foreground">
                {i + 1}
              </span>
            </div>
            <h3 className="mb-1 text-base font-semibold">
              {t(titleKey as Parameters<typeof t>[0])}
            </h3>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t(descKey as Parameters<typeof t>[0])}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

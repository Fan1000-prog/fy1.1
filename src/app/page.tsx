"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  PlayCircle,
  FileText,
  Mic,
  Image,
  Languages,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: Globe, key: "feat_web" },
    { icon: PlayCircle, key: "feat_youtube" },
    { icon: FileText, key: "feat_text" },
    { icon: Mic, key: "feat_voice" },
    { icon: Image, key: "feat_image" },
    { icon: Languages, key: "feat_multilang" },
  ] as const;

  return (
    <div className="flex min-h-full flex-col fy-hero-gradient">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <FyLogo />
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("nav_features")}
            </a>
            <a href="#about" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {t("nav_about")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <ThemeToggle />
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
          <Badge
            variant="secondary"
            className="mb-6 gap-2 rounded-full border border-brand/30 bg-brand-muted px-4 py-1.5 text-xs font-medium text-brand"
          >
            <Sparkles className="h-3 w-3" />
            {t("hero_badge")}
          </Badge>

          <h1 className="mb-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
            <span className="block">{t("hero_title_1")}</span>
            <span className="block bg-gradient-to-r from-brand via-amber-400 to-brand bg-clip-text text-transparent">
              {t("hero_title_2")}
            </span>
          </h1>

          <p className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {t("hero_subtitle")}
          </p>

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

          {/* Hero visual */}
          <div className="relative mt-20 w-full max-w-3xl">
            <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-b from-brand/10 to-transparent blur-2xl" />
            <ChatPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-16 text-center">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {t("features_title")}
            </h2>
            <p className="text-muted-foreground">{t("features_subtitle")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, key }, i) => (
              <FeatureCard
                key={key}
                icon={Icon}
                title={t(`${key}_title` as Parameters<typeof t>[0])}
                desc={t(`${key}_desc` as Parameters<typeof t>[0])}
                accent={i === 0}
              />
            ))}
          </div>
        </section>

        {/* Trust strip */}
        <section id="about" className="border-y border-border/50 bg-muted/30 py-12">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 text-center md:flex-row md:text-left">
            {[
              { icon: Zap, label: "Ultra-rapide" },
              { icon: Shield, label: "Données privées" },
              { icon: Languages, label: "3 langues" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-2 md:items-start">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-3xl px-6 py-28 text-center">
          <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
            {t("cta_title")}
          </h2>
          <p className="mb-8 text-muted-foreground">{t("cta_subtitle")}</p>
          <Link href="/login">
            <Button
              size="lg"
              className="gap-2 rounded-full bg-brand px-10 text-brand-foreground hover:bg-brand/90"
            >
              {t("cta_button")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex items-center justify-center rounded-xl bg-brand font-bold text-brand-foreground",
          small ? "h-6 w-6 text-[11px]" : "h-8 w-8 text-sm"
        )}
      >
        fy
      </div>
      {!small && (
        <span className="text-base font-semibold tracking-tight">fy</span>
      )}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "group rounded-2xl border border-border p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        accent
          ? "border-brand/30 bg-brand-muted"
          : "bg-card hover:border-border/80"
      )}
    >
      <div
        className={cn(
          "mb-4 flex h-10 w-10 items-center justify-center rounded-xl",
          accent ? "bg-brand/20" : "bg-muted"
        )}
      >
        <Icon className={cn("h-5 w-5", accent ? "text-brand" : "text-muted-foreground")} />
      </div>
      <h3 className="mb-2 font-medium">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
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
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-brand-foreground">
            fy
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
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-[11px] font-bold text-brand-foreground">
            fy
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

"use client";

import Image from "next/image";
import {
  Globe,
  PlayCircle,
  FileText,
  Mic,
  Image as ImageIcon,
  Languages,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Reveal, RevealWords } from "@/components/reveal";

const features = [
  { icon: Globe, key: "feat_web", img: "/madagascar/twilight-city.webp" },
  { icon: PlayCircle, key: "feat_youtube", img: "/madagascar/market.webp" },
  { icon: FileText, key: "feat_text", img: "/madagascar/artisan.webp" },
  { icon: Mic, key: "feat_voice", img: "/madagascar/highlands-people.webp" },
  { icon: ImageIcon, key: "feat_image", img: "/madagascar/taxi-be.webp" },
  { icon: Languages, key: "feat_multilang", img: "/madagascar/hero-street.webp" },
] as const;

export function Features() {
  const { t } = useI18n();
  return (
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

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, key, img }, i) => (
          <Reveal key={key} delay={i * 80}>
            <FeatureCard
              icon={Icon}
              img={img}
              title={t(`${key}_title` as Parameters<typeof t>[0])}
              desc={t(`${key}_desc` as Parameters<typeof t>[0])}
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  img,
  title,
  desc,
}: {
  icon: React.ElementType;
  img: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group transition duration-300 hover:-translate-y-1">
      <div className="fy-img-tint relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
        <Image
          src={img}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 z-10 bg-brand/20 transition-colors duration-500 group-hover:bg-brand/10" />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <Icon
            className="h-16 w-16 text-white drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
            strokeWidth={1.25}
          />
        </div>
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
    </div>
  );
}

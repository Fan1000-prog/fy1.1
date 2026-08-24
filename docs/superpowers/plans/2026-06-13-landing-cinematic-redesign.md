# Landing Page Cinematic Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `src/app/page.tsx` into an animated, cinematic, awwwards-grade landing page with photoreal Madagascar imagery (Higgsfield), keeping the brand palette, logo, and all existing web copy.

**Architecture:** Slim `page.tsx` into composable section components under `src/components/landing/`. Add three small framer-motion primitives (`Parallax`, `MagneticButton`, `ImageReveal`). Imagery generated via Higgsfield → `/public/madagascar/`, brand-graded by CSS overlay. Two new sections (How it works, MG story). Every motion effect has a `prefers-reduced-motion` fallback.

**Tech Stack:** Next 16.2.4 (App Router, `next/image`), React 19, framer-motion 12.38, Tailwind v4, existing `Reveal`/`RevealWords` + `cn` util.

---

## Testing note (read first)

These are **presentational** components — unit-testing pixels is low-value. Verification for each
task is **typecheck + build green** plus **visual confirmation via Playwright** (the
`example-skills:webapp-testing` skill / Playwright MCP) in light, dark, mobile, and
`prefers-reduced-motion`. Where a task has logic worth asserting, a test is specified explicitly.
Commit after every task.

Dev server: `npm run dev` (Turbopack). Typecheck/build: `npm run build`.

---

## File structure

- Create `src/components/landing/fy-logo.tsx` — the logo link (moved out of `page.tsx`).
- Create `src/components/landing/site-nav.tsx` — scroll-aware header/nav.
- Create `src/components/landing/hero.tsx` — full-bleed image hero + chat preview glass card.
- Create `src/components/landing/how-it-works.tsx` — NEW 3-step section.
- Create `src/components/landing/features.tsx` — 6 cards with image backgrounds.
- Create `src/components/landing/story.tsx` — NEW immersive MG story section.
- Create `src/components/landing/cta.tsx` — CTA with image backdrop + footer.
- Create `src/components/motion/parallax.tsx`, `src/components/motion/magnetic-button.tsx`, `src/components/motion/image-reveal.tsx` — primitives.
- Modify `src/app/page.tsx` — compose the sections (becomes thin).
- Modify `src/app/globals.css` — grain, image-tint, reveal keyframes.
- Modify `src/lib/i18n.tsx` — additive keys ×3 locales.
- Create `/public/madagascar/*.webp` — generated assets.

---

## Task 1: Read Next 16 image docs + generate Madagascar imagery

**Files:**
- Create: `public/madagascar/hero-street.webp`, `market.webp`, `taxi-be.webp`, `highlands-people.webp`, `artisan.webp`, `twilight-city.webp`

- [ ] **Step 1: Read the Next 16 Image API doc** (AGENTS.md requirement)

Read: `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` and
`node_modules/next/dist/docs/01-app/01-getting-started/12-images.md`.
Confirm: `fill` prop behavior, required `sizes` with `fill`, `priority`, and whether local
`/public` images need any config (they do not). Note any Next 16 deltas from prior versions.

- [ ] **Step 2: Authenticate Higgsfield**

Invoke the `higgsfield-generate` skill. If the MCP reports unauthenticated, run the Higgsfield
`authenticate` → `complete_authentication` flow. If auth/credits fail, STOP image generation,
create the directory `public/madagascar/`, and proceed — components fall back to gradient
placeholders (Task 4 provides the fallback). Record the failure in the task notes.

- [ ] **Step 3: Generate the 6 images** (photoreal, GPT Image 2, golden hour, documentary)

Use these prompts (each: warm cinematic color grade, natural light, shallow depth, leave calm
negative space for text overlay, 16:9 unless noted). Generate at high resolution, download, convert
to `.webp`, save under `public/madagascar/`:

1. `hero-street` — "Documentary golden-hour photograph of a lively street in Antananarivo, Madagascar; people walking, colorful storefronts, hills with terracotta houses in the background, warm cinematic light, wide composition with open sky for text, photoreal."
2. `market` — "Vibrant Analakely market in Antananarivo, vendors and fresh produce, baskets, colorful umbrellas, candid people, warm afternoon light, photoreal documentary."
3. `taxi-be` — "Classic Malagasy taxi-be (minibus) on an Antananarivo street, passengers, urban texture, golden hour, photoreal street photography."
4. `highlands-people` — "Malagasy people in the central highlands near rice terraces, lamba shawls, soft morning light, rolling green hills, dignified candid portrait energy, photoreal." (portrait/4:5 ok)
5. `artisan` — "Close-up of Malagasy artisan hands weaving raffia / working a craft, warm tones, shallow depth of field, photoreal." (4:5 ok)
6. `twilight-city` — "Antananarivo at twilight from a hillside, scattered warm lights across the hills, deep blue sky, photoreal cityscape, wide."

- [ ] **Step 4: Verify assets exist**

Run: `ls -la public/madagascar/`
Expected: 6 `.webp` files present (or empty dir + recorded fallback note from Step 2).

- [ ] **Step 5: Commit**

```bash
git add public/madagascar/
git commit -m "feat(landing): add Madagascar imagery (Higgsfield)"
```

---

## Task 2: Add new i18n keys (fr / mg / en)

**Files:**
- Modify: `src/lib/i18n.tsx` (add keys to each of the `fr`, `mg`, `en` objects)

- [ ] **Step 1: Add the new keys to `fr`** (insert after the `// CTA section` block, before `// Partners`)

```ts
    // How it works
    how_title: "Comment ça marche",
    how_subtitle: "Trois étapes, c'est tout.",
    how_step1_title: "Posez votre question",
    how_step1_desc: "Écrivez ou parlez — en français, malgache ou anglais.",
    how_step2_title: "fy utilise ses outils",
    how_step2_desc: "Recherche web, vidéos, voix, images — fy choisit ce qu'il faut.",
    how_step3_title: "Vous obtenez la réponse",
    how_step3_desc: "Claire, sourcée, dans votre langue.",
    // Story
    story_eyebrow: "Notre histoire",
    story_title: "Fait à Madagascar, pour Madagascar.",
    story_body:
      "Des rues d'Antananarivo aux Hautes Terres, fy est né ici. Une IA qui comprend notre langue, notre contexte et nos ambitions — pour que chaque Malagasy ait un assistant à la hauteur de ses rêves.",
```

- [ ] **Step 2: Add the new keys to `mg`** (same location in the `mg` object)

```ts
    // How it works
    how_title: "Ahoana no fiasany",
    how_subtitle: "Dingana telo, fa izay.",
    how_step1_title: "Apetraho ny fanontanianao",
    how_step1_desc: "Soraty na lazao — amin'ny teny frantsay, malagasy na anglisy.",
    how_step2_title: "Mampiasa ny fitaovany i fy",
    how_step2_desc: "Fikarohana web, horonantsary, feo, sary — i fy no misafidy izay ilaina.",
    how_step3_title: "Mahazo ny valiny ianao",
    how_step3_desc: "Mazava, misy loharano, amin'ny teninao.",
    // Story
    story_eyebrow: "Ny tantaranay",
    story_title: "Vita Malagasy, ho an'ny Malagasy.",
    story_body:
      "Avy amin'ny arabe eto Antananarivo ka hatrany amin'ny Afovoan-tany, teraka eto i fy. Intelligence artificielle mahatakatra ny fitenintsika, ny tontolontsika ary ny nofintsika — mba hananan'ny Malagasy tsirairay mpanampy mendrika ny nofiny.",
```

- [ ] **Step 3: Add the new keys to `en`** (same location in the `en` object)

```ts
    // How it works
    how_title: "How it works",
    how_subtitle: "Three steps, that's it.",
    how_step1_title: "Ask your question",
    how_step1_desc: "Type or speak — in French, Malagasy or English.",
    how_step2_title: "fy uses its tools",
    how_step2_desc: "Web, video, voice, images — fy picks the right one.",
    how_step3_title: "You get the answer",
    how_step3_desc: "Clear, sourced, in your language.",
    // Story
    story_eyebrow: "Our story",
    story_title: "Made in Madagascar, for Madagascar.",
    story_body:
      "From the streets of Antananarivo to the highlands, fy was born here. An AI that understands our language, our context and our ambition — so every Malagasy has an assistant worthy of their dreams.",
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (The `TranslationKey` type is derived from `translations.fr`, so all three
objects must share the same keys — if a key is missing in one locale, `t()` calls won't error but
keep them in sync.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.tsx
git commit -m "feat(i18n): add how-it-works + story keys (fr/mg/en)"
```

---

## Task 3: Motion primitives

**Files:**
- Create: `src/components/motion/parallax.tsx`, `src/components/motion/magnetic-button.tsx`, `src/components/motion/image-reveal.tsx`

- [ ] **Step 1: Create `src/components/motion/parallax.tsx`**

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Translates children vertically as the element scrolls through the viewport.
 *  Identity transform under reduced-motion. */
export function Parallax({
  children,
  distance = 80,
  className,
}: {
  children: ReactNode;
  distance?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div
        style={reduce ? undefined : { y }}
        className="h-full w-full will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/motion/magnetic-button.tsx`**

```tsx
"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/** Wraps a CTA so it eases toward the cursor on hover. No-op under reduced-motion / touch. */
export function MagneticButton({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Create `src/components/motion/image-reveal.tsx`**

```tsx
"use client";

import { useRef } from "react";
import Image, { type ImageProps } from "next/image";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/** next/image with a bottom-up clip-path wipe when it enters the viewport. */
export function ImageReveal({
  className,
  wrapperClassName,
  ...props
}: ImageProps & { wrapperClassName?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={reduce ? false : { clipPath: "inset(100% 0 0 0)" }}
      animate={inView || reduce ? { clipPath: "inset(0% 0 0 0)" } : undefined}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={cn("relative overflow-hidden", wrapperClassName)}
    >
      <Image className={className} {...props} />
    </motion.div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/motion/
git commit -m "feat(motion): parallax, magnetic-button, image-reveal primitives"
```

---

## Task 4: CSS effects (grain, image tint, fallback gradient)

**Files:**
- Modify: `src/app/globals.css` (append after the existing keyframes, end of file)

- [ ] **Step 1: Append cinematic utilities to `globals.css`**

```css
/* Animated film grain overlay (decorative; respects reduced-motion) */
@keyframes fy-grain-shift {
  0%, 100% { transform: translate(0, 0); }
  20% { transform: translate(-3%, 2%); }
  40% { transform: translate(2%, -3%); }
  60% { transform: translate(-2%, -2%); }
  80% { transform: translate(3%, 3%); }
}
.fy-grain {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E");
  opacity: 0.05;
  animation: fy-grain-shift 8s steps(5) infinite;
  mix-blend-mode: overlay;
}

/* Brand-green tint that grades photoreal imagery toward the palette */
.fy-img-tint::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, transparent 40%, var(--brand) 140%),
    radial-gradient(ellipse at center, transparent 50%, oklch(0.38 0.08 152 / 0.18));
  mix-blend-mode: multiply;
  opacity: 0.55;
}
.dark .fy-img-tint::after {
  opacity: 0.7;
}

/* Gradient-placeholder shown when a Madagascar image is missing */
.fy-img-fallback {
  background:
    radial-gradient(ellipse at 30% 20%, oklch(0.55 0.10 152 / 0.5), transparent 60%),
    linear-gradient(160deg, var(--brand), oklch(0.30 0.06 152));
}

@media (prefers-reduced-motion: reduce) {
  .fy-grain { animation: none; }
}
```

- [ ] **Step 2: Visual check**

Run: `npm run dev`, open `/`. Confirm no CSS parse errors in the terminal/console.
(Utilities aren't wired into markup yet — this only verifies the CSS compiles.)

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style(landing): grain, image-tint, fallback gradient utilities"
```

---

## Task 5: FyLogo + scroll-aware nav

**Files:**
- Create: `src/components/landing/fy-logo.tsx`, `src/components/landing/site-nav.tsx`

- [ ] **Step 1: Create `src/components/landing/fy-logo.tsx`** (moved verbatim from `page.tsx`)

```tsx
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
```

- [ ] **Step 2: Create `src/components/landing/site-nav.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { LangSwitcher } from "@/components/lang-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FyLogo } from "./fy-logo";

export function SiteNav() {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.querySelector(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      initial={false}
      animate={{ paddingTop: scrolled ? 6 : 12, paddingBottom: scrolled ? 6 : 12 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300",
        scrolled ? "border-border/60 bg-background/85" : "border-transparent bg-background/40",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
        <FyLogo />
        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#features"
            onClick={(e) => scrollToSection(e, "#features")}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav_features")}
          </a>
          <a
            href="#about"
            onClick={(e) => scrollToSection(e, "#about")}
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
    </motion.header>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/fy-logo.tsx src/components/landing/site-nav.tsx
git commit -m "feat(landing): extract FyLogo + scroll-aware nav"
```

---

## Task 6: Hero with full-bleed imagery

**Files:**
- Create: `src/components/landing/hero.tsx`

- [ ] **Step 1: Create `src/components/landing/hero.tsx`**

Keeps the morph loader, `hero_title_1/2`, `hero_subtitle`, CTA + `hero_cta_sub`, and the chat
preview (now a glass card floating over the image). Adds full-bleed background, parallax, grain,
green scrim, and a magnetic primary CTA.

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/hero.tsx
git commit -m "feat(landing): cinematic full-bleed hero"
```

---

## Task 7: How it works section (NEW)

**Files:**
- Create: `src/components/landing/how-it-works.tsx`

- [ ] **Step 1: Create `src/components/landing/how-it-works.tsx`**

```tsx
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
        {/* connecting line (desktop) */}
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/how-it-works.tsx
git commit -m "feat(landing): add How it works section"
```

---

## Task 8: Features with image backgrounds

**Files:**
- Create: `src/components/landing/features.tsx`

- [ ] **Step 1: Create `src/components/landing/features.tsx`**

Same 6 features, same titles/descriptions. Each card now layers a tinted MG photo behind the icon.
1:1 image mapping: web→twilight-city, youtube→market, text→artisan, voice→highlands-people,
image→taxi-be, multilang→hero-street.

```tsx
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
import { cn } from "@/lib/utils";

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
```

Note: `.fy-img-tint` uses `::after` (no `z-index`), so it paints above the image but below the
`z-10`/`z-20` overlays — icons stay legible. If the tint ever covers the icon during review, add
`z-0` to the tint rule; verify visually in Task 11.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/features.tsx
git commit -m "feat(landing): feature cards with Madagascar imagery"
```

---

## Task 9: Immersive MG story section (NEW)

**Files:**
- Create: `src/components/landing/story.tsx`

- [ ] **Step 1: Create `src/components/landing/story.tsx`**

Full-bleed parallax image with the manifesto copy revealed over it.

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/story.tsx
git commit -m "feat(landing): add immersive Madagascar story section"
```

---

## Task 10: CTA + footer, then compose page.tsx

**Files:**
- Create: `src/components/landing/cta.tsx`
- Modify: `src/app/page.tsx` (full rewrite — thin composition)

- [ ] **Step 1: Create `src/components/landing/cta.tsx`** (CTA with image backdrop + footer + partners)

```tsx
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
```

- [ ] **Step 2: Rewrite `src/app/page.tsx`** (thin composition)

```tsx
import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Story } from "@/components/landing/story";
import { PartnersAndCta } from "@/components/landing/cta";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col fy-hero-gradient">
      <SiteNav />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Story />
        <PartnersAndCta />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (No remaining references to the old `FyLogo` export in `page.tsx`.)

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds, no type errors, `/` compiles.

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/cta.tsx src/app/page.tsx
git commit -m "feat(landing): CTA backdrop + compose cinematic page"
```

---

## Task 11: Verification pass (light/dark, mobile, reduced-motion)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server** — `npm run dev`

- [ ] **Step 2: Visual check via Playwright** (use `example-skills:webapp-testing` / Playwright MCP)

Navigate to `http://localhost:3000/`. Capture full-page screenshots and confirm:
  - Light mode: imagery visible, text legible over scrims, no layout shift.
  - Dark mode (toggle theme): imagery + tint look intentional, contrast holds.
  - Mobile viewport (390×844): hero readable, feature grid stacks, no horizontal scroll, parallax not janky.
  - Hero, How it works, Features, Story, CTA all render with imagery (or fallback gradient if Task 1 fell back).
  - Feature-card icons remain legible above the `.fy-img-tint` overlay (the Task 8 note).

- [ ] **Step 3: Reduced-motion check**

In Playwright, emulate `prefers-reduced-motion: reduce` and reload. Confirm content is fully
visible (no stuck-hidden reveals), no parallax translation, no grain animation, magnetic button
static.

- [ ] **Step 4: Language check**

Switch language via the LangSwitcher to mg and en. Confirm new sections (How it works, Story)
show translated copy and no raw key strings.

- [ ] **Step 5: Final build**

Run: `npm run build`
Expected: green. Confirm `package.json` has no new dependencies.

- [ ] **Step 6: Commit any fixes found during verification**

```bash
git add -A
git commit -m "fix(landing): verification-pass adjustments"
```

(Skip if nothing changed.)

---

## Self-review (completed during planning)

- **Spec coverage:** nav (T5), hero full-bleed + parallax + magnetic + grain (T6), How it works (T7), features w/ imagery (T8), MG story (T9), partners unchanged + CTA backdrop + footer (T10), imagery pipeline (T1), additive i18n (T2), motion primitives (T3), CSS effects (T4), light/dark + reduced-motion + mobile verification (T11). All spec sections mapped.
- **Palette/logo/copy constraints:** logo reused verbatim (T5); no existing i18n string changed, only additive (T2); brand tokens only, grading via CSS overlay (T4); no new deps (verified T10/T11).
- **Type consistency:** `Parallax(distance, className)`, `MagneticButton(strength, className)`, `ImageReveal(wrapperClassName)`, `FyLogo(small)`, `PartnersAndCta`, `Hero`, `HowItWorks`, `Features`, `Story`, `SiteNav` — names consistent across tasks. `t()` cast pattern matches existing `page.tsx` usage.
- **Placeholders:** none — all code complete; image fallback behavior defined in T1/T4.
- **Risk noted:** Higgsfield auth/credits (T1 fallback); `.fy-img-tint` z-order (T8 note + T11 check).

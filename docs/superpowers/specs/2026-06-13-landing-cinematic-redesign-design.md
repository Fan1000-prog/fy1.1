# Landing Page — Cinematic Redesign

**Date:** 2026-06-13
**Branch:** `feature/landing-page-redesign`
**Status:** Design — awaiting user review

## Goal

Turn the current `fy.` landing page (`src/app/page.tsx`) into an animated, awwwards-grade,
interactive experience. Keep the brand palette, logo, and all existing web copy. Add the
sections it lacks. Populate it with cinematic photoreal imagery of Madagascar's streets and
people, generated via the Higgsfield MCP.

## Hard constraints (do not violate)

- **Palette:** forest-green brand `#013220` + existing green tokens in `globals.css`. No new brand hues.
- **Logo:** `/public/fy-logo.png` only (existing `FyLogo` component).
- **Web copy:** every existing `i18n` string (fr/mg/en) is preserved verbatim. New copy is
  **additive only** — new keys added to all three locales.
- **No new heavy dependencies.** Use `framer-motion` (already at ^12.38.0) + CSS. No three.js/WebGL.
- **Light + dark parity.** Both themes must look intentional; imagery overlays tuned for each.
- **Accessibility:** every motion effect has a `prefers-reduced-motion` fallback (continues the
  existing `.fy-reveal` pattern). Mobile downgrades parallax to static.
- **Next 16:** per `AGENTS.md`, read `node_modules/next/dist/docs` for the current `next/image`
  and any relevant APIs before writing component code.

## Decisions (from brainstorming)

- Animation level: **Cinematic** — full-bleed imagery, scroll parallax + reveals, magnetic cursor
  on CTAs, animated grain/gradient mesh. framer-motion + CSS, no new deps.
- Imagery: **Cinematic photoreal** — documentary golden-hour Antananarivo, green-graded via overlay.
- New sections: **Immersive MG story** + **How it works (3 steps)**.
- Higgsfield: **generate the real images now** (consumes credits).

## Page structure (top → bottom)

1. **Nav** — same structure/links. Add scroll-aware behavior: subtle shrink + stronger blur/border
   after scrollY > 24px. Uses a small scroll hook + framer-motion, reduced-motion safe.
2. **Hero** — full-bleed photoreal Antananarivo street (golden hour) behind existing content.
   Forest-green gradient scrim for legibility. Keep morph loader, `hero_title_1/2`, `hero_subtitle`,
   CTA + `hero_cta_sub`. Add: background parallax, `MagneticButton` on the primary CTA, animated grain.
3. **How it works (NEW)** — 3 steps (ask → fy uses its tools → you get the answer). Staggered
   scroll reveal with connecting line. New i18n keys.
4. **Features** — same 6 cards, same titles/descriptions. Replace flat gradient backgrounds with
   tinted MG photos (per-card mapping). Hover = image zoom + green wash + lift (existing `-translate-y-1`).
5. **Immersive MG story (NEW)** — full-bleed scrolling section. Layered MG imagery with parallax,
   `ImageReveal` clip wipes, and a short manifesto expanding `footer_tagline`
   ("Vita Malagasy ho an'ny Malagasy"). New i18n keys.
6. **Partners cloud** — unchanged.
7. **CTA** — same copy (`cta_title`, `cta_subtitle`, `cta_button`). Add MG-image backdrop + parallax + magnetic button.
8. **Footer** — unchanged.

## Imagery pipeline (Higgsfield)

- Authenticate the Higgsfield MCP, then generate via the `higgsfield-generate` skill (GPT Image 2),
  ~6 images, documentary/photoreal, warm golden hour, framed to leave negative space for text:
  1. `hero-street` — Antananarivo street life, golden hour, wide.
  2. `market` — Analakely / Zoma market, produce, people, color.
  3. `taxi-be` — classic taxi-be / street transport.
  4. `highlands-people` — people in the highlands / rice terraces, portrait energy.
  5. `artisan` — craft / artisan hands at work (ties to creativity).
  6. `twilight-city` — Antananarivo at dusk, lights, hills.
- Save to `/public/madagascar/<name>.<ext>`, serve via `next/image` (responsive `sizes`, `priority`
  only on hero).
- Green brand grading applied with a CSS overlay (`bg-brand/...` + gradient), not baked into the
  asset, so palette stays brand-true in both themes.
- **Risk/fallback:** if auth or credits fail, components fall back to a CSS gradient placeholder of
  the same dimensions; the build never blocks on generation. Record final prompts in the plan so
  images are reproducible.

## Animation system

- **framer-motion** for scroll progress, parallax (`useScroll` + `useTransform`), and staggered
  section reveals.
- **CSS** for grain (extend existing `.fy-noise`) and the gradient mesh (`.fy-hero-gradient`).
- New small, single-purpose primitives in `src/components/`:
  - `Parallax` — translates children by scroll progress; identity transform under reduced-motion / mobile.
  - `MagneticButton` — pointer-follow micro-interaction wrapping a CTA; disabled under reduced-motion and on touch.
  - `ImageReveal` — `next/image` with a clip-path wipe-in on enter; static under reduced-motion.
- Reuse existing `Reveal` / `RevealWords`. Keep all timings on the existing easing
  `cubic-bezier(0.22, 1, 0.36, 1)` for consistency.

## New i18n keys (added to fr / mg / en)

- `how_title`, `how_subtitle`
- `how_step1_title`, `how_step1_desc`
- `how_step2_title`, `how_step2_desc`
- `how_step3_title`, `how_step3_desc`
- `story_eyebrow`, `story_title`, `story_body` (manifesto), `story_cta` (optional)

(Exact strings drafted in the implementation plan; Malagasy and French written natively, not machine-translated placeholders.)

## Files touched

- `src/app/page.tsx` — restructure into section components; add new sections.
- `src/app/globals.css` — grain/mesh/overlay utilities, image-reveal keyframes, scroll-nav styles.
- `src/lib/i18n.tsx` — additive keys ×3 locales.
- `src/components/parallax.tsx`, `src/components/magnetic-button.tsx`, `src/components/image-reveal.tsx` — new.
- `/public/madagascar/*` — generated assets.

## Out of scope

- No changes to `/chat`, `/login`, auth, or any API route.
- No live tool-demo section, no testimonials (deferred).
- No copy changes to existing strings.
- No new fonts or brand colors.

## Success criteria

- Page renders in light + dark with cinematic MG imagery, all existing copy intact.
- Two new sections present and animated.
- All motion respects `prefers-reduced-motion`; mobile has no janky parallax.
- `npm run build` is green; no new heavy deps in `package.json`.
- Lighthouse: no severe perf/a11y regressions vs. current (spot-check).

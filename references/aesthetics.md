# Aesthetics: modern, futuristic, enterprise

The spec for how a revamped hero looks. Futurism lives in **one layer** (the backdrop or the hero object);
trust lives in the type, the copy and the real product. Numbers are calibrated ranges from current premium
sites (Linear, Vercel, Stripe, Raycast, Resend, Clerk, Anthropic, Apple), several from third-party
extractions: use them as ranges, not specs. Sources at the end.

## Composition

- **Object-led or centred-with-product.** One hero object or one real product surface carries the frame
  (Apple's one-object stage, Raycast's lit icon, Linear's angled product UI). In a study of 100+ dev-tool
  landing pages, a centred headline with the visual underneath dominated and a 50/50 split was the
  exception (Evil Martians 2025).
- **Centring alone is a tell** when only text and a gradient sit in the middle (23.5 % of 500 Show HN sites
  used a centred title, 28 % gradients: Krebs 2026). It works only when the object carries the frame.
- **Product frames bleed** off the bottom or side, faded into the stage with a mask; never a small floating
  screenshot.
- **Concept first:** one sentence tying the object to the product before any styling ("the router as a lit
  glass prism splitting traffic"). Swap the object for a generic one: if the design still works, the idea
  isn't coming from the subject.

## Type

| Role | Spec |
|---|---|
| Headline | grotesk/neo-grotesk sans, weight **500-600** (700+ reads "poster"), `clamp(2.5rem, 6vw, 5.5rem)`, line-height 0.95-1.1, tracking −0.02 to −0.045em (tighter as it grows), `text-balance`; ≤ 8 words |
| Accent | at most **one** accent word: the brand colour, or a serif/italic word inside the sans line |
| Sub-copy | 17-20 px, line-height 1.5, ~60-65 % contrast grey, max 520-600 px wide |
| Labels | 12-13 px, sentence case, grey or mono; **not** tracked-out uppercase eyebrows (a 2026 tell) |
| Families | Inter Display, Geist, Söhne, Switzer, General Sans, Satoshi, a custom brand face, plus a mono for technical texture; the brand's font wins. Geist or Instrument Serif aren't wrong, the *default pairing with no other decision* is |

## Palette (OKLCH)

- Near-black (`oklch(0.13-0.16 0.005-0.01 <hue>)`) or a warm off-white, never pure `#000`/`#fff` across the
  page. Neutrals tuned, slightly warm or cool to the brand (Linear's 2026 refresh: warmer, less saturated
  greys; too warm looks muddy).
- 3-4 surface steps 0.02-0.03 L apart; 2-3 text greys (100 %, ~65 %, ~45 %).
- **One accent** on ≤ 5-8 % of the pixels (the CTA, one word, one light source). Glows and tints with
  `color-mix(in oklch, var(--accent) 12%, transparent)`.
- No default indigo/violet, no cyan-violet blur blobs: Tailwind's `indigo-500` became the AI default.

## Light and depth: light has a direction and consequences

| Layer | Spec |
|---|---|
| Key light | one elliptical radial gradient (≈ 120 % × 60 % of the viewport) above or behind the object, 6-12 % accent over the base, no visible edge |
| Rim | a thin bright edge separating the object from the dark |
| Spill | the object's colour on the floor or the nearest surface, 10-20 % |
| Contact shadow + floor pool | always under an object: **glow without a shadow reads fake** |
| Rays, dust | volumetric rays at 3-8 %, sparse dust motes |
| Grain | 2-6 % monochrome noise (SVG `feTurbulence`, baseFrequency ~0.8, overlay/soft-light, `isolation: isolate` on the parent); over 8 % reads dirty |
| Vignette | 10-25 % at the corners on cinematic stages |
| Hairlines | 1 px at 6-10 % white (6-8 % black on light), brighter at the top edge and fading by ~40 % down (mask-composite border or `::before`); a lit bevel: `inset 0 1px 0 rgb(255 255 255 / .06-.12)` |
| Glass | `backdrop-filter: blur(12-24px)`, 4-8 % white fill and a hairline, on the nav and **at most one** panel |
| Separators | fewer: "structure should be felt, not seen" (Linear 2026) |

For a 3D object: an environment map plus one key light, physical materials (clearcoat; transmission for
glass), a contact shadow, post-processing limited to low bloom (threshold ~0.8), vignette and noise; no
chromatic aberration in enterprise work.

## Motion: one moment

- **At most 2 moving layers** (the backdrop and the object or UI). The backdrop sits at ~20-30 % visual weight
  and loops over 8-20 s, moving under ~2 % of the viewport a second.
- Entrances: 8-16 px rise with a fade, 500-800 ms, `cubic-bezier(0.16,1,0.3,1)`, 40-80 ms stagger per line or
  word (never per letter on enterprise copy); the product frame 150-300 ms after the copy.
- Pointer: 4-12 px parallax or ≤ 6° tilt on a spring (stiffness 100-200, damping 20-30).
- **Motion that shows state** (real UI changing, data updating) beats decorative fades.
- Reduced motion: opacity-only entrances, loops frozen on a designed still.

## Nav, CTA, proof, space

- Nav 56-64 px: logo, 4-6 text links at 14 px, "Log in" as text, one small filled button; transparent over the
  hero, blur(12px) + a hairline on scroll; chrome dimmer than the content.
- Two CTAs: a primary with product-specific wording ("Start building"), a visibly lighter secondary. 40-48 px
  tall, one radius scale.
- Proof **below** the hero: monochrome logos at 40-60 % opacity, 20-28 px tall, or one true number. No stats
  banner, no "Live" dots, no capsule badge unless it is real news.
- Space: 120-200 px top padding on desktop; headline-to-sub gap 0.4-0.6× the headline size; sub-to-CTA
  32-40 px; the product frame 64-96 px below the CTAs.

## Building it (React, performant)

- **CSS first:** OKLCH tokens; stacked radial gradients for light; `conic-gradient` for beams and sheens;
  `@property --a { syntax: '<angle>'; inherits: false; initial-value: 0deg }` to animate gradient borders
  without JS; `mask-image` to fade frames and vignettes; SVG grain. Scroll-driven animations only inside
  `@supports (animation-timeline: scroll())` (not in Firefox by default in early 2026).
- **WebGL:** a full-screen fragment shader (OGL/raw WebGL2, 10-30 KB) for fields, beams and gradients; R3F +
  drei only for real 3D objects. `dpr={[1, 1.5]}`, `frameloop="demand"` when static, pause off-screen and on
  hidden tabs.
- **Motion (motion/react):** animate `transform`, `opacity`, `filter`, `clipPath`; `useReducedMotion` or
  `<MotionConfig reducedMotion="user">`; springs for the pointer, expo-out tweens for entrances.
- **LCP:** the headline is the LCP (text in a preloaded, subset font with a metric-matched fallback). The
  canvas sits on a server-rendered still poster, loads with `next/dynamic({ ssr: false })` after idle and
  cross-fades in over 400-600 ms; skipped on reduced motion, Save-Data, ≤ 4 cores or no WebGL2. Hero JS
  ≤ 150 KB gzip including three.js (OGL keeps it under 40 KB).

## The slop audit (run before showing)

Fail on **3 or more**:
gradient headline or background fog · default shadcn look · a 3- or 6-card icon grid · glass everywhere ·
purple/indigo CTA · tracked-out caps eyebrow · a capsule badge over the title · glowing box-shadows · a stats
banner · emoji in the nav · "the future of / revolutionize / unlock / supercharge" copy · a generic chrome
robot, torus or blob as the object · more than 2 moving layers.

The "Linear look" (dark, blurred gradients behind product UI, glowing elements) is now the generic SaaS
default: copy its **discipline** (tuned neutrals, the real product, dimmed chrome), not its surface.

## Measure the result

- Accent share ≤ 5-8 % of the pixels; headline cap height 6-10 % of the viewport height.
- ≤ 2 distinct moving effects.
- Close to the moodboard in mood (stage luminance, contrast) but **low structural similarity to any single
  reference** (if it reads as one reference at thumbnail size, change the composition or the object).
- Checked at 1440, 1024, 768 and 390 px, and with reduced motion on.

## Sources

Evil Martians, *We studied 100 dev tool landing pages* (2025) · Adrian Krebs via Gigazine, *500 Show HN sites*
(2026) · Noqta, *AI design slop* (2026) · Linear, *How we redesigned the Linear UI* and *Behind the latest design
refresh* (2026) · Vercel Geist typography · prg.sh, *Why your AI keeps building the same purple gradient* ·
LogRocket and Rectangle on "the Linear effect" · bram.us and Codrops on the Stripe gradient · R3F *Scaling
performance* · Motion docs (performance, useReducedMotion) · web.dev *Optimize LCP* · artdirection.substack,
*The Reference Trap* · svilenkovic, *Awwwards 2026 3D* (vendor opinion).

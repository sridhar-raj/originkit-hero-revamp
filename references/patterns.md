# How the best current heroes are built

Measured on 14 live sites (November 2026) by loading each homepage at 1440×900 and 390×844 and reading
computed styles and every animation started in the first seconds. Numbers are computed values unless marked
*(inferred)*. Use these to calibrate, never to copy a site.

**Contents:** Archetypes · Typography numbers · Subheads and CTAs · Load motion · Media and tech · Site notes

## Archetypes

Pick the one the product's truth supports. Each lists what it needs and how it usually fails.

| # | Archetype | Seen at | Fits | Needs | Fails as |
|---|---|---|---|---|---|
| 1 | **Product UI as hero** | Linear, Cursor, Notion, Clerk | SaaS / dev tools with a good real UI | real UI with realistic data, cropped by the fold or bleeding off an edge; a quieter headline | a generic browser frame, lorem data, a tilted 3D screenshot, UI shrunk past legibility |
| 2 | **Live / working demo** | Cursor (agent stream), Clerk (tabs + cursor) | value is a behaviour (agents, auth, editing) | a scripted 5-10 s loop, fast micro-timings (100-250 ms), controls the visitor can take over | too slow, unreadable motion, ignores input |
| 3 | **Editorial type-led** | Resend, Dia, Stripe | brand-forward, or a category where everyone is sans | a distinctive display face, deliberate tracking/leading, few words | default font, 12 words at 96 px, gradient on every word |
| 4 | **Statement + brand object** | Vercel (triangle), Resend (cube, an mp4) | infrastructure / abstract products | one object tied to the logo or metaphor, lit and shadowed; poster fallback | random blobs and orbs, heavy WebGL blocking LCP |
| 5 | **Full-bleed media** | Apple, Raycast, Dia | hardware, lifestyle, launches | art-directed video/imagery, a quiet zone or scrim for type, a pause control, posters per breakpoint | stock footage, text on a busy area |
| 6 | **Generative / shader backdrop** | Stripe (ribbon), Raycast (light bars) | fintech, platforms wanting energy without imagery | brand palette, slow motion, static WebP fallback | the 2021 mesh gradient, purple-to-blue defaults, mobile frame drops |
| 7 | **Made-work collage** | Figma, Anthropic | creative tools, marketplaces, portfolios | real outputs, varied scale and overlap, curation | a uniform thumbnail grid, a Dribbble salad |
| 8 | **Kinetic headline** | Notion (word pill), Framer (per-letter blur) | multi-use products ("for X, Y, Z") | one animated slot, width tweened (~300 ms) or fixed, stable layout | typewriter, layout shift, cycles under 2 s |
| 9 | **Split, asymmetric** | Resend, Vercel (3 columns) | most B2B | copy ~40%, visual ~60%; a third column only for tiny claims | the 50/50 "text left, illustration right" template |
| 10 | **Quiet small type** | Cursor (26 px h1), Apple (28 px h1 eyebrow) | confident, well-known brands | a strong visual underneath, generous space above | small type over a weak visual = unfinished |
| + | **Agent-native CTA** (modifier) | Clerk ("Copy prompt"), Framer ("Get the MCP"), design-file galleries ("Copy the prompt" + "Copy the curl command" beside a tabbed Terminal / DESIGN.md preview) | dev tools and agent-facing products in 2026 | one primary action that hands off to the visitor's agent: a filled "Copy the prompt", a weaker "Copy the command", and a preview of exactly what gets copied (a terminal block with the prompt highlighted); a copied-state confirmation | used where the audience isn't developers; a copy button with no visible preview of what it copies |

The hero is built mostly from OriginKit components (a hero section as the base, or a WebGL background, a 3D
object, a text effect and a button), customised to the product and set in a real product surface: archetypes
4, 5, 6 and 2 map onto it directly. To choose between archetypes, use
`decision-tree.md`; to design what the visual does, `signature.md`.

## Typography numbers

- **Desktop display size:** 54-64 px is the cluster (Linear, Vercel, Framer, Clerk, Figma, Raycast, Apple);
  statements go to 96 px (Resend, Notion); deliberate quiet outliers 26-38 px (Cursor, Dia).
- **Phone size ≈ 0.45-0.75 of desktop:** Notion 96→42, Resend 96→64, Vercel 64→48, Linear 64→38, Framer 54→36.
- **clamp() from measured pairs (390→1440):**
  - Linear-like `clamp(2.375rem, 1.77rem + 2.48vw, 4rem)` (38→64)
  - Statement `clamp(2.625rem, 1.2rem + 5.8vw, 6rem)` (42→96)
  - Mid `clamp(2.25rem, 1.4rem + 3.5vw, 3.5rem)` (36→56)
- **Tracking:** −0.01em serifs and very large sizes (Apple); −0.02em (Linear, Stripe, Figma); −0.035 to −0.048em
  (Clerk, Framer, Dia, Notion); −0.06em (Vercel, Geist at 400). Bigger and heavier takes more; serifs least.
- **Line-height:** 1.0-1.06 dominant; 1.1-1.15 for multi-line sentences (Raycast, Stripe, Clerk, Dia).
- **Weight:** 400-510 now as common as 600-700; Stripe uses 300.
- **Wrapping:** `text-wrap: balance` on the h1 (Vercel, Framer, Clerk, Notion, Dia, Cursor); `pretty` on long ones.

In Tailwind v4: `text-[clamp(2.375rem,1.77rem+2.48vw,4rem)] leading-none tracking-[-0.022em] text-balance`.

## Subheads and CTAs

- **Subhead:** 15-20 px, line-height 1.35-1.6, `max-width` 480-615 px (~45-60ch), one sentence of 8-18 words,
  muted (about 55-65% contrast against the headline, still ≥ 4.5:1 against the ground). Long subheads (23+
  words) only on Supabase and Anthropic.
- **CTAs:** 0-2 (Linear has none; Raycast, Stripe, Figma, Dia, Clerk one; the rest two, the second ghost or
  plain text). Height 34-48 px (Figma 84 and Dia's giant pill are deliberate). Radius 8 px or full pill.
  The skill's floor: 44 px tall on phones, a filled primary (see evidence.md, CTA).

## Load motion

- **Dominant: slow staggered fade-up.** Opacity + translateY 16-24 px over ~1000 ms (Raycast 20/1000; Dia
  24/1000 `cubic-bezier(.19,1,.22,1)`; Resend 16/1000). Stagger 150-250 ms headline → subhead → CTA (Linear
  400/600/850 ms; Figma 0/200/400). The product visual comes last and slower (Linear 1500 ms at 1300 ms).
- **Blur-in:** Framer per-letter `blur(10px)→0` + opacity over 400 ms on a spring; keep it ≤ 8-12 px and on the
  headline only (blur-craft: clear the filter at the end).
- **Easings seen:** `.25,.1,.25,1` (Linear), expo-out `.19,1,.22,1` (Dia), `.22,1,.36,1` (Clerk, Cursor),
  `.86,0,.07,1` for width swaps (Notion), springs as CSS `linear()` (Framer, Clerk).
- **Many top heroes don't animate the headline at all** (Stripe, Cursor, Clerk, Apple): the motion lives in the
  visual (shader, live UI, video).
- **LCP caveat:** a headline starting at `opacity: 0` delays LCP when the headline *is* the LCP. Prefer
  starting painted (`y` only) or a mask reveal; see nextjs.md, Entrance motion.
- **Overdone** (judgment from what top sites avoid): per-word typewriter, per-letter stagger with big Y,
  scramble/decoder text, blur > 16 px, everything animating at once, > ~1.5 s before the CTA is usable,
  infinite gradient shimmer, cursor-following orbs, parallax tilt on screenshots.
- **The skill's rule:** one moment of motion, and it is the signature moment (`signature.md`); no slide-in
  entrance animations on other elements unless asked (Motion / Framer Motion).

## Media and tech

- Preload 1-3 hero font files (Linear 1, Dia 2); 7-8 is a cost, not a goal.
- Preload the hero image (Linear, Cursor, Stripe); give every canvas or video a static poster (Stripe WebP per
  breakpoint, Apple `<picture>` per breakpoint, Dia posters).
- 3D "objects" are often a looping mp4, not live WebGL (Resend's cube).
- On phones, headings keep their alignment (Linear, Stripe, Framer) or switch to centred (Vercel, Resend).

## Site notes

- **Linear:** left h1 at ~30% height, 9 words, Inter Variable 64 px/510/−0.022em/1.0 (phone 38); grey 15 px
  subhead; no button, a text link; full-width product shot cropped by the fold. Restraint: one weight, the
  product sells.
- **Vercel:** 3 columns (h1 + CTAs · WebGL triangle · three one-line claims); 2 words, Geist 64/400/−0.06em.
- **Stripe:** live "GDP running on Stripe" counter above; h1 = headline + subhead as one two-colour sentence
  (24 words, Söhne 48/300/−0.02em, `pretty`); one 48 px CTA; WebGL ribbon is the motion, headline static.
- **Raycast:** centred over a red light-bar canvas; 4 words, 64/600; one 36 px CTA; 20 px/1000 ms rise.
- **Cursor:** the anti-hero: 26 px h1, no subhead, two pills, a large working product window over an oil
  painting; streamed UI lines 100-250 ms.
- **Resend:** split; serif Domaine 96/400 with gradient text; 480 px subhead; 3D cube as mp4.
- **Framer:** 54/500/−0.04em; per-letter blur-in; autoplay product mp4 in a framed card.
- **Clerk:** 56/700; "Copy prompt" primary CTA with agent logos; tabbed live component demo.
- **Notion:** 96/600/−0.048em with an inline rotating-word pill; product mp4 with a mascot over its edge.
- **Figma:** h1 bottom-left beside a collage of real artboards; 84 px "Get started" block.
- **Anthropic:** campaign hero (report), collage tiles; the brand h1 is visually hidden.
- **Dia:** small serif h1, giant wordmark behind a product window, leaf-shadow backdrop (WebP + posters);
  everything scaled by one CSS variable.
- **Apple (AirPods Pro):** full-bleed video with per-breakpoint posters and a pause button; the h1 is the
  product name at 28 px, the visual headline an h2 at 64 px.
- **Supabase:** centred two-line h1 with a green second line; the most template-like of the set.

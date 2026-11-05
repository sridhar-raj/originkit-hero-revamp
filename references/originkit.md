# OriginKit in the rebuild

Every rebuild is built around OriginKit components when they fit: they are what makes a revamped hero modern
and unmistakably its own instead of another template. **Contents:** Connect your account · Pick by archetype ·
The signature rule · The modern-and-unique bar · Build rules · Quota etiquette · Without an account

## Connect your account

Each user connects **their own** OriginKit account. The skill never ships OriginKit code and never uses someone
else's key.

- **CLI** (simplest): `npx originkit login` (browser sign-in, no API key) · `npx originkit whoami` · browse with
  `npx originkit search "<words>"` and `npx originkit list` (free) · install with `npx originkit add <slug>`
  (**spends your quota**; presets as `--<name>`, e.g. `--dark`).
- **MCP**: `claude mcp add -s local --transport http originkit https://mcp.originkit.dev/mcp --header "Authorization: Bearer <your OriginKit API key>"`.
  `search` / `list_components` browse (free); `get_component` / `fetch` deliver (spend quota).
- Keep keys out of git. Don't commit OriginKit component source to a public repo unless your licence allows it.

## Pick by archetype

The catalog (about 950 items) is organised by kind and category. Start from the archetype the diagnosis chose
(`patterns.md`), then browse the matching categories:

| Archetype (patterns.md) | Browse first | Typical role in the hero |
|---|---|---|
| Whole-hero starting point (any archetype) | **section · hero** (71) | Start from a complete OriginKit hero, then re-skin it to the design system and real copy |
| Shader / generative backdrop, full-bleed | **background-animation** (≈295) | The light behind everything; text sits in a quiet zone or on a backing |
| Statement + brand object, 3D | **animation** (≈100), **interactive-elements** (≈130) | One object tied to the logo or metaphor, lit, beside or behind the headline |
| Kinetic headline | **text** (≈90) | One animated slot or treatment on the h1, never the whole paragraph |
| Live demo / product UI | **interactive-elements**, **core** (≈60) | The working widget inside the product frame (stageshow for the frame) |
| Made-work collage | **image-gallery** (≈50), **image** (≈40) | Real outputs arranged with depth |
| The primary CTA (every archetype) | **button** (≈30), **border** (glow borders) | One distinctive, still clearly clickable primary action |

Search with the product's own nouns and mood, not the category's ("tidal ripple", "ink bloom", "terminal glow"),
and read each candidate's description and props before choosing.

## The signature rule

One **signature component** per hero: the thing a visitor remembers, chosen because it says something true
about the product (water caustics for a sea-freight tracker, a data-pixel arc for an analytics tool, a glass
dodecahedron for a dev tool about many sides of one system). Everything else stays quiet. Optional second and
third pieces: a text effect on one word, a distinctive primary button. Never three loud components competing.
Wire its props to the product's state where you can (hover, selected industry, live numbers), so it's part of
the product, not decoration.

## The modern-and-unique bar

A rebuild fails review if any of these are true:

- It could swap logos with a competitor and still work (the visual, copy or palette says nothing about *this* product).
- It shows the template tells: centred headline with one gradient word, purple/indigo glow, eyebrow pill,
  filled + ghost pair, grey logo strip, three icon cards, vague copy (evidence.md, The generic look).
- The signature component is decoration that the copy never connects to.
- The type is a default (Inter or system at 600 with no tracking decision), or set without the measured numbers
  in patterns.md.
- Motion is on everything, or nothing in the hero responds to the visitor.

And it should have: one signature visual, one decisive type choice (a display face or a deliberate weight and
tracking), colour taken from the product or its design system, and at least one moment that answers the
visitor (hover, a choice, a live value). Run **taste-skill** / **frontend-design** for direction and
**impeccable** `critique` on the result.

## Build rules

- A WebGL/canvas component is never the LCP: a real `<h1>` paints first; give the canvas a still fallback image
  or a flat background matching its first frame.
- Lazy-mount heavy scenes after first paint (`next/dynamic` with `ssr: false` and a still `loading`), pause them
  off-screen, cap DPR at 1.5, and drop them for `prefers-reduced-motion` and `Save-Data`.
- Text over a component needs a measured backing (blur-craft for glass); run hero-audit's contrast check on the
  real render, not the idea of it.
- Move installed component files next to the hero (self-contained), keep their props visible at the call site,
  and note any local patch in a comment.

## Quota etiquette

Adds are live deliveries. Browse and agree the pick with the user first; check the project (and its other
sections) for an already-installed copy before adding; add once; never add "to see what it looks like" when the
description and props already answer that.

## Without an account

Say that OriginKit isn't connected, build the visual in HTML/CSS (or the project's own components), and name the
OriginKit component that would replace it, with its link, so the user can add it later.

# OriginKit in the rebuild

Every rebuild is built **mostly from OriginKit components**, customised to the product: they are what makes a
revamped hero modern and unmistakably its own instead of another template. A connected OriginKit account is
required for the rebuild. **Contents:** Connect your account (required) · Pick by archetype · The composition
rule · The modern-and-unique bar · Build rules · Quota etiquette · Never publish OriginKit source

## Connect your account (required)

Each user connects **their own** OriginKit account. The skill never ships OriginKit code and never uses someone
else's key. The audit scripts (`hero-audit.mjs`, `hero-compare.mjs`) only measure and may be run standalone
without an account; the rebuild requires one.

**Check first** (step 0 of `SKILL.md`): run `npx originkit whoami`, or call the `originkit` MCP's `search` /
`list_components`. Either answering means connected; continue.

**If neither is connected, stop and guide the user, one step at a time.** Give one step, wait for them to say
it's done, then give the next. Do not rebuild a hero by hand instead.

1. **Account.** Create or sign in to an OriginKit account at https://www.originkit.dev.
2. **Install the CLI** in the project: `pnpm add -D originkit` (or `npm i -D originkit`).
3. **Log in.** The user runs `npx originkit login` in their own terminal. A browser sign-in opens; no API key
   is needed. Never ask them to paste a key or token into the chat.
4. **Verify.** `npx originkit whoami` prints the signed-in account. If it doesn't, repeat step 3.
5. **Or the MCP** (optional, instead of 2-4), with the user's own key, run by them:
   `claude mcp add -s local --transport http originkit https://mcp.originkit.dev/mcp --header "Authorization: Bearer <your key>"`.
   It's connected when its `search` / `list_components` tools answer.
6. **Re-check**, then continue with step 1 of the method.

**Troubleshooting:** a login that has expired → run `npx originkit login` again and verify. Quota reached →
browsing still works (free); propose fewer picks and add each once, or wait for the quota to reset.

**Using it:**

- **CLI:** browse with `npx originkit search "<words>"` and `npx originkit list` (free) · install with
  `npx originkit add <slug>` (**spends your quota**; presets as `--<name>`, e.g. `--dark`).
- **MCP:** `search` / `list_components` browse (free); `get_component` / `fetch` deliver (spend quota).
- Keep keys out of git.

## Pick by archetype

The catalog (about 950 items) is organised by kind and category. Start from the archetype the diagnosis chose
(`patterns.md`), then browse the matching categories:

| Archetype (patterns.md) | Browse first | Typical role in the hero |
|---|---|---|
| Whole-hero base (any archetype) | **section · hero** (71) | Start from a complete OriginKit hero, then customise it to the design system, real copy, data and motion speed |
| Shader / generative backdrop, full-bleed | **background-animation** (≈295) | The light behind everything; text sits in a quiet zone or on a backing |
| Statement + brand object, 3D | **animation** (≈100), **interactive-elements** (≈130) | One object tied to the logo or metaphor, lit, beside or behind the headline |
| Kinetic headline | **text** (≈90) | One animated slot or treatment on the h1, never the whole paragraph |
| Live demo / product UI | **interactive-elements**, **core** (≈60) | The working widget inside the product frame (stageshow for the frame) |
| Made-work collage | **image-gallery** (≈50), **image** (≈40) | Real outputs arranged with depth |
| The primary CTA (every archetype) | **button** (≈30), **border** (glow borders) | One distinctive, still clearly clickable primary action |

Search with the product's own nouns and mood, not the category's ("tidal ripple", "ink bloom", "terminal glow"),
and read each candidate's description and props before choosing.

## The composition rule

Build the hero **mostly from OriginKit components**, in one of two ways:

- **A hero section as the base:** one of the 71 hero sections, customised to the product; or
- **Composed:** a background, a 3D object, a text effect and a button from the catalog, arranged by you.

Every component is **customised to the product** (its copy, palette, data, motion speed), never dropped in
as-is. Hand-written code is limited to glue, layout and the product's real data.

The **signature moment** still comes from the product's truth: one piece carries it, chosen because it says
something true about the product (water caustics for a sea-freight tracker, a data-pixel arc for an analytics
tool, a glass dodecahedron for a dev tool about many sides of one system). Everything else stays quiet: a text
effect on one word, a distinctive primary button. Never three loud components competing. Wire the props to
the product's state (hover, selected industry, live numbers), so it's part of the product, not decoration.
The components are the material; what they do is the signature moment, designed with `signature.md`.

## The modern-and-unique bar

A rebuild fails review if any of these are true:

- It could swap logos with a competitor and still work (the visual, copy or palette says nothing about *this* product).
- It shows the template tells: centred headline with one gradient word, purple/indigo glow, eyebrow pill,
  filled + ghost pair, grey logo strip, three icon cards, vague copy (evidence.md, The generic look).
- A component is dropped in as-is (its demo copy, palette or speed), or the signature piece is decoration
  that the copy never connects to.
- The type is a default (Inter or system at 600 with no tracking decision), or set without the measured numbers
  in patterns.md.
- Motion is on everything, or nothing in the hero responds to the visitor.

And it should have: one signature visual, one decisive type choice (a display face or a deliberate weight and
tracking), colour taken from the product or its design system, and at least one moment that answers the
visitor (hover, a choice, a live value). The full taste review (template tells with alternatives, the swap
and density tests, depth details) is in `craft.md`. Run **taste-skill** / **frontend-design** for direction and
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

Browsing is free; adds are live deliveries that spend the user's quota. Propose the picks with their links and
why each fits, agree them with the user, then add each once. Check the project (and its other sections) for an
already-installed copy before adding; never add "to see what it looks like" when the description and props
already answer that.

## Never publish OriginKit source

Components fetched with the user's account are theirs to use in their product. They must not be republished
as standalone code in public repos, gists or demos. Showcases of OriginKit-built heroes use screenshots, video
and the measured reports, never the component code.

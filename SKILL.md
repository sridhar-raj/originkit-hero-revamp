---
name: originkit-hero-revamp
description: >-
  OriginKit Hero Revamp: rebuild an existing website hero (the first screen) in React / Next.js + Tailwind
  from OriginKit components customised to the product (requires the user's OriginKit account, connected
  through the CLI or MCP), so it looks premium, cinematic and unmistakably its own instead of templated,
  reads in seconds and loads fast, proven with a before/after report. Every revamp starts from 5-10 real hero
  references collected from Pinterest into a moodboard, judged and analysed for mood (palette, light, type,
  material, density), then designed as an original hero, never a copy. Fast by design: one quick audit, the
  moodboard, one direction checkpoint with stills, one build, at most two fix rounds, then the proof; and
  every revamp uses a composition and components the last ones did not. Use it whenever someone asks to redesign, revamp,
  refresh, modernise, fix or improve a hero, first screen, above-the-fold section or landing-page top, or
  says it looks generic, cheap, AI-made, templated, cluttered, slow or doesn't convert, even if they never
  say "hero" or "OriginKit".
---

# OriginKit Hero Revamp

Rebuild one hero so it stops a scroll: modern, futuristic and still enterprise-calm. A lit, atmospheric
product moment built from OriginKit components, inside a real product surface, with short sharp copy and one
clear action, designed from a moodboard of what good work looks like now. Then prove it with numbers.

The bar is the approved OriginKit X Post sections (section 01, "Iris AI assistant": a black stage, a
component lit like a product render, real light, small refined type) and the Lowfield case in `cases/`.
**Every result is compared side by side with that bar before anyone sees it.**

`<skill>` is this skill's folder. The scripts need Node 20+ and Playwright (Chromium) in the project.

## Time budget: about 55 minutes, one checkpoint

| Step | Budget | Waits for the user? |
|---|---|---|
| 0 Connect OriginKit | 1 min (longer only the first time) | only if not connected |
| 1 Look at the current hero | 5 min | no |
| 2 Moodboard: 5-10 Pinterest references, judged and analysed | 8 min | no |
| 3 Two directions as stills | 10 min | **yes: the one checkpoint** |
| 4 Build the chosen one | 20 min | no |
| 5 Look and fix (≤ 2 rounds) | 10 min | no |
| 6 Prove and hand over | 5 min | no |

Rules that keep it fast:
- **One checkpoint only** (step 3). Everything else runs without asking. If the user says "just do it",
  skip it and build direction A.
- **Read references on demand,** not up front. This file is enough to run a revamp; the references are for
  the question they name.
- **Run things in parallel:** the before-audit and the Pinterest collection run in the background while you
  read the page; the catalog is browsed, never fetched, until the pick is made.
- **No rebuild loops on taste:** a direction is agreed on stills before code, so the build is not redone.
  After two fix rounds, hand over with what is left named.
- **No extras unless asked:** no video, no slide deck, no evidence essay. The report from step 5 is enough.

## 0. Connect OriginKit (required)

Check the user's own account: `npx originkit whoami`, or an `originkit` MCP whose `search` answers. If neither
works, stop and guide them one step at a time (`references/originkit.md`): install (`pnpm add -D originkit`),
they run `npx originkit login` themselves, verify with `whoami`. Never ask for a key in the chat, and never
hand-build the hero instead.

## 1. Look at the current hero (5 min)

```bash
node <skill>/scripts/hero-audit.mjs http://localhost:3000 --out .hero/before --src app/(marketing)
```

One run at desktop and phone, about 10 s a page. Start it in the background and meanwhile **read the page
itself**: what the product is, who it's for, the one claim it can back, the real proof it already has, its
brand colours and fonts. Then look at the screenshots and write **five lines, no more**:

1. What it is, in plain words (the headline it should have had).
2. The single biggest problem you can see (clarity, look, speed or legibility), with the evidence.
3. What must stay: brand colours, logo, real claims, routes.
4. The product surface the hero will show (the screen, card, state or object a user would recognise).
5. Any fact you need and don't have (a real number, a real customer). **Never invent proof.**

Use `--proof` (5 runs, Slow 4G + 4× CPU, five widths) only in step 6, and only when the hand-over claims a
speed change.

## 2. Moodboard (8 min)

Collect 5-10 real hero references and turn them into a written board (`references/moodboard.md` has the
method and the table):

```bash
node <skill>/scripts/pinterest-refs.mjs "ai saas hero section dark" "futuristic website hero 3d" \
     "enterprise landing page hero" --count 10 --out .hero/refs --dark
```

Three queries from different angles (category + tone, mood or material, industry), `--dark` or `--light` from
the brand. Then:
1. **Judge:** open `.hero/refs/moodboard.jpg` and each reference full size; keep what is premium, reject the
   generic AI-template tells (purple glows, "Revolutionize…" headlines, chrome robot heads, stat rows). Keep 5+.
2. **Analyse** into `.hero/moodboard.md`: per reference, what makes it premium, ground and light, palette, type,
   composition, motion; then what the best share, the **borrow list** (mood only: palette direction, light,
   type attitude, material, density), the **never** list, and **our own composition** from the product.
3. **Never copy:** no reference's layout, imagery, copy or logo; the design takes traits from several. The
   references stay local in `.hero/` (add it to `.gitignore`).

## 3. Two directions as stills (10 min, the checkpoint)

Read `references/directions.md` and pick **two compositions that differ from each other and from the last
three revamps** in `<skill>/history.md`, each taking its mood from the board's borrow list. For each, choose the OriginKit pieces (browse with
`npx originkit search "<the product's nouns and mood>"`: free) and write a direction card:

```
A · <composition name>: <one sentence: what the visitor sees and why it's this product>
Stage: <ground, light, palette (3-5 hex from the brand)>     Type: <face, weight, size of the h1>
OriginKit: <slug> (hero piece, how it's customised) · <slug> (support) · <slug> (button)
Headline: "<≤ 8 words>"   CTA: "<verb + outcome>"
```

Show each with a picture: a quick static mock (an HTML file at 1440×900, the component's catalog poster
standing in for the live component), screenshotted with the audit's browser. Put A and B side by side and
ask which one, or what to change. Show the **moodboard beside them**, so the user sees where the mood came
from. This is the only question in the whole revamp, so ask the factual questions from step 1 here too.

## 4. Build (20 min)

- **Design system first:** a `DESIGN.md` or tokens in the project win over anything here.
- **The look:** `references/aesthetics.md`: type (weight 500-600, tracking −0.02 to −0.045em, one colour and one style by default; an accent word is a rare device, see aesthetics.md),
  OKLCH palette with one accent ≤ 5-8 % of pixels, light with a direction and consequences (key, rim, spill,
  contact shadow; no glow without a shadow), grain 2-6 %, hairlines, glass on the nav and at most one panel,
  at most 2 moving layers. Futurism lives in one layer; trust lives in the type, copy and real product.
- **Add only the agreed pieces,** once each (adds spend quota; check the project for installed copies first).
  Move them next to the hero so its folder is self-contained.
- **Customise every piece:** the brand palette, the product's real words, a motion speed that suits it,
  props wired to the UI's states (the orb thinks while the answer streams, the field brightens on hover).
  Never ship a component with its demo copy, colours or speed.
- **Build a real product surface around the hero piece,** not a showcase of it (`references/directions.md`,
  "Real surface").
- **Next.js rules:** `min-h-svh`; a real `<h1>` paints first and is the LCP, never the canvas; the hero image
  eager with `fetchPriority="high"` and `sizes`; WebGL lazy with a still first frame, DPR ≤ 1.5, off under
  reduced motion; next/font. Details in `references/nextjs.md`.
- **Copy:** headline ≤ 8 words with the key noun early; one subhead sentence (who, what, result); a CTA that
  names the outcome; real proof only. Formulas in `references/copy.md` if stuck.

## 5. Look and fix (≤ 2 rounds, 10 min)

Screenshot the new hero at **1440×900 and 390×844** (the audit does both). Put the 1440 shot **beside the
bar** (`cases/lowfield/after-desktop.jpg`, or the X Post section 01 capture if this machine has it) **and on the
moodboard**, and judge it honestly against the checklist in `references/directions.md` ("Before showing it")
and the moodboard check (`references/moodboard.md`, step 5): at or above the best references, the borrowed
mood present, and not mistakable for any one reference at thumbnail size. Run the **slop audit** in
`references/aesthetics.md` (3 or more tells = not ready). Fix the worst three
things, screenshot again, repeat once at most. Use the **ui-craft** skill's QA (`qa.mjs`) for layout bugs,
focus and overflow when it's installed.

If it still doesn't stand next to the bar after two rounds, say so plainly and say what's missing (usually:
the light, the type, or the hero piece is too small).

## 6. Prove and hand over (5 min)

```bash
node <skill>/scripts/hero-audit.mjs http://localhost:3000 --out .hero/after --src app/(marketing)
node <skill>/scripts/hero-compare.mjs .hero/before .hero/after
```

Use the same flags as the before run (add `--proof` to both only for a speed claim, on a production build).
`hero-compare.mjs` writes `.hero/after/report.html` (a before/after slider and the metrics) and prints a
Markdown table.

Hand over in a short reply: the before/after screenshots, the table, the OriginKit pieces used (linked),
what was measured versus judged, any WARN with its reason, and placeholders the user must fill. Then append
one line to `<skill>/history.md`: date, site, composition, palette, OriginKit slugs.

**Done means:** no FAIL; no metric worse without a reason; screenshots at both widths looked at; no invented
proof; built from customised OriginKit pieces; no OriginKit source published anywhere public (showcase with
screenshots and video only).

## Quick answers (no full revamp)

| The ask | Do |
|---|---|
| "Why is our hero slow?" | Step 1 with `--proof`, then `references/nextjs.md` |
| "The headline doesn't land" | `references/copy.md` |
| "It looks generic" | Step 1 screenshots + `references/directions.md` (tells and the bar) |
| "Text over our image is hard to read" | the audit's contrast lines, then the **blur-craft** skill |

## Files

| Path | What |
|---|---|
| `references/aesthetics.md` | **The look:** modern-futuristic-enterprise spec (composition, type, OKLCH palette, light, motion, nav/CTA/proof, building it performantly), the slop audit |
| `references/moodboard.md` | **Collecting and analysing references:** queries, judging premium vs tells, the analysis table, borrow list, the copy test |
| `scripts/pinterest-refs.mjs` | Pinterest search → 5-12 hero references, palette and tone each, a numbered `moodboard.jpg` |
| `references/directions.md` | **The look:** the bar, eight compositions, the real-surface rule, light recipes, tells, the pre-show checklist |
| `references/originkit.md` | Connecting, browsing for free, picking pieces, quota, never publishing source |
| `references/copy.md` | Headline formulas, subhead, CTA labels, proof ranked |
| `references/nextjs.md` | Images, fonts, video, WebGL, CLS, viewport units |
| `references/patterns.md`, `craft.md`, `decision-tree.md`, `signature.md`, `evidence.md` | Deep dives: measured type numbers, the full craft gate, archetype questions, designing a signature beat sequence, every rule's source. Open one only when its question comes up. |
| `scripts/hero-audit.mjs` | The audit (`--proof` = 5 runs, Slow 4G, 5 widths) |
| `scripts/hero-compare.mjs` | Before/after report |
| `scripts/test-audit.mjs` | The audit's own tests |
| `history.md` | One line per revamp, so the next one is different |
| `cases/` | Worked rebuilds; `lowfield` is the bar |

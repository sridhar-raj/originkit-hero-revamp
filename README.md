# OriginKit Hero Revamp

An agent skill (for Claude Code, Cursor and other agents that read `SKILL.md`) that rebuilds an **existing**
website hero in React / Next.js + Tailwind, built **mostly from [OriginKit](https://www.originkit.dev)
components** customised to the product, around **one signature moment**: a live, truthful product behaviour
in the visual slot. The result reads in seconds, looks premium and unmistakably its own, loads fast, and
**comes with before/after measurements**.

**[See the showcase](https://sridhar-raj.github.io/originkit-hero-revamp/)**: template heroes rebuilt and
measured, each from a different kind of bad first screen:

- [Lowfield](https://sridhar-raj.github.io/originkit-hero-revamp/cases/lowfield/report.html), a coffee subscription:
  "Roasted on Tuesday, at your door by Thursday", proved by the bag's own label. Split layout.
- [Nacre](https://sridhar-raj.github.io/originkit-hero-revamp/cases/nacre/report.html), a perfume sample set:
  "Watch a scent change on your skin", a ray-traced crystal whose inner light is the scent's dry-down.
  A centred stack with the notes and the readout either side of the object.

On a throttled phone connection (Slow 4G, 4× CPU, median of 3) the largest paint drops from 0.9-3.5 s to
0.31-0.33 s, the headline is the largest paint in every after, and every case ends with no failures and no
warnings at phone, tablet and desktop width. Each 3D object shows a still render of itself until the visitor
first moves, scrolls or taps (the globe also starts a few seconds after load), so the headline paints first.

## Requirements

- **Node 20+** and **Playwright** with Chromium in the project (`pnpm add -D playwright`, then
  `npx playwright install chromium`).
- **An OriginKit account, connected** through the CLI or the MCP (below).

The audit scripts only measure and run standalone without an account (see "Use it without an agent"); the
rebuild requires OriginKit.

## Connect OriginKit (required)

1. **Create or sign in to an OriginKit account** at [originkit.dev](https://www.originkit.dev).
2. **Install the CLI in your project:** `pnpm add -D originkit` (or `npm i -D originkit`).
3. **Log in:** run `npx originkit login`. A browser sign-in opens; no API key is needed.
4. **Confirm:** run `npx originkit whoami`. It prints the account you're signed in as.
5. **Optional, the MCP instead of the CLI**, with your own key:
   `claude mcp add -s local --transport http originkit https://mcp.originkit.dev/mcp --header "Authorization: Bearer <your key>"`
6. **Run the skill**, e.g. "Revamp the hero on our home page."

**If it isn't connected,** the skill stops before rebuilding anything and walks you through these steps, one
at a time. It never asks you to paste a key or token into the chat; you run the login yourself.

**Troubleshooting**

- *Login expired:* run `npx originkit login` again, then `npx originkit whoami`.
- *Quota reached:* browsing is free, and the skill proposes its picks for you to agree before it adds
  anything, so each component is added once. Agree fewer picks, or wait for your quota to reset.

## How it works

About 55 minutes for a revamp, with one question to you along the way.

1. **Look** (5 min): one quick audit at desktop and phone while the page is read for the product, its claim
   and its brand. The result is five lines, not an essay.
2. **Moodboard** (8 min): 5-10 real hero references collected from Pinterest (`scripts/pinterest-refs.mjs`:
   designer sources first, hero-shaped, high-resolution, palette and tone measured, a numbered moodboard), then
   judged (premium signals kept, AI-template tells rejected) and analysed across seven dimensions into a
   borrow list (mood only) and the hero's own concept. Never a copy: traits shared by 3+ references, at most
   one dimension from any single one, and the references stay local.
3. **Two directions as stills** (10 min, the one checkpoint): two compositions from a deck of eight, each
   taking its mood from the board, shown as mock screenshots beside the moodboard. You pick one.
4. **Build** (20 min) from the agreed OriginKit pieces, customised to the product, to a modern-futuristic-
   enterprise spec (`references/aesthetics.md`: type, OKLCH palette, light with consequences, one moving
   moment, a real product surface).
5. **Look and fix** (at most two rounds): screenshots beside the bar and on the moodboard, the slop audit, and
   the copy test.
6. **Prove** (5 min): the same audit again and a before/after report.

## Install

```bash
npx skills add sridhar-raj/originkit-hero-revamp
```

Or copy this folder into `.claude/skills/originkit-hero-revamp/` (Claude Code) or your agent's skills directory,
then connect OriginKit (see Requirements).

## Use it without an agent

The measuring scripts need no OriginKit account:

```bash
node scripts/hero-audit.mjs http://localhost:3000 --out .hero/before --src app --runs 5 --throttle --viewports 390x844,768x1024,1440x900
# …rebuild the hero…
node scripts/hero-audit.mjs http://localhost:3000 --out .hero/after --src app --runs 5 --throttle --viewports 390x844,768x1024,1440x900
node scripts/hero-compare.mjs .hero/before .hero/after     # writes .hero/after/report.html
```

Measure a production build (`next build && next start`): `next dev` inflates LCP and blocking time, and the
audit warns when it sees a dev server.

## What's inside

| Path | What it is |
|---|---|
| `SKILL.md` | The method: look → two directions → build → look and fix → prove, with a time budget and what "done" means |
| `references/moodboard.md` | Collecting and analysing references into an original design |
| `references/aesthetics.md` | The modern-futuristic-enterprise spec and the slop audit |
| `scripts/pinterest-refs.mjs` | Pinterest search → 5-12 hero references and a moodboard |
| `references/directions.md` | The look: the quality bar, eight compositions, the real-surface rule, light and type recipes, the pre-show checklist |
| `history.md` | One line per revamp (composition, palette, pieces), so the next one is different |
| `scripts/hero-audit.mjs` | The browser audit (Playwright/Chromium); writes `audit.json` and first-screen screenshots; `--proof` for the full speed measurement |
| `scripts/hero-compare.mjs` | The before/after report: slider, scorecard, metric table |
| `references/decision-tree.md` | Questions about the product's truth → 1-2 archetypes, and why not the others |
| `references/signature.md` | How to design the signature moment, with a worked example per archetype |
| `references/copy.md` | Headline formulas, subhead pattern, CTA labels, proof ranked, a template-to-literal rewrite table |
| `references/craft.md` | The craft gate, the browser proof matrix, template tells and their alternatives, swap and density tests |
| `scripts/test-audit.mjs` | The audit's own tests, with fixtures in `scripts/fixtures/` |
| `references/evidence.md` | Every rule with its source, tagged verified / standard / opinion / unverified (popular claims with no primary source are listed so nobody repeats them) |
| `references/patterns.md` | Archetypes and measured type, CTA and motion numbers from 14 live heroes (Linear, Vercel, Stripe, Raycast, Cursor, Resend, Framer, Clerk, Notion, Figma, Anthropic, Dia, Apple, Supabase) |
| `references/originkit.md` | OriginKit in the rebuild: connecting (required), categories by archetype, the composition rule, the modern-and-unique bar, WebGL build rules, never publishing source |
| `references/nextjs.md` | Next.js 16 + Tailwind v4: images (`priority` is deprecated), fonts, video, WebGL, CLS, `svh`, codemods |

## OriginKit in the rebuild

Every rebuild uses **your own** OriginKit account (see Requirements). Browsing is free; adding a component
spends your quota, so the skill proposes its picks with links and reasons, agrees them with you, then adds
each once.

Components fetched with your account are yours to use in your product, but must not be republished as
standalone code in public repos, gists or demos. Nacre was built with OriginKit
components, so this repo ships their screenshots, recordings and measured reports, not the component code;
Lowfield is plain HTML and CSS, so its live page is included.

## References it can research

- [Refero](https://refero.design) (real product screens and styles) through its MCP, when connected (paid plan).
- [GradientDeck](https://ui.gradientdeck.com) (free `DESIGN.md` files from 1,286 real sites) as a starting
  direction when a project has no design system, adapted rather than cloned, with unlicensed fonts swapped.

## Works well with

**ui-craft** for the build loop and QA gate (the skill summarises its essentials when it isn't installed),
[blur-craft](https://github.com/sridhar-raj/blur-craft) for glass and text over imagery, and, if you use them,
Chrome DevTools' `debug-optimize-lcp` and marketingskills' `copywriting` and `cro`.

## License

MIT

# OriginKit Hero Revamp

An agent skill (for Claude Code, Cursor and other agents that read `SKILL.md`) that rebuilds an **existing**
website hero in React / Next.js + Tailwind, built **mostly from [OriginKit](https://www.originkit.dev)
components** customised to the product, around **one signature moment**: a live, truthful product behaviour
in the visual slot. The result reads in seconds, looks premium and unmistakably its own, loads fast, and
**comes with before/after measurements**.

**[See the showcase](https://sridhar-raj.github.io/originkit-hero-revamp/)**: four template heroes rebuilt and
measured, each from a different kind of bad first screen:

- [Lowfield](https://sridhar-raj.github.io/originkit-hero-revamp/cases/lowfield/report.html), a coffee subscription:
  "Roasted on Tuesday, at your door by Thursday", proved by the bag's own label.
- [Ashgrove](https://sridhar-raj.github.io/originkit-hero-revamp/cases/ashgrove/report.html), a studio's kiln
  booking: "Fire one mug without waiting for a full kiln", with a live flame in the spy-hole.
- [Fennick](https://sridhar-raj.github.io/originkit-hero-revamp/cases/fennick/report.html), a keyboard maker:
  "Type on the Sixty before you buy it", a 3D board you can type on.
- [Saltmarsh](https://sridhar-raj.github.io/originkit-hero-revamp/cases/saltmarsh/report.html), a sailing school:
  "Sailing lessons that move when the wind does", with the sea driven by the forecast.

On a throttled phone connection (Slow 4G, 4× CPU, median of 3) the largest paint drops from 1.2-1.4 s to
0.32-0.55 s, and every case ends with no failures and no warnings at phone, tablet and desktop width.

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

1. **Measure** the current hero in a real browser, from phone to desktop width: LCP (its element and its
   breakdown), CLS, blocking time, when the CTAs become visible, headline length and contrast over the real
   backdrop, CTA size and labels, fonts, images, accessibility basics, frame timing, template tells, how dense
   the visual slot is, and Next.js traps in the source.
2. **Diagnose** in a fixed order: clarity, action, legibility, speed, distinctiveness, each tied to evidence.
3. **Rebuild:**
   - pick the archetype from the product's truth with a decision tree;
   - design the signature moment (one product state, 3-5 beats, a still for reduced motion);
   - build the hero mostly from OriginKit components (a hero section as the base, or backgrounds, 3D objects,
     text effects and buttons), each customised to the product's copy, palette, data and motion speed;
   - write the copy from a sourced kit (headline formulas, outcome CTAs, proof ranked by credibility, never
     invented);
   - pass a craft gate built on the [ui-craft](#works-well-with) loop: real product surfaces, quiet type, one
     moment of motion, checked at 360-1440 px in light and dark.
4. **Prove** it: the same audit again, then a before/after report with a slider, a scorecard and a Markdown
   table for the PR. Measured results and judgment calls are labelled as such.

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
| `SKILL.md` | The method: a quick path, measure → diagnose → rebuild → prove, and what "done" means |
| `scripts/hero-audit.mjs` | The browser audit (Playwright/Chromium); writes `audit.json` and first-screen screenshots |
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
standalone code in public repos, gists or demos. Ashgrove, Fennick and Saltmarsh were built with OriginKit
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

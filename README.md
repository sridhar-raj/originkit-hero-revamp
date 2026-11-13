# OriginKit Hero Revamp

An agent skill (for Claude Code, Cursor and other agents that read `SKILL.md`) that rebuilds an **existing**
website hero in React / Next.js + Tailwind around **one signature moment**: a live, truthful product behaviour
in the visual slot, built from an [OriginKit](https://www.originkit.dev) component. The result reads in
seconds, looks premium and unmistakably its own, loads fast, and **comes with before/after measurements**.

**[See the showcase](https://sridhar-raj.github.io/originkit-hero-revamp/)** and the
[coffee subscription rebuild](https://sridhar-raj.github.io/originkit-hero-revamp/cases/lowfield/report.html): a
template hero taken to "Roasted on Tuesday, at your door by Thursday", where the bag's own label proves the
promise. On a throttled phone connection (Slow 4G, 4× CPU, median of 3) the largest paint drops from 1.23 s to
0.32 s, and it goes from 6 failures and 50 warnings to none, at phone, tablet and desktop width.

## How it works

1. **Measure** the current hero in a real browser, from phone to desktop width: LCP (its element and its
   breakdown), CLS, blocking time, when the CTAs become visible, headline length and contrast over the real
   backdrop, CTA size and labels, fonts, images, accessibility basics, frame timing, template tells, how dense
   the visual slot is, and Next.js traps in the source.
2. **Diagnose** in a fixed order: clarity, action, legibility, speed, distinctiveness, each tied to evidence.
3. **Rebuild:**
   - pick the archetype from the product's truth with a decision tree;
   - design the signature moment (one product state, 3-5 beats, a still for reduced motion);
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

Or copy this folder into `.claude/skills/originkit-hero-revamp/` (Claude Code) or your agent's skills directory. The
scripts need Node 20+ and Playwright with Chromium in the project (`pnpm add -D playwright`).

## Use it without an agent

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
| `references/originkit.md` | OriginKit in the rebuild: your account, categories by archetype, the signature-component rule, the modern-and-unique bar, WebGL build rules |
| `references/nextjs.md` | Next.js 16 + Tailwind v4: images (`priority` is deprecated), fonts, video, WebGL, CLS, `svh`, codemods |

## Connect your OriginKit account

Every rebuild uses **your own** OriginKit account: `npx originkit login` (browser sign-in, no API key), or the
OriginKit MCP (`claude mcp add -s local --transport http originkit https://mcp.originkit.dev/mcp --header "Authorization: Bearer <your key>"`).
Browsing is free; adding a component spends your quota, so the skill proposes its picks and agrees them with
you first. Not connected? It still runs, builds the visual in HTML/CSS, and names the components to add later.
Nothing from OriginKit ships in this repo (the demo pages are plain HTML/CSS).

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

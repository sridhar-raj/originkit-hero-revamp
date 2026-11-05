# hero-revamp

An agent skill (for Claude Code, Cursor and other agents that read `SKILL.md`) that revamps an **existing**
website hero in React / Next.js + Tailwind, so it reads in seconds, looks like the product instead of a
template, loads fast, and **proves it with before/after measurements**.

**[See three measured rebuilds](https://sridhar-raj.github.io/hero-revamp/)**: an invoicing SaaS, a running app and a
developer CLI, each taken from the usual template hero to a rebuilt one. On a throttled phone connection the
largest paint drops from about 1.1-1.4 s to 0.22-0.24 s, and every case goes from 4 failures and 16 warnings to none.

## How it works

1. **Measure** the current hero in a real browser, at desktop and phone size: LCP (and which element it is),
   CLS, blocking time (medians over several runs, optionally on throttled Slow 4G + 4× CPU), the headline's
   length, lines, size and contrast over its real backdrop, the subhead, every CTA's size, label and contrast,
   media (lazy hero images, oversized files, video without `muted`/`playsInline`/poster), what still moves
   under reduced motion, first-load weight, and static Next.js traps in the source.
2. **Diagnose** in a fixed order: clarity, action, legibility, speed, distinctiveness, each tied to evidence.
3. **Rebuild** from an archetype that fits the product (10 measured from 14 live heroes: product UI, live demo,
   editorial type, brand object, full-bleed media, shader backdrop, made-work collage, kinetic headline,
   asymmetric split, quiet type), with type, CTA and motion numbers read from real sites.
4. **Prove** it: the same audit again, then a before/after report (HTML, plus a Markdown table for the PR).

## Install

```bash
npx skills add sridhar-raj/hero-revamp
```

Or copy this folder into `.claude/skills/hero-revamp/` (Claude Code) or your agent's skills directory. The
scripts need Node 20+ and Playwright with Chromium in the project (`pnpm add -D playwright`).

## Use it without an agent

```bash
node scripts/hero-audit.mjs http://localhost:3000 --out .hero/before --src app --runs 5 --throttle
# …rebuild the hero…
node scripts/hero-audit.mjs http://localhost:3000 --out .hero/after --src app --runs 5 --throttle
node scripts/hero-compare.mjs .hero/before .hero/after     # writes .hero/after/report.html
```

Measure a production build (`next build && next start`): `next dev` inflates LCP and blocking time, and the
audit warns when it sees a dev server.

## What's inside

| Path | What it is |
|---|---|
| `SKILL.md` | The method: measure → diagnose → rebuild → prove, and which companion skills to use for what |
| `scripts/hero-audit.mjs` | The browser audit (Playwright/Chromium); writes `audit.json` and first-screen screenshots |
| `scripts/hero-compare.mjs` | The before/after report |
| `scripts/test-audit.mjs` | The audit's own tests, with fixtures in `scripts/fixtures/` |
| `references/evidence.md` | Every rule with its source, tagged verified / standard / opinion / unverified (popular claims with no primary source are listed so nobody repeats them) |
| `references/patterns.md` | Archetypes and measured type, CTA and motion numbers from 14 live heroes (Linear, Vercel, Stripe, Raycast, Cursor, Resend, Framer, Clerk, Notion, Figma, Anthropic, Dia, Apple, Supabase) |
| `references/nextjs.md` | Next.js 16 + Tailwind v4: images (`priority` is deprecated), fonts, video, WebGL, CLS, `svh`, codemods |

## OriginKit (optional, your own account)

The visual slot can be an OriginKit component, fetched with **your own** account: `npx originkit login` (browser
sign-in) and `npx originkit add <slug>`, or the OriginKit MCP with your key. Adding spends your quota. Nothing from
OriginKit ships in this repo.

## References it can research

- [Refero](https://refero.design) (real product screens and styles) through its MCP, when connected (paid plan).
- [GradientDeck](https://ui.gradientdeck.com) (free `DESIGN.md` files from 1,286 real sites) as a starting
  direction when a project has no design system, adapted rather than cloned, with unlicensed fonts swapped.

## Works well with

[blur-craft](https://github.com/sridhar-raj/blur-craft) for glass and text over imagery, and, if you use them,
Chrome DevTools' `debug-optimize-lcp` and marketingskills' `copywriting` and `cro`.

## License

MIT

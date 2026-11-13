# The craft gate and the taste review

A hero can pass every measurement and still look like a template. This file is the gate for the other half:
premium, distinctive, and proven in a real browser. Tags as in `evidence.md`; almost everything here is
judgment [O], learned from rejected and approved builds, and should be reported as judgment.

**Contents:** Use ui-craft · The gate (ui-craft essentials) · Proof in the browser · Template tells and
alternatives · The swap test · The density test · Depth and craft details · Write the review

## Use ui-craft

**If the ui-craft skill is installed, use it** for the build and its QA gate (`qa.mjs`, `look.mjs`,
`motion-check.mjs`), and treat this file as the hero-specific layer on top. If it isn't installed, the six
steps below are its essentials; follow them as written.

## The gate (ui-craft essentials)

1. **The idea comes from the product's subject.** List 6-10 things only this product has: what it outputs,
   its objects, its numbers, its place, its rituals. Write one line: "On this hero, [something only this
   product has] becomes [the visual device]." Swap in a competitor; if the line still works, it's generic.
2. **References give mood only.** From a reference take mood, palette, one material or one device. Write
   down what you borrow and what your own composition is. If the result could be mistaken for the reference
   at thumbnail size, change the layout. (Research tools in SKILL.md are for this, never for cloning.)
3. **Real product surfaces with real data.** The visual slot holds the product doing its job (a list, a
   plan, a terminal, a map) with data that adds up: real-looking names, amounts, dates, units, statuses.
   No decorative showcase, no lorem, no skeleton bars, no browser frame around nothing.
4. **Quiet typography.** One display line (the h1). Subhead 15-20 px. UI text inside the visual 12-14 px.
   One family, or one display face plus one text face; two weights. A deliberate tracking and leading
   decision (`patterns.md` numbers). When it "looks big", scale the whole system down one step.
5. **One moment of motion.** The signature moment (`signature.md`) is the motion. Everything else is still,
   or settles once. No entrance choreography on every element.
6. **Proof in a real browser,** below. Not a mental render, not a code review.

## Proof in the browser

Look at the rendered hero at every width in this table, in light and dark when the site has both themes.
Use the audit's viewport option for the screenshots and numbers, ui-craft's `qa.mjs` and `look.mjs` when
installed, or a browser you can drive.

| Width | Why this width | What breaks here |
|---|---|---|
| 360 | small Android phones | headline wraps to 4+ lines, CTA below the fold, visual crushed |
| 390 | common iPhone size | the audit's default phone; the CTA and one proof line must be visible |
| 768 | portrait tablet | split layouts squeeze both columns; visuals shrink past legibility |
| 1024 | small laptop, landscape tablet | the visual overlaps the copy; the h1 clamp hits an awkward middle |
| 1440 | desktop | empty right side, a visual too small for its slot, lines too long |

At each width and theme, check:

- **States:** rest, hover and focus on the CTA (visible focus ring), the signature moment's end state, and
  reduced motion (`prefers-reduced-motion: reduce`). Every state, not just the first frame.
- **Layout:** no horizontal scroll, no clipped or overlapping text, labels in the visual don't collide.
- **Targets and contrast:** CTA at least 44 px tall (24 px is the WCAG floor) [K]; text at 4.5:1, large text
  3:1, measured over the real backdrop [K]; on glass or blur, the blur-craft skill's `glass-contrast.mjs`.
- **Smoothness:** while the moment runs, no long frames or visual jumps. The audit reports a short
  frame-timing sample; ui-craft's `motion-check.mjs` gives the detail. Fix stalls before style.
- **Your eyes:** open every screenshot. A number can't tell you the hero looks cheap.

## Template tells and alternatives

The template look is recognisable but not measured by any study [O] (`evidence.md`, The generic look). The
audit flags some of these automatically as distinctiveness heuristics; the rest need your eyes.

| Tell | Why it reads as a template | Modern alternative |
|---|---|---|
| One gradient word in the headline | the default emphasis of a thousand starter kits | no emphasis, or weight or the product's own colour on the key noun |
| Eyebrow pill ("New: …" in a rounded chip) | appears above every generated hero | put the news inside the product surface (a changelog row, a new badge on a real item), or drop it |
| Purple or indigo glow, mesh gradient | framework default colours, light from nowhere | light motivated by the product (its colour, a real light in the scene), or a quiet neutral ground |
| Centred headline with two equal buttons | no hierarchy, no direction | left-aligned split; one filled primary, the second as a text link |
| Grey logo strip of unknown or fake logos | proof nobody can check | real logos with permission, 4-6 at most, or one sourced number, or nothing (`copy.md`) |
| Empty visual: a blob, an orb, a tilted screenshot, a frame with skeleton bars | the slot is filled, nothing is said | the signature moment in a real product surface |
| Three icon cards right under the hero | filler that repeats the subhead | move them below the fold, or cut them |
| Tracked mono ALL-CAPS labels above every block | decorative "tech" tone | plain labels, or none |
| Big-number stat tiles | vanity numbers in boxes | a sentence with the numbers inline, sourced |
| A terminal mockup as decoration | a terminal that does nothing | only if it runs the product's real job (`signature.md`, Patchwork) |
| A default sans at 600 with no tracking decision | nobody chose it | any face is fine once size, weight, tracking and leading are decided (`patterns.md`) |

## The swap test

Put the nearest competitor's logo and name on the finished hero. Test the parts separately:

- **Headline:** would it still be true and natural for them?
- **Visual:** would it still make sense? A product surface showing your objects fails for them; an abstract
  shape works for anyone.
- **Palette and type:** would they look at home?

Two or more "yes" answers: it isn't distinctive yet. Change the part that passed for both.

## The density test

The visual slot must carry real, legible product detail, not just fill space. The audit reports a density
heuristic for the visual slot; confirm it by eye:

- At 1440, at 100% zoom, you can read at least three specific facts in the visual (a name, a number, a status
  or date) [O].
- Text inside the visual is at least 12 px at desktop; nothing is shrunk into texture [O].
- On phones, the visual is cropped to the part where the moment happens, not scaled down whole.
- The visual takes a real share of the first screen on desktop (roughly half or more in a split); a small
  product shot floating in a big empty area fails [O].
- The detail is the product's, and consistent: totals equal their parts, dates line up, units match.

## Depth and craft details

Small things that separate a premium hero from a competent one [O]:

- **Shadows:** one light direction for the whole hero. Two layers: a tight contact shadow and a soft ambient
  one, low opacity. On dark grounds, lift surfaces with a lighter fill and a faint top highlight instead of a
  black shadow.
- **Hairlines:** 1 px borders at low alpha in one colour across the hero; dividers instead of boxes where
  possible. Box only real objects (a window, a card that is a card in the product).
- **Type scale:** at most four sizes in the hero (display, subhead, UI text, small labels), on a consistent
  ratio. Numbers in UI use tabular figures.
- **Spacing rhythm:** one base unit (4 or 8 px). Tight inside groups, generous between them: the gap from
  subhead to CTA is larger than from headline to subhead.
- **Radii:** nested corners follow outer radius minus padding; one radius family for the hero.
- **Colour:** one accent, used for the primary action and the moment's key change. Everything else neutral.
- **Alignment:** the headline and the visual share an edge or a baseline on a grid; optical alignment for
  icons and quotes.
- **Both themes:** in dark, reduce shadow and raise surface lightness; in light, check hairlines are still
  visible and the accent still passes contrast.

## Write the review

End the rebuild with a short review in the reply or PR, each line marked as measured or judgment:

```
Craft gate: passed (ui-craft qa clean at 360/390/768/1024/1440, light + dark)       [measured]
Template tells: none left; removed gradient word, eyebrow pill, logo strip          [judgment]
Swap test: headline and visual fail for the nearest competitor                       [judgment]
Density: 5 legible facts in the visual at 1440; cropped to the reminder on phones   [judgment, audit density: …]
Smoothness: no long frames during the moment                                         [measured]
```

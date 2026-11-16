# Moodboard: collect, judge, analyse, then design something new

Every revamp starts from 5-10 real hero references, so the result is informed by what good work looks like
now, and is still original. The references set the **mood and the bar**; the composition, the idea and the
details come from the product.

## 1. Collect (3 min)

```bash
node <skill>/scripts/pinterest-refs.mjs "<category> hero section <tone>" "<mood> website hero" "<industry> landing page" \
     --count 10 --out .hero/refs [--dark | --light]
```

Queries: three, each from a different angle, in the words a designer would tag a shot with. Adding a material
or light word ("chrome", "volumetric light", "studio lighting", "frosted glass") gets past generic gradients:
- **category + tone:** "ai saas hero section dark", "fintech hero section light", "devtool landing page dark"
- **mood or material:** "futuristic website hero 3d", "cinematic product hero studio lighting", "editorial website typography", "webgl website", "swiss style website", "3d product website"
- **industry or audience:** "enterprise landing page hero", "b2b saas homepage", "luxury brand website"

Pick `--dark` or `--light` from the brand (keep its ground). The script keeps landscape, high-resolution,
hero-shaped shots, prefers Dribbble/Behance/Awwwards over template marketplaces, drops repins, and writes
`moodboard.jpg` (numbered, with palette chips) and `refs.json` (source, palette, brightness). Under 5 usable
references: broaden the queries and run again.

If Pinterest is rate-limited (it says so), wait 10 minutes or collect from Godly, Land-book or Awwwards by hand
into `.hero/refs/` and run the analysis the same way.

## 2. Judge (2 min): keep the good, name the bad

Open `moodboard.jpg`, then each reference full size. For each, one line: **keep** what is premium about it, or
**reject** it for its tells. Pinterest mixes great work with generic AI-template shots; the judgement is the
skill.

| Premium signals (borrow these) | Tells (never borrow these) |
|---|---|
| one big focal object or scene, lit with intent | purple-to-blue glow, a glowing orb or wave behind centred text |
| a real product surface with real data | "Revolutionize / Unlock / Supercharge / The future of" headlines |
| decisive type: one display line, deliberate tracking | eyebrow pill + gradient word + filled/ghost button pair |
| one palette, one accent used sparingly | stat row "40+ / 3M+ / 98%" with no source |
| depth from light, shadow and hairlines | generic chrome robot heads, faceless 3D humans, stock VR goggles |
| restraint: lots of quiet space around one idea | everything glowing, three effects competing |
| a composition that would still work as a still | a tilted dashboard screenshot as the whole idea |

Keep at least 5. Reject freely.

Also pull one or two from outside web design when the board converges (Pinterest feeds recycle the same
popular shots: "the reference trap"): product photography, automotive film stills, editorial print.

## 3. Analyse (3 min): a written board, not a copy plan

Seven dimensions per reference: **palette** (ground lightness, accent hue and its share), **type**
(classification, weight, size against the viewport, tracking), **composition** (focal point, text-to-visual
ratio), **light** (direction, falloff, temperature, shadow), **material** (matte, gloss, glass, grain),
**motion** implied (what moves, tempo), **density** (empty space, element count).

Write `.hero/moodboard.md` with this table, one row per kept reference, then the synthesis:

```
| # | What makes it premium (one phrase) | Ground & light | Palette (hex) | Type | Composition | Motion implied |
|---|---|---|---|---|---|---|
| 1 | a single lit screen in a dark hall | near-black, one cool key light, floor reflection | #010203 #09172a + cyan | white sans, 2 lines, tight | centred object, small type on it | slow light sweep |
| … |
```

Then:

```
Shared by the best: <traits that recur in 3+ of the kept references: that is the mood; a trait only one
reference has is that designer's signature, so leave it>
Borrow list (mood only, at most 4 abstract traits, at most one dimension from any single reference):
- palette direction: <e.g. near-black + one cold cyan accent at <10 % of the frame>
- light: <e.g. one key light from above, a floor pool, fine grain 3 %>
- type attitude: <e.g. tight, medium-weight sans, 2-line headline, small quiet subhead>
- material/texture: <e.g. glass with refraction, satin, brushed metal, film grain>
- density: <e.g. one object, 60 % empty space>
Never: <the tells seen on this board>
Concept: <one sentence tying the hero object to the product, before any styling>
Our own composition: <the layout and the hero object, from THIS product's truth (see aesthetics.md)>
Why it's not a copy: <which reference it is closest to, and the three things that differ>
```

## 4. Design from it (into step 2 of the skill)

- The two directions shown at the checkpoint each **take their mood from the board** and their composition from
  `directions.md` and the product. Show the moodboard next to the two direction stills, so the user sees where
  the mood came from.
- Map each borrowed trait to an OriginKit piece or a CSS technique (a light-curtain background for "beams from
  above", a glass object for "refraction", a text effect for "type that resolves").
- The product's real surface, words and data are the hero's content; nothing from a reference is reproduced
  (no copied layout, imagery, copy, logos or illustrations).

## 5. Check against it (in step 4)

Put the new hero's screenshot on the moodboard (it can be appended as tile 0) and ask:
1. Does it sit **at or above** the best references in quality?
2. Does it share the borrowed mood (palette direction, light, type attitude)?
3. **The copy test:** at thumbnail size, could it be mistaken for any one reference? If yes, change the layout.
4. Does it avoid every tell on the "never" list?

## Rules

- **Minimum 5 references, maximum 12.** Fewer is guessing; more is noise.
- **Mood, not layout.** Borrow palette direction, light, material, type attitude and density; never a
  reference's composition, imagery, copy or logo.
- **Synthesis, not selection.** Borrow only traits shared by 3+ references, at most 4, and at most one
  dimension from any single reference; if the design leans on one reference, it is a copy.
- **Keep the brand.** The brand's colours, fonts and claims beat the board.
- **Keep it local.** The references are other people's work: they stay in `.hero/refs/`, never in a commit,
  a repo, a demo or a published report. Showcase only the finished hero.

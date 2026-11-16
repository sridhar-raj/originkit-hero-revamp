# Directions: the look, and how to make each hero different

Read this in step 2. It replaces guessing: the bar, eight compositions to choose from, the rules that made
the approved work good, and the checklist every hero passes before anyone sees it.

## The bar

Two pieces of work were approved; everything else was rejected as "bad", "generic" or "same pattern".

| Approved | Why it worked |
|---|---|
| **X Post section 01, Iris AI assistant** (dark cinematic) | A black stage; one OriginKit component lit like a product render (spotlight rays, a colour spill, a floor pool, dust, vignette); the component *inside a working product* (the assistant's avatar, with a real prompt box and a streamed answer); small refined type (Switzer). |
| **Lowfield** (`cases/lowfield`, light editorial) | One real product object carrying real data (the bag's label, roast curve, roast stamp, delivery timeline); a huge confident headline with one accent word; a single warm palette from the product; a CTA with the price in it. |

What both share, and what every rejected hero lacked:
- **One hero object, big and lit,** taking 40-60 % of the first screen. Rejected heroes had small decoration.
- **It is the product working,** not a picture of the component and not abstract art.
- **Real, specific words and numbers** on that object (a roast date, a time, a name), never lorem or "Feature".
- **Decisive type:** one display line with a deliberate size and tracking, everything else small and quiet.
- **One palette from the brand, one accent.** No rainbow, no purple-blue AI gradient.

Rejected patterns to never repeat: a light SaaS split with a screenshot; a flat poster with giant type and
nothing else; a plain dark glow; three cards in a row; a globe or object that sits there as decoration;
every hero in a set using the same layout.

**Dark or light?** Follow the brand. A dark or neutral brand → dark cinematic (the default when unsure). A
brand that is clearly light and warm (food, retail, craft) → light editorial, Lowfield-style. Either way the
same five shared rules apply.

## Eight compositions

Pick two for step 2 that differ from each other **and from the last three lines of `history.md`**. Each
names its OriginKit categories (browse free with `npx originkit search`).

| # | Composition | What the first screen is | OriginKit, browse |
|---|---|---|---|
| 1 | **Lit object stage** | The hero object centred on a dark stage under a spotlight, floor reflection, headline small above or below. Iris-style. | 3D `animation`, `background-animation` (rays, dust), `button` |
| 2 | **Working surface** | A real product UI card (chat, composer, checkout, player) with the component living inside it as its state (avatar, progress, empty state); headline to one side. | `interactive-elements`, `core`, `text` |
| 3 | **Editorial + object** | A huge left-aligned headline with one accent word; the product object bleeding off the right, carrying real data. Lowfield-style. | `animation`, `image`, `border` |
| 4 | **Full-bleed world** | A full-screen scene (shader, landscape, field) that *is* the product's subject; copy sits in one quiet corner on a measured backing. | `background-animation`, `section · hero` |
| 5 | **Type is the hero** | The headline as the visual: a text effect fills, reveals or distorts the letters; a small real product detail anchors it. | `text`, `background-animation` (inside the letters) |
| 6 | **Portal** | The scene seen through a shape (arch, circle, tall pill, device outline) on a quiet ground; headline outside the frame. | `background-animation`, `image`, `animation` |
| 7 | **Horizon** | A band of light or motion across the lower third, like a sunrise or a signal; big headline above it, the CTA sitting on the line. | `background-animation`, `border`, `button` |
| 8 | **Deck in depth** | Real items (cards, tickets, records, receipts) stacked in perspective; the front one is live and answers hover; headline beside. | `image-gallery`, `interactive-elements` |

Whole-hero option: one of the 71 `section · hero` pieces as the base, customised fully (palette, copy,
speed, real data), counts as the composition it most resembles.

## Real surface

The component earns its place by doing a job in the product, and its props follow the UI's state:
- an AI tool's orb is the assistant's avatar and pulses while the answer streams;
- a shader field brightens under the plan the visitor hovers;
- a glass object refracts the colour of the variant picked below it;
- a progress ring is the real step count of the onboarding.

If the hero would still make sense with the component deleted, the component is decoration: move it.

## Light (dark stages)

Build light in layers, each a separate element, so it reads as a photographed product:
1. a near-black ground (`#07070a`, never pure `#000` across the whole page);
2. a key light: a soft radial or ray component above or behind the object;
3. a colour spill from the brand accent at 10-20 % on one side;
4. a floor pool or reflection under the object;
5. fine dust or grain ≤ 5 %, and a vignette.

OriginKit canvas tricks that keep layers clean: a WebGL piece with an opaque background gets
`background="#000000"` and `mix-blend-mode: screen` on its wrapper, so only its light lands on the layers
below; never let a canvas edge sit on a flat CSS field (colours never match exactly): cover the frame or
screen-blend it.

Light stages (Lowfield) use the same idea softly: a warm ground, a soft shadow under the object, one
sun-like gradient, never a flat white page.

## Type

Full spec (with palette, light, motion and the slop audit): `aesthetics.md`.


- One display line: 64-88 px at desktop (`clamp(2.5rem,6vw,5.5rem)`), weight 500-600 (700+ reads "poster"), tracking −0.02 to −0.045 em, leading
  0.95-1.05, `text-balance`. Everything else 14-18 px.
- One face with character (Switzer, Geist, Satoshi, General Sans, Instrument Serif for an editorial accent);
  not default Inter at 600. The brand's font wins when it has one.
- One accent: a colour or italic on **one** word, never a gradient word.

## Before showing it (the pre-show checklist)

Put the 1440 screenshot beside the bar and answer each honestly. Fix every "no" you can in two rounds.

1. Would it sit next to X Post 01 or Lowfield without looking weaker? (If not: usually the light, the type,
   or the hero object is too small.)
2. Is the hero object 40-60 % of the screen and clearly the product working?
3. Cover the logo: could a competitor use this hero unchanged? It must be no.
4. Does it read in 5 seconds: what it is, for whom, what to click?
5. Real words and numbers on the object, nothing invented, nothing placeholder?
6. One palette, one accent, no purple-blue gradient, no eyebrow pill, no filled + ghost button pair, no grey
   logo strip, no three icon cards?
7. Is it a different composition, palette and component set from the last three in `history.md`?
8. At 390 px: headline ≤ 4 lines, CTA visible without scrolling, object still visible (cropped on purpose,
   not squashed)?
9. Does something answer the pointer (hover, a choice, a live value), eased, and is it calm with no pointer?

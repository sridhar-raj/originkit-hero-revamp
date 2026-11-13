# The signature moment

The signature moment is the one thing the hero does that only this product could do. It is a live,
truthful product behaviour shown in the visual slot: an invoice that sends its own reminder, a run plan that
reshapes when you say your legs are sore, a nightly agent that opens one tidy pull request. A visitor should be
able to describe the product from the moment alone.

It is not a decoration, a background effect or a demo of the component library. The OriginKit signature
component (`originkit.md`) is often the material it's built from; the moment is what that material *does*.

Everything here is judgment [O] unless tagged. The accessibility and LCP rules are standards [K].

**Contents:** Design it in five steps · The rules · Worked examples by archetype · Build notes · Review

## Design it in five steps

1. **Start from the headline's claim.** Write the claim as a verb: "chase", "adapt", "merge", "survive".
   The moment shows that verb happening. If the headline has no verb you can show, fix the copy first
   (`copy.md`).
2. **Pick the product state that proves it.** One surface (a list, a plan, a terminal, a map), one object in
   it (an invoice, a run, a pull request), one change. Use realistic data: names, amounts, dates and units
   that add up.
3. **Write it as 3-5 beats.** Each beat is a state, not an animation. Example: *Overdue 6 days* → *Reminder
   drafted* → *Sent politely, 09:12* → *Paid*. If it needs more than five beats, it's a tour, not a moment.
4. **Choose the end state.** The last beat is the still: what shows under reduced motion, before the
   script loads, and in the screenshot. It must make sense on its own.
5. **Set the timing.** Hold each beat long enough to read (about 1-2 s for a short label); transitions fast
   (150-400 ms); a pause before any loop. The whole moment should be readable in one pass of under ten
   seconds (the time NN/g gives the value proposition, see `evidence.md`).

## The rules

- **It connects to the headline's claim.** Read the headline, watch the moment: they should say the same
  thing. A moment the copy never mentions is decoration.
- **It is truthful.** It does what the product does, at the speed it does it (or says when time is
  compressed: "overnight" on a clock, "3 days later" on a label). No feature that isn't shipped.
- **It runs once, or loops calmly.** Play once on load and rest on the end state; or loop with a long pause
  (several seconds) between passes. Anything moving for more than 5 s needs a pause control (WCAG 2.2.2,
  Level A) [K]. Never cycle under 2 s.
- **It reduces to a still under reduced motion.** With `prefers-reduced-motion: reduce`, show the end state
  with no movement, or step through beats only on request [K]. Motion triggered by the visitor's own
  interaction should also be removable (WCAG 2.3.3, Level AAA) [K].
- **The LCP is not the animated element.** The `<h1>` (or a poster image) paints first, at full opacity,
  in the HTML. The moment starts after first paint and never starts the LCP element at `opacity: 0`
  (`nextjs.md`, Entrance motion) [K]. A `<canvas>` never counts as LCP, so a WebGL moment needs real text
  or a still beside it.
- **The CTA is usable before the moment ends.** The audit measures when the actions become visible; don't
  gate the button behind the animation.
- **It is legible at phone width.** On a phone, crop to the part of the surface where the change happens,
  rather than shrinking the whole surface until nothing is readable.
- **It is smooth.** Animate `transform` and `opacity`; no layout-changing properties mid-loop. Check frame
  timing while it runs (`craft.md`, Proof in the browser).
- **Optional: the visitor can take over.** A chip to pick, a value to drag, a replay button. Taking over
  stops the autoplay for good.

## Worked examples by archetype

The first three are the measured cases in `cases/`. The rest are patterns to adapt, with invented product
types; never copy their numbers into a real hero.

| # | Archetype | Product | Headline claim | The moment (beats) | Still / reduced motion |
|---|---|---|---|---|---|
| 1 | Product UI | Invoicing for freelancers (Ledgerly case) | "Invoices that chase themselves." | In a real invoice list, one row turns *Overdue 6 days* → a polite reminder drafts itself in a side panel → *Sent 09:12* → three days later the row turns *Paid* | The list with the reminder sent and the row paid |
| 2 | Live demo | Running plans (Tideline case) | "Runs that adapt to how your legs feel today." | Chips *Fresh · A bit stiff · Sore*; *Sore* is chosen → tomorrow's 10 km tempo becomes a 6 km easy run → the week's load bar rebalances | The reshaped week with *Sore* selected |
| + | Live demo, dev tool, agent-native CTA | Overnight maintenance agent (Patchwork case) | "Small fixes, merged while you sleep." | A terminal clock runs 01:58 → 04:10: picks up a flaky test, a lint error and a dependency bump → CI green → *1 pull request opened* | The finished session and the one PR summary |
| 3 | Editorial type | A style checker for documentation teams | "Your docs, in one voice." | Inside the headline's own sentence, one off-brand word gets a tracked-change underline → the suggested word replaces it | The corrected sentence with a faint change mark |
| 4 | Brand object | Object storage replicated across regions | "Storage that shrugs off a region outage." | The logo-shaped object is made of three lit segments (one per region) → one segment dims → the object stays whole and a counter keeps reading writes | All three segments lit, counter static |
| 5 | Full-bleed media | A bike rear light that reacts to traffic | "A rear light that gets brighter when cars get close." | Dusk footage from behind a rider → headlights approach → the light visibly steps up in brightness → settles when the car has passed | The poster frame with the car close and the light at full brightness |
| 6 | Shader backdrop | Sea-freight tracking | "Know where every container is, even mid-ocean." | Water caustics whose drift follows the vessel's heading → a container pin advances along its route → the ETA label updates once | The pin on route with the current ETA |
| 7 | Made-work collage | A photo-book maker | "Drop in your photos. Get a book worth keeping." | Among real customer spreads, one tile starts as loose photos → they settle into a laid-out spread with a caption | The collage with that spread finished |
| 8 | Kinetic headline | Shift scheduling for several industries | "Rotas for clinics / kitchens / warehouses." | The slot word changes → the rota preview below changes with it (roles, hours, the one gap it fills) in the same transition | The first industry, fully filled |
| 9 | Asymmetric split | Expense capture for small teams | "Receipts become expense lines before you leave the café." | A receipt photo on the right → its fields lift into an expense line → category and policy check tick → *Ready to approve* | The finished expense line beside the receipt |
| 10 | Quiet type | A well-known weather app | "Rain at your door, to the minute." | A small h1 over a large radar surface; a rain band moves toward a pinned street → the label reads *Rain in 12 min* | The radar with the band and the label |

What the good ones share: one object changes, the change is the product's job, and the end state still
reads as a screenshot.

## Build notes

- Drive the beats from one small state machine (an array of states and a timer), not from a pile of
  independent animations. It makes the still, the replay and reduced motion trivial.
- Use Motion (Framer Motion) as the project's motion library; `useReducedMotion()` picks the still.
- Start the moment after first paint (an effect, or idle), never in the critical path of the LCP.
- If the moment is built from an OriginKit component, wire its props to the beats (heading, intensity, a
  live value), and give it the WebGL build rules in `originkit.md`.
- Reserve the space of every beat up front (fixed heights, `tabular-nums` for numbers) so nothing shifts
  layout: CLS counts shifts that aren't caused by input [K].

## Review

Ask a stranger (or yourself, cold) to watch it once with the headline covered: can they say what the product
does? Then check each rule above, and the craft gate in `craft.md`. A moment that fails the headline test is
replaced, not polished.

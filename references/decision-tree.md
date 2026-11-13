# Choosing the archetype from the product's truth

The archetype is decided by what the product really is, not by what looks good this year. Answer the
questions below in order, about the product, not the current hero. Stop at the first "yes" that gives you an
archetype, then check the next one or two questions for a fallback. The archetypes are numbered as in
`patterns.md`. This tree is judgment [O], built from the "Fits" and "Fails as" columns there.

**Contents:** The questions · Write the decision down · Why not the others · Modifiers

## The questions

1. **Is the value a behaviour you can show in under ten seconds?** (it drafts, adapts, merges, sorts,
   reroutes, answers)
   → **2 Live demo.** Fallback: **1 Product UI** frozen at the most telling moment.
2. **Does it have a UI worth showing?** Real screens a customer would recognise, legible at hero size,
   with data that can be realistic and specific.
   → **1 Product UI.** Fallback: **9 Asymmetric split** with the UI cropped to its best panel.
   *No, the UI is a settings page or a login:* go on.
3. **Is it physical?** (hardware, food, a place, clothing, a vehicle)
   → **5 Full-bleed media** (real photography or video). Fallback: **4 Brand object** when it is one
   object you can light and turn.
4. **Is it a developer tool with a CLI, an API or an agent integration?**
   → **2 Live demo** as a terminal or an agent session doing the real job, with the **agent-native CTA**
   modifier. Fallback: **1 Product UI** if it also has a dashboard people live in.
5. **Do people make things with it?** (creative tools, marketplaces, publishing, portfolios)
   → **7 Made-work collage** of real outputs. Fallback: **2 Live demo** of one output being made.
6. **Is it infrastructure or abstract, with nothing to see?** (storage, networks, security, payments rails)
   → **4 Brand object** tied to the logo or a true metaphor, or **6 Shader backdrop** whose motion is
   driven by a real number. Fallback: **3 Editorial type** with one live figure.
7. **Does it serve a few clearly different audiences or uses?**
   → **8 Kinetic headline** with one slot, and the visual changes with it. Fallback: **9 Split** with a
   tabbed visual.
8. **Is the brand already well known, or is every competitor a sans-serif with a screenshot?**
   → **10 Quiet type** over a strong visual, or **3 Editorial type**. Fallback: the archetype the earlier
   answers pointed to, set with a more decisive type choice.

**9 Asymmetric split** is the default layout for most B2B answers above: copy about 40%, visual about 60%.
Treat it as the frame the chosen archetype sits in, not a reason by itself.

## Write the decision down

Put three lines in the diagnosis, before any build:

```
Archetype: 2 Live demo (fallback 1 Product UI)
Because: the value is that tomorrow's run changes when you say you're sore; that is a behaviour, not a screen.
Why not: 5 (no physical product), 7 (users don't make things), 6 (a shader says nothing about running plans).
```

If you can't fill in "Because" with a fact about this product, you picked from taste, not truth. Go back to
question 1.

## Why not the others

Use this to fill in the "Why not" line. Each archetype has a common wrong reason for choosing it.

| Archetype | Reject it when | The wrong reason people pick it |
|---|---|---|
| 1 Product UI | the UI is generic (tables any tool has), not legible at hero size, or has no realistic data yet | "Everyone shows a screenshot" |
| 2 Live demo | the behaviour takes minutes, needs the visitor's own data to make sense, or can't be shown truthfully in a loop | "Motion converts" (no source says so) |
| 3 Editorial type | there is no distinctive face licensed, or the words are long; a weak sentence set large is still weak | "Big type looks premium" |
| 4 Brand object | the object has no link to the logo or a true metaphor; it would be a random 3D shape | "3D is modern" |
| 5 Full-bleed media | there is no art-directed footage, only stock; or text would sit on a busy region | "Video feels expensive" |
| 6 Shader backdrop | the motion can't be tied to anything real, or the palette would be a default purple-blue | "It fills the empty right side" |
| 7 Collage | there are fewer than six strong real outputs, or they'd need inventing | "Grids look busy and successful" |
| 8 Kinetic headline | one audience, one use; the rotating word adds nothing the subhead couldn't | "Typewriter effects are fun" |
| 9 Split | the visual is weaker than the copy (then it's 3 or 10) | it's the template default |
| 10 Quiet type | the brand is unknown, or the visual underneath is weak | "Minimal is premium" |

## Modifiers

- **Agent-native CTA:** for developer and agent-facing products only. The primary action hands off to the
  visitor's agent ("Copy the prompt"), with a visible preview of exactly what gets copied.
- **Dark and light:** if the site has both themes, the archetype must work in both. A shader or lit object
  that only works on black is a reason to choose another archetype, or to design the light theme on purpose.

Then design the signature moment for the chosen archetype: `signature.md`.

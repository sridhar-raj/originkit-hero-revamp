# Building the hero in Next.js (App Router) + Tailwind v4

Checked against Next.js 16 docs (November 2026). **Contents:** What becomes LCP · The hero image · Fonts and
text LCP · Video heroes · WebGL, canvas and 3D heroes · Layout shift · Height on phones · Entrance motion ·
Codemods to apply

## What becomes LCP

`<img>`, SVG `<image>`, a `<video>` poster or first frame (Chrome 116+), CSS `background-image: url()`, and
block-level text. **A `<canvas>`/WebGL never counts**, nor images at `opacity: 0` or low-entropy ones (blur
placeholders, flat gradients). So a photo hero's LCP is the photo; a canvas or gradient hero's LCP is the
headline or subhead. Good LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms (p75). LCP time splits roughly into TTFB ~40%,
load delay < 10%, load ~40%, render delay < 10%. https://web.dev/articles/optimize-lcp

## The hero image

```tsx
import Image from "next/image";
import hero from "./hero.jpg";          // static import: width/height and blur placeholder for free

<Image src={hero} alt="Ledgerly's invoice list, three paid and one overdue" fill sizes="(min-width: 1024px) 50vw, 100vw"
  fetchPriority="high" loading="eager" placeholder="blur" className="object-cover" />
```

- **`priority` is deprecated since Next.js 16**, replaced by `preload`. The docs: "In most cases, you should use
  `loading="eager"` or `fetchPriority="high"` instead of `preload`." Use `preload` only when one image is the
  LCP at every width, never with `loading`/`fetchPriority`, never with art direction. https://nextjs.org/docs/app/api-reference/components/image
- `loading` defaults to `lazy`: **never leave the hero image lazy.**
- `fill` (or a responsive width) **requires `sizes`**, or the browser assumes `100vw` and downloads the biggest file.
- Formats: `images: { formats: ["image/avif", "image/webp"], qualities: [60, 75] }` in `next.config` (order
  matters; `qualities` is required in v16). AVIF is ~20% smaller, slower to encode on first request.
- A CSS `background-image` hero is invisible to the preload scanner (discovered late). Prefer `<Image fill>`
  with `object-cover`; only preload (`ReactDOM.preload(url, { as: "image", fetchPriority: "high" })`) if a trace
  shows late discovery.
- The blur placeholder helps perceived speed, not LCP (it's low-entropy, so not a candidate).

## Fonts and text LCP

```ts
// app/fonts.ts
import localFont from "next/font/local";
export const display = localFont({ src: "./Display-Var.woff2", variable: "--font-display", display: "swap" });
```
```css
/* globals.css (Tailwind v4) */
@theme inline { --font-display: var(--font-display); }
```

- next/font self-hosts, preloads and, with `adjustFontFallback` (default), generates a size-adjusted fallback:
  most swap layout shift disappears. Never link Google Fonts CSS (render-blocking).
- `display: "swap"` paints text at once (good for text LCP). `"optional"` removes the swap entirely, but a cold
  visit may never show the brand font; use it when CLS from the swap is still too high.
  https://nextjs.org/docs/app/api-reference/components/font

## Video heroes

```tsx
<video className="absolute inset-0 size-full object-cover" autoPlay muted loop playsInline preload="none"
  poster="/hero-poster.avif" aria-hidden="true">
  <source src="/hero.av1.webm" type='video/webm; codecs="av01.0.05M.08"' />
  <source src="/hero.h264.mp4" type="video/mp4" />
</video>
<button aria-pressed={!playing} onClick={toggle}>…Pause…</button>
```

- The **poster is the LCP**: small AVIF/WebP, preload it if it is. `muted` + `playsInline` are required for
  autoplay (iOS). Strip the audio track.
- Budget (informal): ≤ 1-2 MB for a 6-10 s loop, ≤ 720p on phones; a still on `Save-Data` or slow connections.
- **Over 5 s of motion needs a visible pause control** (WCAG 2.2.2). Under `prefers-reduced-motion` don't autoplay:
  show the poster (Framer Motion: `useReducedMotion()`).
- Never put the message only in the video.

## WebGL, canvas and 3D heroes

```tsx
const Scene = dynamic(() => import("./Scene"), { ssr: false, loading: () => <Image src={still} alt="" fill className="object-cover" /> });
```

- The canvas is decoration: real text (and a still) carry the LCP. Mount the scene after idle or first
  interaction; keep three.js out of the critical chunk (watch long tasks / TBT).
- Static fallback on reduced motion, no WebGL2, `Save-Data`, low `navigator.deviceMemory`.
- Pause off-screen (IntersectionObserver, `visibilitychange`; R3F `frameloop={inView ? "always" : "never"}`).
- Cap DPR at 1.5 (`dpr={[1, 1.5]}` or `setPixelRatio(Math.min(devicePixelRatio, 1.5))`).
- OriginKit WebGL backgrounds follow the same rules: see the studio notes in SKILL.md.

## Layout shift

- Reserve space for everything that loads: `width`/`height` or `aspect-ratio` on media, fixed-height slots
  for rotating words and badges; announcement bars and cookie banners as overlays, not pushed in.
- No `useEffect`-driven layout changes in the hero (hydration-time shifts count toward CLS; shifts within
  500 ms of user input don't).

## Height on phones

`min-h-svh` (100svh) for heroes: stable, fits with the toolbar showing. Not `h-screen`/`100vh` (on phones it's
the *large* viewport: the CTA hides under the toolbar). `dvh` resizes while the toolbar collapses (reflow,
jank): only where it must follow the toolbar. Baseline since 2023. https://web.dev/blog/viewport-units

## Entrance motion

Never start the headline at `opacity: 0` and fade it in on hydration: LCP waits until it's visible. Start
visible and animate `transform` (a short rise or scale), or reveal with a mask/clip that leaves the text
painted. Respect `prefers-reduced-motion`. In this studio, motion is Framer Motion.

## Codemods to apply

| Find | Replace with |
|---|---|
| `<Image … priority>` | `fetchPriority="high" loading="eager"` (or `preload` for a single, fixed LCP image) |
| `<Image fill>` without `sizes` | add `sizes` matching the layout |
| `loading="lazy"` on the hero image | remove it (`loading="eager"`) |
| `h-screen`, `min-h-screen`, `100vh` on the hero | `min-h-svh` / `h-svh` |
| `<video autoPlay>` missing `muted`/`playsInline`/`poster` | add all three + a pause button |
| Google Fonts `<link>` | `next/font` |
| `initial={{ opacity: 0 }}` on the `<h1>` | `initial={{ y: 12 }}` (stays painted) |
| a carousel/slider in the hero | one message; move the other slides below |

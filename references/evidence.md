# What the evidence says about heroes

Every rule the skill applies, with its source. Checked November 2026. Tags: **[V]** confirmed against the
primary source; **[S]** seen in excerpts or reputable secondary write-ups; **[K]** an established standard;
**[O]** practitioner opinion; **[U]** popular but unverified: never cite these as fact to a client.

**Contents:** First screen · Headline and subhead · CTA · Imagery, video, carousels · Hierarchy and legibility · Accessibility · Mobile · The generic look · Unverified claims

## First screen

- **The value proposition has about 10 seconds.** NN/g: the first 10 s decide whether people stay; leaving
  only levels off after ~30 s. "To gain several minutes of user attention, you must clearly communicate your
  value proposition within 10 seconds." [V] https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/
- **The fold still matters.** NN/g 2018 eyetracking (120 people, 130k+ fixations): 57% of viewing time above the
  fold, 74% in the first two screens; attention falls from the top of the first screen to its bottom. Put
  top-priority content and the main CTA in the first screen; avoid "false floors" (a screen that looks
  finished). [V] https://www.nngroup.com/articles/scrolling-and-attention/
- **The look is judged before the words.** Lindgaard et al. 2006: appeal ratings at 50 ms correlate highly with
  ratings at 500 ms. [S] https://www.tandfonline.com/doi/abs/10.1080/01449290500330448
- **Simple and familiar wins first impressions.** Tuch et al. 2012 (Google/Basel, 119 sites): low visual
  complexity and high prototypicality (looks like a site of its kind) were rated most appealing; complexity
  mattered at 17 ms. [V] https://research.google/blog/users-love-simple-and-familiar-designs-why-websites-need-to-make-a-great-first-impression/
  **Consequence for the skill:** keep conventional *structure* (headline, one line of what it is, one action,
  proof); make the *styling and content* specific. Unfamiliar layouts are a cost, generic styling is the problem.
- **The first screen answers: what is it, who is it for, what do I do next.** NN/g homepage guideline #1:
  "Start the page with a tagline that summarizes what the site or company does." #4: clear starting points
  for the 1-4 main tasks. [V] https://www.nngroup.com/articles/top-ten-guidelines-for-homepage-usability/

## Headline and subhead

- **Specific and literal beats clever.** NN/g: a tagline matters most when the brand name doesn't say what users
  get. [V] MarketingExperiments: a customer-outcome headline replacing a company-centric one lifted free trials
  103% (single A/B test, directional). [S] https://marketingexperiments.com/?p=22070
- **Plain words convert better.** Unbounce 2024 benchmark (41,000+ pages, 57M conversions): median conversion
  11.1% at a 5th-7th grade reading level, 7.1% at 8th-9th, 5.3% at college level (correlational). [S]
  https://unbounce.com/conversion-benchmark-report/
- **Key words first.** NN/g: the first ~11 characters of a link carry the scent; heroes borrow this as a
  heuristic (lead with the noun the visitor came for). [S] https://www.nngroup.com/articles/first-2-words-a-signal-for-scanning/
- **Length: no study sets an ideal word count.** [U] Working heuristic used by the audit: one line on desktop,
  at most 2-3 on a phone; warn above 12 words. Subhead: one sentence, warn above 30 words, 60-75 characters a line.

## CTA

- **It must look clickable.** NN/g eyetracking: weak signifiers (flat or ghost buttons) cost 22% more time and
  ~25% more fixations. A ghost button is fine as the secondary action, never the primary. [V]
  https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/
- **One primary action; any second one visibly weaker.** Follows from the 1-4 starting points and first-screen
  attention. No rigorous study on "1 vs 2 CTAs". [U for any lift figure]
- **The label names the outcome** ("Start free trial", "Get the app"), not "Submit" or "Learn more". The famous
  "'my' beats 'your' +90%" has no primary source. [U]
- **Contrast and size.** Label 4.5:1 (WCAG 1.4.3); button boundary 3:1 against its surroundings (1.4.11); targets
  at least 24×24 px (2.5.8, AA), 44 px recommended (Apple 44 pt, Material 48 dp). [K]
- **Proof next to the action.** Spiegel Research Center: 5 reviews vs none ≈ 270% higher purchase likelihood,
  most of it from the first 5-10; all-5-star ratings breed doubt (product-page data; applying it to a hero rating
  or logo row is an inference). [S] https://spiegel.medill.northwestern.edu/

## Imagery, video, carousels

- **Show the real product or real people.** NN/g: users ignore generic stock people and purely decorative images;
  they study images that carry information. [S] https://www.nngroup.com/articles/photos-as-web-content/
- **No rotating hero carousel.** Notre Dame data: ~1% of visitors clicked the carousel; 84% of those clicks were
  slide 1. [V] https://erikrunyon.com/2013/01/carousel-stats/ NN/g: an auto-rotating panel was visible ~20% of the
  time; advance only on request. [V] https://www.nngroup.com/articles/auto-forwarding/ Baymard: if you must, 5-7 s a
  slide, pause on hover, stop forever after any interaction, no auto-rotation on mobile. [S] https://baymard.com/blog/homepage-carousel
- **Background video:** muted (browsers block sound autoplay), `playsinline` (iOS), a poster, a pause control if
  it runs past 5 s (WCAG 2.2.2), and never the only carrier of the message. [K]
- **Never lazy-load the hero image.** It is usually the LCP element: no `loading="lazy"`, add
  `fetchpriority="high"`, keep it in the HTML (not injected by JS). Good LCP ≤ 2.5 s. [K] https://web.dev/articles/lcp
  Etsy measured 4% faster LCP from fetchpriority. [S] https://addyosmani.com/blog/fetch-priority/

## Hierarchy and legibility

- **Layer-cake, not F.** NN/g: the F-pattern is what happens when there are no strong cues; clear headings
  produce layer-cake scanning. [S] https://www.nngroup.com/articles/text-scanning-patterns-eyetracking/
- **The "Z-pattern" has no eyetracking source.** [U] Don't justify a layout with it.
- **Text over images needs a backing and a measured check** against the worst region of the image: 4.5:1, or 3:1
  for large text (≥ 24 px, or ≥ 18.66 px bold). NN/g: even semi-opaque boxes failed in one example; blur or a
  consistent backing works. [S] https://www.nngroup.com/articles/text-over-images/ (The audit measures the
  headline's worst pixel; for glass backings use the blur-craft skill's glass-contrast.mjs.)

## Accessibility

- **Moving > 5 s needs pause/stop/hide** (WCAG 2.2.2, Level A). Auto-updating content (auto-advancing slides) gets
  no 5-second exception; content that starts on hover, focus or scroll-in counts as automatic. Audio > 3 s needs
  a pause or volume control (1.4.2). [V] https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- **Respect `prefers-reduced-motion`:** no parallax, auto-rotation or large entrance motion when set. [K]
- **Exactly one `<h1>`, and it is the value proposition** (not the logo, not an eyebrow). Decorative images
  `alt=""`; product shots described. Real `<a>`/`<button>` CTAs with a visible focus ring (2.4.7); a sticky header
  must not hide focused elements (2.4.11). [K]

## Mobile

- **No `100vh` heroes.** On phones `vh` is the *large* viewport, so content sits under the toolbars. Use `svh`
  for hero height (`dvh` only where it must follow the toolbar; it can shift layout). Chrome 108, Firefox 101,
  Safari 15.4. [V] https://web.dev/blog/viewport-units
- **One-thumb use, without trusting thumb-zone charts.** Hoober 2013: 49% one-handed; he later said the original
  thumb-zone chart was wrong and people prefer the centre of the screen. [S] https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- **What survives on a phone:** headline, one subhead line, the primary CTA, one piece of proof. Secondary CTAs
  become text links; logo walls past 4-6 logos, decorative art and background video go. [O, inferred from the
  fold and complexity data]
- **Text ≥ 16 px; inputs ≥ 16 px** (smaller inputs trigger iOS auto-zoom). [K]

## The generic look

No study measures it [O], but the template is recognisable and critics argue it erodes trust: a centred
headline with one gradient word, a purple/indigo glow (Tailwind's `indigo-500` default), an eyebrow pill
("New: …"), a filled + ghost button pair, a grey logo strip, three icon cards, Inter, soft-shadow rounded cards,
and vague copy ("Supercharge your workflow", "The future of X").
https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p ·
https://superdesign.dev/blog/fix-generic-ai-landing-page
Remember Tuch 2012: familiar *structure* helps; it's the generic *styling and copy* that hurts.

## Unverified claims (don't repeat them as fact)

Ideal headline word count · "'my' vs 'your' +90%" · the Z-pattern · faces lifting conversion · exact Baymard
slider percentages (paywalled, conflicting versions) · an HTTP Archive figure for lazy-loaded LCP images.

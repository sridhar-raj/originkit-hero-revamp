# Hero copy kit

Write the copy before the visual. A hero has four pieces of text: the headline, one subhead sentence, the
primary CTA label and one piece of proof. Sources are in `evidence.md`; tags as there: **[V]** verified,
**[S]** secondary, **[K]** standard, **[O]** opinion, **[U]** unverified.

**Contents:** What the research supports · Headline formulas · The subhead pattern · CTA labels · Proof,
ranked · Never invent proof · Rewrite table · Two-minute copy test

## What the research supports

- **Say what it is, literally.** NN/g homepage guideline: start with a tagline that summarises what the site
  or company does [V]. A customer-outcome headline beat a company-centric one in a single A/B test [S].
- **Cut the marketing language.** Morkes and Nielsen (1997): against a promotional control, the objective
  version scored 27% better on usability, concise 58%, scannable 47%, all three together 124%. Users said they
  detest "marketing fluff" [V].
- **Plain words.** Pages written at a 5th-7th grade reading level had the highest median conversion in a
  large correlational benchmark [S].
- **Key words first.** People scan the first words of a line [S]. Lead with the noun the visitor came for.
- **Credibility comes from what people can check.** The Stanford Guidelines for Web Credibility (Fogg, 2002)
  open with "make it easy to verify the accuracy of the information" and "show that there's a real
  organization behind your site", and advise restraint with promotional content [V].
- **No study sets an ideal headline length** [U]. Working heuristic: one line on desktop, at most 2-3 on a
  phone, warn above 12 words.

## Headline formulas

Pick the formula that fits a true fact about the product. Each needs a concrete noun and, ideally, a verb the
signature moment can show (`signature.md`).

| Formula | Good | Bad (and why) |
|---|---|---|
| **[Thing] that [does the job itself]** | "Invoices that chase themselves." | "Invoicing, reimagined." (no job, no subject) |
| **[Job], [when or where]** | "Small fixes, merged while you sleep." | "Ship faster with intelligent tooling." (faster than what? which tooling?) |
| **[Outcome] without [the pain]** | "Get paid without the awkward emails." | "Revolutionise your cash flow." (marketese, no pain named) |
| **[Thing] that [adapts to a real signal]** | "Runs that adapt to how your legs feel today." | "Unlock your full potential." (could be any product) |
| **[Category] for [specific audience]** | "Bookkeeping for freelance designers." | "The all-in-one platform for everyone." (no category, no audience) |
| **[Name]: [literal claim]** when the name is unknown and says nothing | "Halden: a password manager your whole family can use." | "Halden. Security, simplified." (still doesn't say what it is) |

Then check: key noun in the first few words? No word you'd need to explain? Would a competitor say it word
for word? If so, it's not done.

## The subhead pattern

One sentence, 8-18 words (the measured cluster in `patterns.md`), that answers who it is for and how it works:

**[Who] + [what the product does, concretely] + [so / the result].**

- Good: "Ledgerly sends your invoices and follows up when they're late, so freelancers get paid on time."
- Bad: "Our powerful platform helps businesses of all sizes streamline their financial operations."
  (no who, no what, no result)

Rules: no second sentence; no word repeated from the headline; specifics over adjectives ("follows up when
they're late", not "smart reminders"). Muted colour, still at least 4.5:1 [K].

## CTA labels

The label names the outcome or the first real step: **verb + the thing the visitor gets**.

| Good | Bad |
|---|---|
| "Send your first invoice" | "Get started" |
| "Plan tomorrow's run" | "Learn more" |
| "Start free trial" | "Submit" |
| "Copy the install command" | "Explore" |
| "Book a 20-minute demo" | "Contact us" |

- One filled primary; any second action is visibly weaker, often a text link ("See a sample invoice").
- A risk reducer under the button only if it is true and specific: "Free for 3 clients. No card." [O]
- The popular "'my' beats 'your' by 90%" claim has no primary source [U]. Don't cite it.

## Proof, ranked

Ranked by how easy it is for a visitor to check, following the Stanford credibility guidelines above. The
ranking itself is judgment [O].

1. **A verifiable number with its source**, linked: public install or download counts, a public repository's
   stars, an app store rating *with its count*, a named third-party audit or benchmark.
2. **A named customer quote**: a person, role and company, with permission, ideally linked.
3. **Real customer logos**, used with permission, 4-6 at most, in their real colours or one quiet tone.
4. **A rating with its count** ("4.7 from 2,312 reviews"). Count matters more than the average, and a
   perfect 5.0 breeds doubt (Spiegel Research Center, product-page data; applying it to heroes is an
   inference) [S].
5. **An aggregate claim from internal data** ("12,400 invoices sent last month"). Weakest; use only if the
   user confirms the number and where it comes from.

**No proof yet?** Let the product be the proof: the signature moment, or one concrete, checkable spec
("Works offline. Installs in one command."). An empty proof slot is better than a weak one.

## Never invent proof

No number, quote, logo, rating or customer the user hasn't confirmed. If a fix needs proof you don't have,
ask, and until it arrives write a visible placeholder (`[[PROOF: needs a source]]`) that fails review. "Trusted
by thousands", "loved by teams everywhere" and unattributed quotes are invented proof too.

## Rewrite table

Template phrase → what the product literally does. The right column only works with the product's real
facts; never copy it as is.

| Template phrase | Literal version |
|---|---|
| "Supercharge your workflow" | "Invoices that chase themselves." |
| "The future of development is here" | "Small fixes, merged while you sleep." |
| "Unlock your full potential" | "Runs that adapt to how your legs feel today." |
| "The all-in-one platform" | Name the two or three jobs: "Quotes, invoices and reminders in one place." |
| "Seamless integrations" | Say which kind: "Syncs with your bank feed and your accounting app." |
| "AI-powered" / "next-generation" | Say what the AI does and who decides: "Drafts the reminder; you approve it." |
| "Built for teams of all sizes" | Name the audience: "For freelancers who invoice monthly." |
| "Lightning fast" | The measured number, only if measured: "Builds a 10,000-file repo in 4 s." |
| "Trusted by thousands" | A sourced number, a named customer, or nothing. |
| "Get started" / "Learn more" | The outcome: "Send your first invoice" / "See a sample report". |

## Two-minute copy test

1. **Headline alone:** cover everything else. Can a stranger say what the product is and who it's for?
2. **Competitor swap:** put a competitor's name on it. If it still works, make it more specific.
3. **Read it aloud:** anything you wouldn't say to a customer across a table goes.
4. **Proof check:** every number and name has a source the user confirmed.
5. **Phone fit:** headline ≤ 3 lines and the CTA visible without scrolling at 360 and 390 px (the audit
   checks lines and CTA position).

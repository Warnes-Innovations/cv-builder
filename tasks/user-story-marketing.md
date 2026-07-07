<!--
Copyright (C) 2026 Gregory R. Warnes
SPDX-License-Identifier: AGPL-3.0-or-later

This file is part of CV-Builder.
For commercial licensing, contact greg@warnes-innovations.com
-->

# User Story: Marketing / Branding Reviewer Perspective
**Persona:** A marketing/branding reviewer evaluating whether cv-builder can attract and retain new users (job applicants) and new developers/contributors, now that the project is moving from a personal tool toward one other people are invited to use
**Scope:** Two linked evaluations: (1) in-product first impressions and positioning — does a stranger arriving at the running app understand what it is, why it's worth their time, and how to get their first win quickly; and (2) external collateral — README, any future landing page, and social/promotional material — is it clear, honest, and shareable
**Format:** Evaluation criteria presented as acceptance tests, with specific failure modes to guard against, while keeping application-review findings separate from external-collateral-review findings

---

## US-MK1: Value Proposition Clarity (In-Product)

**As a** marketing reviewer,
**I want to** verify that a first-time visitor understands what cv-builder does and why it's better than writing a CV by hand or pasting a job description into a generic chatbot —
**So that** the app doesn't lose prospective users in the first ten seconds to confusion about what it's for.

**Evaluation Criteria:**
1. **Elevator pitch visible before commitment** — Before a user has to paste a job description or configure anything, is there a one-or-two-sentence statement of what the tool does and its distinct value (e.g., structured master-data reuse across applications, AI-assisted but human-reviewed, no blind writes)?
2. **Differentiation from "just ask an LLM"** — Given the obvious alternative (paste your resume and a job description into ChatGPT), does anything in the product surface communicate why a purpose-built tool with review gates, master-data persistence, and ATS validation is worth the extra structure?
3. **Trust signals up front** — Given this app writes to a persistent master-data file and calls external LLM providers, is there any early, low-friction reassurance (not a wall of text) that the user's data and decisions stay under their control?

**Failure Modes to Guard Against:**
- The first screen a new user sees is a raw job-input form with no framing of what happens next or why.
- The product's actual differentiators (master-data reuse, no-blind-write review gates, ATS validation) are documented deep in internal docs (`tasks/*.md`) but never surface to an actual first-time user.
- Trust/data-handling messaging is either absent or so dense it reads as legal boilerplate no one reads.

**Acceptance Criteria:**
- A user with zero prior context can state, within 30 seconds of landing on the app, what it does and one reason to prefer it over an ad-hoc alternative.

---

## US-MK2: First-Run Path to a Win

**As a** marketing reviewer,
**I want to** verify that a new user reaches a tangible successful outcome (a usable CV, or at minimum a completed analysis) with low setup friction —
**So that** the first session converts curiosity into retained usage rather than abandonment.

**Evaluation Criteria:**
1. **Setup friction before first value** — How much configuration (API keys, provider selection, account creation) sits between "I opened the app" and "I got a useful result"? Is any of it avoidable or deferrable?
2. **Progress visibility during the first session** — Does a new user get enough orientation (per the UX-expert persona's overlapping US-U1 criteria) to trust that a multi-step AI workflow is actually making progress toward their goal, not stalled or lost?
3. **A shareable/memorable moment** — Is there a natural point in the first session (e.g., the ATS match score, a generated CV preview) that would make a satisfied user want to tell someone else about the tool?

**Failure Modes to Guard Against:**
- Required setup (e.g., LLM provider credentials) blocks any exploration of the product before a user can judge whether it's worth that setup cost.
- The first session's success state is anticlimactic or hard to notice (a file silently appears with no moment of "this worked").

**Acceptance Criteria:**
- A new user can reach a first tangible result without needing to read external documentation beyond in-product guidance.
- The first successful result is presented in a way a satisfied user would plausibly want to show someone else.

---

## US-MK3: README as Storefront

**As a** marketing reviewer,
**I want to** verify that the repository README functions as effective external-facing collateral for both prospective users and prospective contributors, since it is the artifact most likely to be a stranger's first exposure to the project —
**So that** the README converts a GitHub visitor into either a user or a contributor rather than losing them to unclear framing.

**Evaluation Criteria:**
1. **Above-the-fold value proposition** — Within the first screen of the README (before installation instructions), is it clear what the project is, who it's for, and what makes it worth trying?
2. **Visual proof, not just prose** — Does the README include a screenshot, GIF, or other visual evidence of the product working, rather than relying entirely on text description?
3. **Distinct paths for distinct audiences** — Does the README clearly separate "I want to use this to build a CV" from "I want to contribute code," rather than forcing every reader through the same setup-first narrative?
4. **Honesty about project maturity** — Given this project is moving from personal-tool to multi-user, does the README accurately represent current state (e.g., not overpromising deployment maturity that the multi-user work hasn't finished) — a marketing pitch that is honest, bounded, and accurate is a strength, not a gap; an overstated one is a real finding.

**Failure Modes to Guard Against:**
- README opens directly with installation/dependency instructions with no framing of what the project is or why someone would want it.
- No screenshots or visual evidence anywhere in the README.
- A single undifferentiated setup path forces a prospective user who just wants to try the tool through contributor-oriented steps (cloning, dev dependencies) they don't need.

**Acceptance Criteria:**
- A GitHub visitor with no prior context can determine, from the README alone, whether this project is relevant to them and what to do next, within one screen of scrolling.

---

## US-MK4: Branding and Voice Consistency

**As a** marketing reviewer,
**I want to** verify that the project presents a consistent name, tagline, and tone across the app UI, README, and any other user-facing surface —
**So that** the project reads as a deliberate product rather than an internal tool that happens to be public.

**Evaluation Criteria:**
1. **Consistent naming** — Is the project referred to consistently (e.g., "cv-builder" vs. "CV Builder" vs. "CV-Builder") across the app header, README, and package metadata, or does inconsistent capitalization/naming undercut a sense of a considered brand?
2. **Tone consistency** — Does in-app copy (buttons, tooltips, error messages) and README copy share a consistent voice, or does one read as polished product copy and the other as developer shorthand?
3. **Terminology consistency** — Per prior UX findings (mixed British/American spellings, "Analyse"/"Customizations" inconsistency already flagged elsewhere in this repo's review history), does inconsistent terminology undercut the brand's sense of care and attention to detail?

**Failure Modes to Guard Against:**
- The product name is capitalized/hyphenated differently in different places a user would see in the same session.
- Copy tone whiplashes between casual/internal ("just paste your stuff here") and formal, with no consistent voice.

**Acceptance Criteria:**
- A user moving between the README, the app UI, and any generated output would not notice a jarring shift in naming or tone.

---

## US-MK5: Social/Promotional Readiness

**As a** marketing reviewer,
**I want to** verify that the project is ready to be shared or promoted externally (e.g., a social media post, a Show HN-style post, a link shared in a community) without embarrassing gaps —
**So that** any promotional effort put into the project isn't undermined by the thing being promoted looking unfinished or unclear at first click.

**Evaluation Criteria:**
1. **Social preview metadata** — Does the repository (or any future hosted instance) have Open Graph / social-card metadata so a shared link renders with a title, description, and image rather than a bare URL?
2. **First-click experience matches the pitch** — If a promotional post claims a specific benefit (e.g., "reuse your career history across every application"), does clicking through to the actual app/README support that claim within the first interaction, or does it require digging to find?
3. **No glaring incomplete-feature exposure** — Does the current state of the product (per `tasks/gaps.md`'s OPEN/PARTIAL items) expose anything that would look broken or confusing to someone arriving from a promotional link with no context on what's still in progress?

**Failure Modes to Guard Against:**
- A shared link renders as a bare GitHub URL with no preview card.
- A promotional claim about the product isn't substantiated within the first thing a new visitor sees.
- A visitor arriving fresh (not a returning developer who knows the roadmap) encounters an OPEN/PARTIAL gap that reads as broken rather than in-progress.

**Acceptance Criteria:**
- The project could be linked in an external post today without an immediate, avoidable negative first impression.

---

## Notes on Scope Boundaries

This persona evaluates positioning, clarity, and external-facing presentation — it does **not** duplicate the `ux-expert` persona's interaction-design evaluation, the `resume-expert`/`persuasion-expert` personas' evaluation of *generated CV content* quality, or the `first-time-user` persona's step-by-step usability walkthrough. Where those overlap (e.g., US-MK2's first-run friction touches the same ground as `first-time-user`), this persona's angle is specifically "would this make someone want to keep using / recommend the product," not "is this step usable."

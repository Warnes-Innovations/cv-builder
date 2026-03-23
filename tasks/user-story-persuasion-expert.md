# User Story: Persuasion Expert Perspective
**Persona:** A persuasion strategist (Scott Adams / Robert Cialdini school) evaluating both the application workflow that shapes messaging and how effectively the generated content influences the hiring decision  
**Scope:** Two linked evaluations: (1) whether the application encourages sound framing choices during content selection and review, and (2) the psychological and rhetorical effectiveness of generated output such as summaries, bullet points, cover letters, and related materials  
**Format:** Evaluation criteria presented as acceptance tests, with specific failure modes to guard against, while keeping application-review findings separate from output-review findings

---

## US-P1: Narrative Arc and Identity Alignment

**As a** persuasion expert,  
**I want to** verify that the CV tells a coherent, directed story rather than listing facts chronologically,  
**So that** the hiring manager instinctively feels the candidate is the logical next person in this role, not just a qualified applicant.

**Evaluation Criteria:**
1. **Identity match** — The professional summary must position the candidate as already inhabiting the target role identity (e.g., "Genomics ML Scientist" when applying to such a role), not as someone seeking to transition into it.
2. **Arc coherence** — Experiences should read as a progression toward this role, not a flat inventory. Each role's bullets should — in aggregate — advance a single dominant narrative thread.
3. **Future-pull framing** — At least one sentence implies what the candidate will deliver in this role, not only what they have done.
4. **No identity fragmentation** — If the candidate has both research and engineering experience, the content must commit to the dominant identity for this application. Presenting both equally signals indecision.

**Failure Modes to Guard Against:**
- Summary opening with title/name rather than a value statement.
- Bullets that read as job descriptions ("Responsible for…") rather than contributions.
- Competing narratives (e.g., "researcher AND manager AND engineer") with no dominant thread.
- Using hedging language that undermines authority ("helped to", "assisted with", "was involved in").

**Acceptance Criteria:**
- Professional summary opens with a value-identity statement, not a job title or name.
- At least one forward-looking statement ("positioned to…", "brings direct experience in…") in the summary.
- System warns if more than two equally-weighted narrative threads are present in the selected content.
- Zero instances of "responsible for", "helped to", "assisted with", or "was involved in" in proposed rewrites.

---

## US-P2: Social Proof and Authority Signals

**As a** persuasion expert,  
**I want to** confirm that the generated content maximises social proof and authority signals appropriate to the role,  
**So that** the hiring manager's brain registers the candidate as the pre-validated, low-risk choice.

**Evaluation Criteria:**
1. **Named institutions and brands** — Well-known employers, universities, journals, or conference names should be surface-level visible (first line of a bullet, not buried). Pfizer, Genentech, Nature Genetics — these carry social proof weight that generic references do not.
2. **Quantified impact** — Metrics (team size, budget, percentage improvement, number of users/patients affected) function as social proof by making claims verifiable. Any bullet without a number where a number existed in the master data is a lost opportunity.
3. **External validation** — Publications, awards, patents, press mentions, and invited talks are authority anchors. These must appear at the appropriate prominence for the role (high for research, moderate for engineering, omitted for pure management). For research/scientific roles, the system must proactively recommend the most persuasion-relevant publications — those that directly address the job's required expertise — not the most-cited or the oldest. A targeted 2–5 publication shortlist is more persuasive than a comprehensive list.
4. **Publication authority signals** — Within each recommended publication, the system should flag authority indicators to the user: first-author status, high-impact journal/conference, citation count if notable, industry partner co-authorship. These should inform the ordering of the shortlist beyond raw keyword overlap.
5. **Third-party language** — Phrases like "selected by…", "invited to…", "cited by…", or "adopted by [organisation]" carry third-party validation weight. The system should preserve and surface these wherever present in master data.
6. **Specificity as credibility** — Vague claims ("improved performance") undermine authority. Specific claims ("reduced inference latency by 40% at p50") signal the candidate measured and owned the outcome.

**Failure Modes to Guard Against:**
- Burying a recognisable brand name in the middle of a long bullet.
- Replacing a specific metric with a vague qualifier during a rewrite ("significantly improved" instead of "improved by 40%").
- Omitting publications or awards silently without surfacing the omission decision to the user.
- Including a raw dump of all publications with no relevance filtering — a long undifferentiated list signals poor judgment.
- Ranking publications purely by citation count or journal impact factor, ignoring relevance to the specific job requirements.
- Over-listing metrics that are small or unimpressive without context (including a weak number is worse than no number).

**Acceptance Criteria:**
- `apply_rewrite_constraints` rejects any proposal that removes or vagues-over a numeric metric.
- Named recognisable organisations appear within the first 15 words of their respective bullet.
- Conditional omission decisions for Publications/Awards are surfaced to the user with rationale, not silently dropped.
- Publication recommendation list is ranked by job-relevance (keyword + domain + authority signals), not by recency or citation count alone.
- Each recommended publication shows at least one authority signal (first-author, journal/conference name, citation note) alongside its relevance rationale.
- System flags bullets where a number is present in master data but absent in the proposed rewrite.

---

## US-P3: Loss-Aversion and Urgency Framing

**As a** persuasion expert,  
**I want to** verify that the content activates mild loss-aversion in the reader — the sense that *not* hiring this candidate is the risky choice —  
**So that** the hiring decision tilts toward the candidate even in ambiguous cases.

**Evaluation Criteria:**
1. **Problem → Solution framing** — The most persuasive bullets describe a problem or challenge first, then the candidate's response, then the result. Pure action-result bullets are less compelling than challenge-action-result (CAR) bullets.
2. **Cost-of-inaction signals** — Where the master data contains language suggesting urgency or stakes, the system should preserve it. "Rebuilt pipeline before FDA submission" conveys stakes. "Rebuilt pipeline" does not.
3. **Differentiation from generics** — At least one item in the Skills or Summary section should contrast the candidate with the typical applicant pool implicitly (e.g., "rare combination of statistical rigour and engineering delivery").
4. **Positive-sum framing** — Language should frame the candidate's contributions as value-creating, not cost-reducing. "Enabled team to ship 3× faster" is more persuasive than "reduced time-to-delivery by 66%".

**Failure Modes to Guard Against:**
- Bullet rewrite strips context (challenge description) and leaves only the action, reducing persuasive power.
- Metrics presented in a negative frame ("reduced by X") when a positive reframe is available ("increased by Y").
- Summary that sounds identical to any other senior scientist's summary (no differentiation signal).

**Acceptance Criteria:**
- System identifies and proposes CAR (Challenge-Action-Result) structure for experience bullets where challenge language exists in master data.
- Rewrites prefer positive-sum metric framing ("increased X") over loss framing ("reduced Y") unless the loss-framing itself is the impressive result.
- Summary rewrite is checked against a short list of generic filler phrases and flagged if more than one appears.

---

## US-P4: Rhetorical Quality of Bullet Points

**As a** persuasion expert,  
**I want to** ensure each bullet point carries maximum rhetorical punch per word —  
**So that** a time-pressured hiring manager scanning for 6 seconds retains the right impression.

**Evaluation Criteria:**
1. **Strong opening verb** — Every bullet must open with a specific, active past-tense or present verb. "Developed", "Designed", "Led", "Built", "Deployed" are acceptable. "Was responsible for", "Helped", "Worked on", "Assisted" are not.
2. **Front-loading** — The most impressive or distinctive word or phrase should appear as early in the bullet as possible. "Spearheaded $4M NIH-funded…" front-loads impact. "Played a key role in a large NIH-funded grant worth over $4 million" buries it.
3. **Conciseness under pressure** — No bullet should exceed two lines in print. Bullets over 30 words must be reviewed for compression opportunity.
4. **Parallel structure** — Within a given experience, bullets should follow a consistent grammatical form. Mixing "Led…" with "Responsible for…" with "The team delivered…" signals lack of intentionality.

**Failure Modes to Guard Against:**
- Keyword insertion at the end of a bullet as an appendage ("…and leveraged MLOps best practices.").
- Over-long bullets that dilute the hook by delaying impact.
- Passive voice constructions ("was tasked with", "was responsible for").
- Bullets that describe input (what the candidate did) rather than output (what happened as a result).

**Acceptance Criteria:**
- Every proposed bullet begins with a verb from an approved strong-action-verb list.
- System flags any proposed bullet exceeding 30 words for compression review.
- System flags passive voice constructions in proposed rewrites.
- System flags bullets where no result clause (outcome, impact, or metric) is present.

---

## US-P5: Cover Letter Persuasion Architecture

**As a** persuasion expert,  
**I want to** verify that the generated cover letter follows a persuasion-optimised structure and avoids formulaic filler —  
**So that** the letter reinforces rather than restates the CV, creates emotional resonance, and ends with a clear call to action.

**Evaluation Criteria:**
1. **Opening pattern interrupt** — The first sentence must not be "I am writing to apply for…" or any variant. It should open with a specific, relevant claim or observation that anchors attention.  
2. **One-paragraph value proposition** — Paragraph 2 should make one specific, provable claim about the value the candidate brings to this exact role. Not a list of attributes — one focused point.
3. **Mirroring the job posting language** — The cover letter should use 2–3 phrases or terms directly from the job description (not paraphrased) to trigger cognitive fluency and confirm mutual understanding.
4. **Conciseness** — Maximum 4 paragraphs, maximum 300 words. The letter is a hook, not a second CV.
5. **Call to action** — Closing paragraph must articulate a specific next step ("I would welcome a 30-minute conversation to discuss how…"), not a passive hope ("I look forward to hearing from you").

**Failure Modes to Guard Against:**
- Opening with "I" as the first word.
- Restating the CV rather than extending it with context/motivation not visible in the CV.
- Closing with a passive, non-committal sentence.
- Cover letter that is generic and could apply to any role at any company.

**Acceptance Criteria:**
- System rejects any draft where the first word is "I" and offers a rewrite prompt.
- Cover letter references at least the company name and one specific role requirement in a non-generic way.
- Word count check enforced; letter exceeding 300 words triggers a compression review flag.
- Closing sentence includes a specific proposed next step (flagged if absent).

---

## US-P6: Consistency of Persuasive Register

**As a** persuasion expert,  
**I want to** verify that the persuasive register — tone, confidence level, specificity — is consistent across the CV, cover letter, and screening answers —  
**So that** the hiring team receives a coherent signal from every touchpoint, rather than mixed impressions.

**Evaluation Criteria:**
1. **Confidence register** — Language confidence (hedged vs. assertive) should be uniform. A confident summary followed by hedged bullets is incoherent.
2. **Role-level calibration** — Seniority of language should match the target role level. A director-level candidate applying to a VP role must use VP-level language and scope throughout (budgets, organisational impact, strategic framing).
3. **Cross-document keyword consistency** — Key terms introduced in the CV must appear in the cover letter and screening answers. Introducing new terminology in the cover letter that conflicts with CV terminology creates cognitive dissonance.
4. **Narrative thread continuity** — The dominant narrative thread established in the summary should echo in the cover letter's core argument.

**Failure Modes to Guard Against:**
- Summary uses assertive framing; bullets use passive or hedged framing.
- Cover letter introduces a new narrative angle not signalled in the CV.
- Screening answers use different terminology than the CV for the same skills/roles.
- Role-level language mismatch (entry-level phrasing in a VP application).

**Acceptance Criteria:**
- System enforces that clarification-answer context (e.g., "emphasise leadership") is applied consistently across all generated content in the session.
- Cover letter core argument is cross-checked against summary framing; mismatch flagged for user review.
- Prior screening-answer terminology is compared against CV keyword choices; divergences are presented as a harmonisation suggestion.


# Ailsa Complexity Audit v1

This audit uses `docs/AILSA_QUALITY_RUBRIC.md` as the evaluation frame.

Question:
Which parts of Ailsa are **worth the complexity**, and which parts are at risk of making the product harder to use, maintain, or explain?

---

## 1. Main-product definition

Ailsa's core job is:

> turn a consultation transcript into a clinician-reviewable, cardiology-friendly draft note quickly and safely.

Everything in the main path should be justified against that job.

---

## 2. Complexity that is worth keeping

These parts currently survive the complexity budget because they improve at least two of:
- accuracy
- clinician review speed
- readability / scanability
- coding-friendly structure
- governance / audit safety

### A. Structured document families
Keep:
- inpatient note
- consultant letter
- discharge summary

Why they survive:
- improve readability / structure
- improve coding-friendly explicitness
- reduce prompt ambiguity

### B. Conservative transcript review gate
Keep:
- transcript confirmation before generation
- clinician accept / edit / reject flow

Why they survive:
- improve governance / audit safety
- reduce unsupported draft use

### C. Regression + style-eval
Keep:
- `npm run regression`
- `npm run style-eval`

Why they survive:
- directly reduce drift
- provide measurable quality control

### D. Local recording recovery / retry
Keep:
- interrupted recording recovery
- retry / load / recover from saved audio

Why they survive:
- improve reliability
- reduce clinician frustration and rework

---

## 3. Complexity that should stay secondary

These parts may be useful, but should not dominate the main flow.

### A. Evidence layer
Current status:
- useful as a secondary support layer
- risky if it expands into mini-guideline output

Rule:
- keep secondary
- keep collapsible
- never let it dominate first-screen clinical drafting

### B. Operational sidecar
Current status:
- some value for tasks / continuity / pending items
- can also feel like dashboard chrome if too prominent

Rule:
- preserve only what directly supports handover and action clarity
- avoid turning it into a separate management console

### C. Session / consultation management
Current status:
- useful, but already correctly moved out of the mobile main path

Rule:
- keep available
- keep secondary
- avoid re-expanding it into the primary capture screen

---

## 4. Complexity most at risk of overgrowth

These are the biggest current watch areas.

### A. Too many terminology micro-rules
Risk:
- rule accretion can become brittle
- unclear whether each micro-rule still improves readability

Rule:
- add wording rules only when they improve doctor usability or safety
- prefer eval-backed changes over endless rule growth

### B. Feature drift toward mini-EHR / case-management
Risk:
- session persistence + workflow + sidecar + recording history can start to look like longitudinal management

Rule:
- preserve the single-consultation boundary
- avoid patient-tracking features
- avoid same-day pseudo-longitudinal memory inside the product model

### C. Evidence / support over-expansion
Risk:
- can turn the note system into a guideline explainer
- can increase hallucination surface area

Rule:
- support layer stays optional and clearly secondary
- prefer omission to weakly grounded support output

---

## 5. Candidate simplification targets

These are the best next simplification candidates.

### Candidate 1: Make evidence layer even more clearly secondary
Why:
- it is useful, but not core to first-pass documentation
- it adds token cost, UI weight, and conceptual weight

Potential action:
- keep hidden by default
- keep out of sticky footer emphasis
- avoid duplicating evidence state in multiple places

### Candidate 2: Reduce sidecar chrome if it does not improve review speed
Why:
- the sidecar can drift toward admin/dashboard feel
- some of its content duplicates what the main draft already shows

Potential action:
- keep only high-value action / risk / pending content
- collapse or remove low-value duplication

### Candidate 3: Resist evaluator sprawl
Why:
- evaluation is valuable, but too many scripts / scores can become their own complexity problem

Potential action:
- keep a small stable stack:
  - regression
  - style-eval
  - quality rubric
- avoid adding many parallel benchmark scripts unless they directly change decisions

---

## 6. Current recommendation

Short term:
1. keep the core drafting architecture
2. keep the conservative review gate
3. keep regression + style-eval
4. keep recording recovery
5. resist adding new product surfaces unless they clearly improve the three quality rails

Most likely next simplification target:
- **evidence layer emphasis and sidecar weight**, not the core draft pipeline

---

## 7. Summary

Ailsa is not suffering from random complexity everywhere.
It is mostly suffering from the risk of **secondary layers becoming too prominent**.

Core drafting complexity is currently justified.
Secondary support complexity needs stricter discipline.

That means the next cleanup work should mostly be about:
- preserving a clean main path
- demoting secondary layers
- avoiding dashboard drift
- keeping the product recognisably a documentation organiser

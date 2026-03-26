# Coding-Friendly Documentation

This file describes how Ailsa should support **coding-friendly clinical documentation** without becoming an autonomous clinical coder.

## Core stance

Ailsa should help clinicians produce notes that are easier to:
- review
- hand over
- abstract
- code later
- audit later

Ailsa should **not**:
- assign final billing or coding outputs as truth
- pretend to be a clinical coder
- infer diagnoses purely to make documentation easier to code
- hide uncertainty just to make downstream abstraction cleaner

---

## Why this matters

Good documentation is often easier to code, easier to hand over, and easier to audit.
Poor documentation tends to bury key concepts inside prose, mix active diagnoses with background context, and leave follow-up or medication-change logic implicit.

Ailsa should therefore optimise for **documentation quality that is coding-friendly**, not for premature code generation.

---

## Documentation principles that support later coding / abstraction

### 1. Diagnoses should be explicit
Prefer:
- explicit discharge diagnoses
- explicit active problems
- explicit principal problem / admission problem when supported

Avoid:
- hiding the working diagnosis inside long narrative text
- mixing diagnosis, speculation, and background disease in one sentence
- turning weak hints into confirmed diagnoses

### 2. Medication changes should be separated from narrative
Prefer:
- a dedicated medication-changes section in discharge summaries
- plan items that make medication intent visible

Avoid:
- burying medication changes inside the hospital-course paragraph
- implying medication changes without naming them

### 3. Follow-up should be explicit and operational
Prefer:
- a dedicated follow-up section
- named follow-up actions when supported by the transcript
- explicit review timing where available

Avoid:
- vague phrases such as `ongoing follow up as arranged`
- burying follow-up inside closing prose

### 4. Pending items should stay visible when real
Prefer:
- a dedicated pending-results section when the transcript supports it
- explicit unresolved items rather than implied closure

Avoid:
- inventing pending items
- suppressing real uncertainty to make the note look cleaner

### 5. Uncertainty must remain visible
Prefer:
- `possible`, `likely`, `working diagnosis` style wording when appropriate
- empty fields when the transcript does not support stronger claims

Avoid:
- converting uncertainty into certainty to improve documentation completeness
- over-normalising ambiguous discussion into final diagnosis language

---

## Ailsa by document family

### Inpatient note
Coding-friendly goals:
- active problems should be distinct
- assessment should make the current working issue readable
- plan should separate actions from explanation
- handover items should be explicit, not implied

### Consultant letter
Coding-friendly goals:
- problem-oriented assessment/plan should be preserved
- investigations should be separated from summary
- follow-up should be explicit
- the main clinical question should remain obvious

### Discharge summary
Coding-friendly goals:
- discharge diagnoses should be explicit
- medication changes should be explicit
- follow-up should be explicit
- pending items should be explicit when real
- return / escalation advice should be visible

---

## What Ailsa should measure

Ailsa's evaluation can use documentation-quality proxies such as:
- diagnosis explicitness
- medication-change explicitness
- follow-up explicitness
- pending-item explicitness
- section presence and section order
- avoidance of beautifying filler
- readability and scanability

These are **documentation quality metrics**, not proof of coding correctness.

---

## Red lines

Ailsa must not cross these lines in the name of coding-friendliness:
- do not invent diagnoses
- do not invent procedures
- do not invent medication changes
- do not invent pending tests
- do not promote background disease into active discharge diagnosis without transcript support
- do not suppress uncertainty to make abstraction easier

---

## Practical rule

Ailsa should aim to produce documentation that lets a clinician or downstream coder say:
- the main problem is easy to find
- the medication changes are easy to find
- the follow-up plan is easy to find
- unresolved items are easy to find
- uncertainty is visible where it should be

That is the target.
Not final coding automation.

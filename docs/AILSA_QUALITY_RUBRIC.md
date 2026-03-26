# Ailsa Quality Rubric v1

This file defines a **small, stable quality rubric** for Ailsa.

It exists because the system should not keep growing in complexity without a tighter definition of quality.
The purpose of this rubric is to keep Ailsa focused on one job:

> helping clinicians produce accurate, readable, reviewable cardiology documentation quickly.

---

## 1. Complexity budget

A new feature or rule should usually survive only if it improves at least **two** of the following:
- documentation accuracy
- clinician review speed
- note readability / scanability
- coding-friendly structure
- governance / audit safety

If it mainly adds cleverness, novelty, or configuration surface without improving those outcomes, it should not go in the main path.

---

## 2. External evaluation ideas we are borrowing from

Ailsa does **not** directly implement external benchmarks, but it borrows the useful ideas.

### PDQI-9
Useful ideas:
- accurate
- thorough
- useful
- organized
- comprehensible
- succinct
- internally consistent

### ACI-BENCH
Useful ideas:
- evaluate on real-ish clinical conversations, not just polished prompts
- include noisy / natural / messy transcripts
- test note generation from clinician-patient dialogue, not just general medical QA

### MedScribe
Useful ideas:
- use expert-defined rubrics for documentation tasks
- assess whether required content is actually present
- note quality should be judged section by section, not only by overall vibe

---

## 3. Ailsa's three quality rails

Ailsa should stay simple by evaluating along **three rails**.

### Rail A: Safety and conservatism
Questions:
- Did the note avoid unsupported facts?
- Did it avoid beautifying language?
- Did it preserve uncertainty when uncertainty exists?
- Did it avoid acting like the clinician or coder?

Signals:
- regression anti-hallucination fixtures
- anti-beautification checks
- conservative handling of sparse / gap-heavy transcripts

### Rail B: Doctor usability
Questions:
- Is the note easy to scan quickly?
- Is the structure predictable?
- Does it reduce editing burden?
- Does it sound like a clinician-draft, not an AI essay?

Signals:
- line-length / scanability checks
- section-order checks
- shorthand presence checks
- sparse / messy transcript readability checks

### Rail C: Coding-friendly structure
Questions:
- Are diagnoses explicit?
- Are medication changes explicit?
- Is follow-up explicit?
- Are pending items visible when real and absent when not supported?
- Is problem structure preserved in consultant letters?

Signals:
- diagnosis explicitness
- medication-change explicitness
- follow-up explicitness
- pending-item restraint
- problem-oriented consultant structure

---

## 4. What "good" means for Ailsa

A good Ailsa output is:
- conservative enough that a clinician is not forced to unwrite hallucinations
- structured enough that key information is easy to find
- terse enough to read quickly
- natural enough that a cardiology clinician can scan it comfortably
- explicit enough that later coding / abstraction is easier

A bad Ailsa output is:
- too clever
- too polished
- too verbose
- too generic
- too eager to complete missing information
- too structurally messy to support follow-up care or abstraction

---

## 5. Current operational checks

### Existing local checks
- `npm run regression`
- `npm run style-eval`

### What each one guards
`regression` guards:
- document-family routing
- anti-hallucination behaviour
- schema-level expectations

`style-eval` guards:
- readability / scanability
- anti-beautification
- section presence / order
- shorthand presence
- coding-friendly documentation proxies

---

## 6. Preferred iteration loop

When changing prompts, sanitizers, or render logic:
1. make the smallest change possible
2. run regression
3. run style-eval
4. inspect any warnings as a signal of where reading or structure is slipping
5. reject changes that mainly add complexity without improving the three rails

---

## 7. Non-goals

This rubric is **not** trying to optimise for:
- exam-style medical knowledge scores
- autonomous diagnosis generation
- final coding automation
- guideline encyclopaedia behaviour
- generic benchmark vanity metrics with little relevance to cardiology documentation workflow

---

## 8. Short version

Ailsa should optimise for:
- safe
- readable
- coding-friendly
- reviewable
- fast

And it should stay as simple as possible while doing that.

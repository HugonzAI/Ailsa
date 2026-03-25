# Ailsa Evidence Support Layer

This file defines how Ailsa should handle evidence / guideline-style support.

## Principle

Evidence support is a **separate layer** from the clinical note.

Do not mix these up:
- note body = what happened / current assessment / today's plan
- evidence support = why the framing or next-step logic is clinically reasonable

Ailsa should not turn every note into a mini review article.

---

## Why this exists

A key reason Heidi feels strong is that its outputs often appear supported by literature or guideline logic.

Ailsa should learn from that, but safely.

The goal is:
- clinician-facing support
- not overconfident AI advice
- not invented citations
- not evidence cosplay

---

## Current v1 fields

```json
{
  "evidenceSupport": [
    {
      "claim": "",
      "rationale": "",
      "evidenceType": "guideline",
      "confidence": "medium",
      "citationLabel": ""
    }
  ],
  "evidenceLimitations": [""]
}
```

### `evidenceSupport[]`
Each item should be short and structured.

- `claim`: concise clinical framing or support statement
- `rationale`: why that claim is reasonable from the transcript
- `evidenceType`:
  - `guideline`
  - `common-practice`
  - `risk-flag`
- `confidence`:
  - `low`
  - `medium`
  - `high`
- `citationLabel`: short human-readable label only

### `evidenceLimitations[]`
Use for guardrails such as:
- missing investigation data
- missing ECG/troponin trend
- incomplete medication list
- no haemodynamic instability data provided

---

## Rules

### 1. Never invent citations
If a true source is not grounded, do not fake specificity.

Allowed:
- `General cardiology guidance`
- `General heart failure guidance`
- `Common inpatient monitoring practice`

Not allowed:
- fake paper titles
- fake DOI strings
- fake trial names
- pretend-precise society references that were not truly grounded

### 2. Never convert evidence support into patient fact
Do not write:
- "patient definitely has ACS"

When transcript support is incomplete, prefer:
- "pattern is concerning for possible ischaemia"
- "work-up is consistent with common chest pain assessment pathways"

### 3. Never make evidence support the main note
Ward notes should stay short.
Evidence support is secondary.

### 4. If unsure, leave it empty
A blank evidence block is safer than invented authority.

---

## Product use

This layer is meant to support:
- clinician review
- safer explanation of note framing
- future guideline-grounded features
- later real citation retrieval

It is **not yet** a fully grounded literature engine.

---

## Planned future evolution

### Phase 1
Prompt-shaped evidence support
- conservative
- optional
- generic citation labels only

### Phase 2
Real grounding
- actual guideline / society references
- retrieval-backed citations
- stronger provenance

Only Phase 2 should claim real reference support.

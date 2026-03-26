# Public Reference Notes

This file captures **public, non-patient, non-proprietary reference signals** used to shape Ailsa's documentation behaviour.

It is **not** a source of clinical truth, and it is **not** a source of patient-specific decision-making.
It exists to improve:
- note structure
- scanability
- terminology discipline
- coding-friendly documentation
- privacy/governance alignment

---

## 1. NZ privacy / governance signals

### Health Information Privacy Code (HIPC) 2020 / NZ privacy references
Public sources consistently reinforce these themes:
- collect only what is necessary for the purpose
- be clear about purpose and use of health information
- safeguard stored health information
- ensure accuracy before use
- do not retain data longer than necessary
- be careful with disclosure, especially outside New Zealand

### Product implication for Ailsa
These sources support the existing product direction:
- single-consultation boundary
- clinician review required before use
- conservative transcript and note generation
- avoid unnecessary longitudinal aggregation
- future self-hosting / tighter cloud boundary is desirable
- do not invent facts just to make documentation look complete

---

## 2. Cardiology discharge / handoff public template signals

Publicly available heart-failure discharge and cardiology handoff materials consistently prioritise:
- admission reason / principal problem
- discharge diagnoses
- hospital course / key clinical events
- key investigations / procedures
- medication changes
- discharge condition / current status
- follow-up plan
- return / escalation advice

### Product implication for Ailsa
For discharge summaries, this supports keeping the first-screen reading order as:
1. Admission Course
2. Discharge Diagnoses
3. Medication Changes
4. Discharge Status
5. Follow-up
6. Instructions / pending items / return advice

This also supports making Ailsa more **coding-friendly** without turning it into an autonomous coder:
- diagnoses should be explicit and problem-oriented
- medication changes should be separated from the narrative
- follow-up and pending items should be explicit rather than buried in prose
- unresolved uncertainty should stay visible instead of being over-normalised

---

## 3. Writing-style interpretation for Ailsa

Ailsa should prefer:
- concise, reviewable clinical drafting
- common cardiology shorthand doctors actually read comfortably
- section order that supports rapid scanning
- wording that helps later coding / abstraction

Ailsa should avoid:
- beautifying language
- hidden inference
- essay-style clinical explanations in the core note
- replacing clinician judgement
- pretending to be final coding output

---

## 4. Current working rule

Ailsa is a **documentation organiser**.
It should help clinicians produce notes that are:
- accurate
- fast to review
- easy to scan
- coding-friendly
- governance-friendly

It should not act as:
- the diagnosing clinician
- the final decision-maker
- the final clinical coder

# Ailsa Document Modes

This file defines the main document families Ailsa should support.

The key product principle is:

> Different clinical contexts require different document structures, tones, and downstream actions.

Ailsa should not try to force all cardiology documentation into one generic note format.

---

## Mode 1 — Cardiac Inpatient

Primary users:
- house officers
- registrars
- inpatient cardiology teams
- ward round / handover workflows

Primary outputs:
- cardiac ward round note
- cardiac handover note
- cardiac discharge summary
- problem-based daily plan

Tone:
- concise
- clinically conservative
- ward-round shorthand
- action-oriented
- problem-oriented

Key schema traits:
- current status first
- active problems
- plan today
- workflow tasks
- discharge readiness

Current build status:
- active
- implemented in Ailsa MVP

---

## Mode 2 — Cardiology Consultant Letter

Primary users:
- consultants
- registrars drafting consultant review letters
- outpatient / referral response workflows

Primary outputs:
- new patient assessment letter
- referral response letter
- specialist follow-up letter

Tone:
- formal
- complete
- GP/referrer-facing
- less shorthand than inpatient notes
- organised like a specialist letter, not a ward round entry

Key schema traits:
- referral context
- cardiac risk factors
- cardiac history
- medications / allergies
- social history
- presenting history
- summary / impression
- assessment and plan
- follow-up

Current build status:
- planned
- schema/spec should be defined before implementation

---

## Why modes matter

Heidi's public templates suggest a strong document-family approach:
- ward round / handover templates
- consultant-style assessment letters
- likely discharge-oriented templates

Ailsa should learn from that.

The product should not behave like:
- one transcript in
- one generic note out

Instead, it should become:
- one source transcript/context in
- multiple cardiology-specific document modes out

---

## Near-term implementation order

### Priority 1
Continue deepening Cardiac Inpatient mode:
- improve ward note quality
- improve handover/task extraction
- add discharge summary mode

### Priority 2
Add Cardiology Consultant Letter mode:
- define schema
- define prompt
- define UI mode switch
- only then build generation flow

---

## Rule for future contributors

Before changing prompts or UI, ask:

1. Which document mode is this for?
2. Who is the audience for the output?
3. Is the tone ward-round shorthand or formal specialist correspondence?
4. What downstream workflow does this output support?

If those answers are unclear, the mode split has not been respected.

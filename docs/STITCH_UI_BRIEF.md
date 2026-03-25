# Ailsa Stitch UI Brief

This brief is for designing the Ailsa UI in Stitch.

## Product identity

Ailsa is **not** a generic AI scribe.

It is a **cardiology documentation assistant** focused first on:
- New Zealand inpatient cardiology teams
- cardiac ward round workflow
- handover / task extraction
- evidence-supported clinician review

The product should feel:
- clinical
- calm
- trustworthy
- product-like
- not like an admin dashboard
- not like a generic transcript playground

---

## Primary design rule

The first screen should communicate a complete workflow, not a toy demo.

Avoid:
- scattered dashboard cards
- over-fragmented admin UI
- equal visual weight for everything
- flashy AI-chat aesthetic

Prefer:
- one strong primary workspace
- clear hierarchy
- documentation workflow feel
- clinician-review orientation

---

## Current product layers

Ailsa currently has 3 conceptual output layers.

### Layer 1 — Clinical Document
The main note itself.
Examples:
- ward round note
- handover note
- discharge summary (future)
- consultant letter (future mode)

This is the most important layer.

### Layer 2 — Workflow / Handover
Operational outputs derived from the note.
Examples:
- tasks allocated
- action summary
- next review
- escalation / safety concerns

This should feel like “what the team needs to do next”.

### Layer 3 — Evidence Support
Secondary support layer.
Examples:
- rationale for current framing
- guideline-context style support
- evidence limitations / missing data

This must feel secondary and careful, not like AI giving orders.

---

## First-screen layout goal

Stitch should design the first screen around a single encounter workflow.

Recommended top-level composition:

### Left / Input side
A focused encounter intake area:
- encounter type selector
- audio upload
- transcript input
- generate action
- concise encounter stats/status

This side should feel like a clinical intake workspace, not a dev console.

### Right / Output side
A structured review workspace with strong hierarchy:

#### Primary block
**Clinical Draft**
- patient context
- interval events
- symptoms
- observations
- examination
- investigations
- assessment
- active problems
- plan today

This should dominate the output side.

#### Secondary block
**Workflow / Handover**
- tasks allocated
- action summary
- next review
- escalation / safety concerns

This should be clearly grouped and visually distinct from the note body.

#### Tertiary block
**Evidence Support**
- evidence support items
- evidence limitations

This should feel collapsible, lower emphasis, and clearly separate from the note itself.

---

## Priority hierarchy

If visual emphasis is distributed, use this order:

1. Clinical Draft
2. Workflow / Handover
3. Evidence Support
4. Raw transcript mechanics

Transcript tooling should not visually dominate the clinical output.

---

## Tone and interaction guidance

### The UI should suggest:
- clinician review first
- conservative drafting
- structure over verbosity
- productivity over novelty

### The UI should not suggest:
- autonomous diagnosis engine
- chat assistant personality
- bright consumer health app
- generic AI content generator

---

## Important product constraints

### 1. Do not collapse note + evidence into one block
These must stay distinct.

### 2. Workflow deserves its own visual section
Tasks and next actions are not just extra bullets in the plan.

### 3. Evidence support should look careful
It should read like supporting context, not commands.

### 4. Future modes must fit naturally
The design should be extensible to:
- consultant letter mode
- discharge summary mode
- other cardiology document modes

---

## Suggested information architecture

### Header area
- product name: Ailsa
- short descriptor: Cardiology documentation assistant
- mode / encounter selector
- current status

### Main workspace
- encounter intake panel
- clinical draft panel
- workflow panel
- evidence panel

### Future-ready but not dominant
Space can later support:
- consultant letter mode switch
- discharge summary mode switch
- copy/export actions
- versioning / regenerate controls

---

## Visual references to avoid
Avoid anything that feels like:
- SaaS analytics dashboard
- admin console
- CRM
- chatbot landing page
- engineering internal tool

---

## What Stitch should optimize for

Stitch should optimize for:
- first-screen clarity
- professional hierarchy
- immediate sense of clinical usefulness
- clean distinction between note / workflow / evidence
- a believable healthcare product feel

---

## In one sentence

Design Ailsa like a serious cardiology documentation workspace where the main note is central, team actions are clearly extracted, and evidence support sits behind the note as a careful secondary layer.

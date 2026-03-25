# Ailsa AI Logic

This file exists so another AI or engineer can quickly understand how Ailsa currently works.

## Product target

Ailsa is **not** a generic SOAP note app anymore.

Current target:
- New Zealand inpatient cardiology teams
- cardiac ward round note drafting first
- later: discharge summary and problem-based planning

## Current generation pipeline

1. User provides transcript text (or audio -> transcription)
2. `/api/generate-note` sends the transcript to Anthropic
3. Anthropic is prompted to return **JSON only**
4. The JSON is coerced into `StructuredCardiacNote`
5. The UI renders the structured sections directly
6. A plain-text ward note is also rendered from the structured object for copy/export

## Why structured output

We moved away from pure free-text output because we need:
- more stable cardiac ward note sections
- editable `activeProblems`
- editable `planToday`
- future discharge summary mode
- easier anti-hallucination guardrails

## Current schema

Main output types:
- `StructuredCardiacNote`
- `StructuredConsultantLetter`
- `StructuredDischargeSummary`

Important design choices:
- `patientContext` is now **fieldized** instead of one free-text string
- this is specifically to reduce hallucinated sex/age/admission context
- workflow / handover fields are now also first-class, not just the clinical note body

### patientContext fields
- `explicitDemographics`
- `explicitAdmissionReason`
- `explicitCardiacBackground[]`

### workflow / handover fields
- `tasksAllocated[]`
- `actionSummary[]`
- `nextReview`
- `escalationsSafetyConcerns`

Why these exist:
- Heidi-style workflow value is not only in note drafting but also in converting the round into actions, handover tasks, and next review signals
- Ailsa should learn from that workflow layer without mixing large evidence lectures into the core note body

### evidence support fields
- `evidenceSupport[]`
- `evidenceLimitations[]`

Why these exist:
- Heidi appears stronger not only because of note style, but because its framing often feels backed by guideline/evidence logic
- Ailsa should keep that as a separate support layer rather than polluting the note body with long explanations
- evidence support must remain conservative, optional, and clearly distinct from patient facts

Rule:
- if the transcript does not explicitly state a demographic or admission fact, leave it blank
- do not infer sex, age, or background disease from vibe or from later assessment wording
- pronouns like `he` / `she` are currently treated as insufficient evidence for explicit demographics; the transcript should explicitly say male/female/man/woman before demographics are populated
- admission reason is also treated strictly; generic ward-note context is not enough unless the transcript explicitly states why the patient was admitted/presented
- cardiac background should only be retained when the transcript clearly uses history/background wording (for example `history of`, `known to have`, `prior PCI`, `PMHx`)

## Prompt strategy

Prompt file logic lives in:
- `lib/anthropic.ts`

Current strategy:
- ask for **valid JSON only**
- define the exact output shape in the prompt
- explicitly ban guessing
- explicitly ban inferred demographics/admission details
- route prompt/schema by document family:
  - inpatient cardiac note -> short ward-round shorthand
  - consultant letter -> more formal referrer-facing structure
  - discharge summary -> admission-course / diagnosis / meds / follow-up oriented summary
- avoid turning the note or letter body into evidence-based counselling or guideline explanation inside the main draft
- allow a separate `evidenceSupport` layer for conservative rationale / guideline-context style support when the transcript justifies it
- keep evidence support optional; if uncertain, prefer an empty evidence block over fake citations or fake confidence
- post-process evidence items more aggressively than the main draft: weakly anchored or overly assertive evidence items should be dropped even if the model produced them
- when evidence support is dropped, prefer adding a limitation note explaining that transcript detail was insufficient

## Current runtime files

- `app/api/generate-note/route.ts` -> note generation entrypoint
- `app/api/transcribe/route.ts` -> transcription entrypoint
- `lib/anthropic.ts` -> prompt + coercion + plain-text rendering helpers
- `lib/openai.ts` -> OpenAI key helper for Whisper route
- `lib/types.ts` -> note schema
- `components/note-studio.tsx` -> UI for transcript input and structured output

## Current provider setup

- Anthropic model via direct HTTP fetch (not SDK)
- OpenAI Whisper via direct HTTP fetch (not SDK)
- Cloudflare Workers runtime

Reason:
- direct fetch has been more reliable than provider SDKs inside Workers runtime

## Anti-hallucination policy

Ailsa should prefer:
- omission over invention
- structured blanks over fake completeness
- conservative assessment wording over overconfident interpretation

High-risk hallucination areas:
- sex / age
- admission reason
- cardiac background
- hard diagnoses placed in patient context

If something is only implied, it belongs in:
- `assessment`

not in:
- `patientContext`

## Current known weakness

Claude still tends to overfill `patientContext` unless tightly constrained.

That is why:
- we fieldized `patientContext`
- we keep tightening prompt wording
- next likely step is additional post-processing / field-level sanitisation

## Regression fixtures

Representative regression transcripts now live in:
- `fixtures/regression-cases.json`

Local regression runner:
- `npm run regression`

Purpose:
- keep document-family routing stable
- catch prompt/schema drift across inpatient / consultant / discharge modes
- make future prompt iteration less subjective
- assert a small set of section-level expectations so regressions are not limited to documentType checks alone

## Next recommended steps

1. Add stronger regression fixtures for anti-hallucination edge cases
2. Add editable problem list UI
3. Expand regression assertions into more content-aware checks where safe
4. Add real grounding / retrieval for evidence support when ready

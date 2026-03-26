# Ailsa

Ailsa is a deployable AI documentation workspace for **New Zealand inpatient cardiology**.

It is no longer a generic SOAP demo. Current product direction is:
- **cardiac inpatient / ward-round note drafting first**
- **consultant letter drafting**
- **cardiac discharge summary drafting**
- browser-native clinical audio capture with conservative transcript handling
- Cloudflare Workers deployment with real provider APIs

## Current product shape

Ailsa currently includes:

- **3 document families**
  - cardiac inpatient note
  - cardiology consultant letter
  - cardiac discharge summary
- **mode-aware generation** with separate prompt / coercion / sanitization paths
- **browser recording** via `MediaRecorder`
- **audio upload** fallback
- **IndexedDB local persistence** for recordings
- **Cloudflare D1-backed consultation persistence** for workspace state
- **interrupted recording recovery** for recordings left behind by refresh / interruption
- **segmented long-recording transcription**
- **spoken language control**
  - English
  - 中文
  - Te Reo Māori
- **English downstream transcript output**
  - English speech → faithful English transcription
  - 中文 / Te Reo Māori speech → faithful English translation transcript
- **speaker-aware transcript review**
  - speaker label editing
  - per-line text editing
  - reviewed / unchecked state
  - role filters including `Needs review`
- **clinician review flow**
  - transcript confirmation before generation
  - draft accept / edit & accept / reject flow
- **provider abstraction**
  - note generation provider
  - transcription provider
- **conservative evidence layer** kept separate from the main note
- **regression fixtures** for document routing and anti-hallucination checks

## Product principles

Ailsa is being shaped around these rules:

- **NZ inpatient cardiology first**
- **宁缺毋滥** — omission is better than hallucination
- **main note first, support layer second**
- **ward note should read like ward note**
- **evidence should not pollute the main draft**
- **recording/transcription is a core system, not a side feature**

## Current note-writing direction

Ailsa is actively being distilled against Heidi-style strengths, especially for inpatient notes:

- shorter
- tighter
- ward-round shorthand
- less model voice
- fewer repeated points across sections
- different reading flow for ward / consultant / discharge documents

Current direction by document family:

### Inpatient note
- short, high-signal sections
- `Overnight / Symptoms / Obs / Exam / Ix / Impression / Problems / Plan`
- workflow, context, and evidence stay secondary / collapsible

### Consultant letter
- more formal specialist-letter tone
- clearer consultant reading flow
- supporting detail collapsed behind the main clinical story

### Discharge summary
- discharge-ready wording
- emphasis on admission course, diagnoses, medication changes, follow-up, and instructions
- secondary detail collapsed behind the main discharge content

## Architecture

### Frontend
- Next.js App Router
- React 19
- document workspace UI in `components/note-studio*`

### API routes
- `app/api/generate-note/route.ts`
- `app/api/transcribe/route.ts`
- `app/api/sessions/route.ts`

### Core logic
- `lib/anthropic.ts`
- `lib/types.ts`
- `lib/providers/*`
- `lib/workspace-session.ts`

### Audio / transcript review
- `components/note-studio/recording-store.ts`
- `components/note-studio/intake-rail.tsx`
- `components/note-studio.tsx`

## Important docs

- `docs/AI_LOGIC.md`
- `docs/DOCUMENT_MODES.md`
- `docs/CONSULTANT_LETTER_SCHEMA.md`
- `docs/EVIDENCE_SUPPORT.md`
- `docs/STITCH_UI_BRIEF.md`
- `docs/CODING_FRIENDLY_DOCUMENTATION.md`
- `docs/PUBLIC_REFERENCE_NOTES.md`
- `docs/AILSA_QUALITY_RUBRIC.md`
- `docs/COMPLEXITY_AUDIT.md`

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run regression
npm run style-eval
npm run preview
npm run deploy
```

### Regression

`npm run regression` expects a local dev server at `http://127.0.0.1:3000` by default.

It replays fixed transcripts against `/api/generate-note` and checks:
- document family routing
- selected non-empty / empty fields
- selected array length expectations
- anti-hallucination edge cases

Fixtures live in:
- `fixtures/regression-cases.json`

Runner lives in:
- `scripts/run-regression.mjs`

### Style eval

`npm run style-eval` also expects a local dev server (same `AILSA_BASE_URL` convention as regression).

It is a lightweight rule-based scorer for:
- ward-note readability
- cardiology shorthand presence
- anti-beautification penalties
- line-length / scanability checks
- basic plan-density checks
- coding-friendly documentation proxies (diagnosis / med-change / follow-up explicitness)

Fixtures live in:
- `fixtures/style-eval-cases.json`

Runner lives in:
- `scripts/run-style-eval.mjs`

## Environment

Copy `.env.example` to `.env.local` for local development.

### Required provider keys for real mode
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

### Important runtime vars
- `MOCK_TRANSCRIPTION=0`
- `MOCK_NOTE_GENERATION=0`
- `ANTHROPIC_MODEL=claude-sonnet-4-6`

If mock flags are enabled, the app still works in scaffold/demo mode.

## Cloudflare deployment

Ailsa is prepared for **Cloudflare Workers via OpenNext**.

### Local preview in Workers runtime

```bash
npm run preview
```

### Deploy

```bash
npm run deploy
```

### Current deployment stance

- prefer **CLI / OpenNext deploys** over relying on dashboard auto-builds
- `workers.dev` is intentionally disabled
- custom domain front door is:
  - `https://ailsa.co.nz`
- site is intended to stay behind **Cloudflare Access** during testing

## Persistence model

Current storage split:

- **Cloudflare D1** → single-consultation workspace state, draft state, structured output, review state
- **IndexedDB** → local recordings / audio chunks / recoverable interrupted recordings
- **localStorage** → local consultation cache / fast restore fallback

This keeps large audio blobs local-first while making the single-consultation workspace cloud-persistent.

## Notes on transcription behavior

Ailsa deliberately keeps transcription conservative:

- better `Unknown` than wrong `Doctor` / `Patient` / `Nurse`
- no beautifying / summarizing / adding implied facts
- clinician can manually correct speaker labels and transcript lines before generation
- interrupted recordings should be recoverable and re-transcribable from local storage

## Repo status

This repo is under active product iteration. Main branch should stay aligned with:
- current source code
- current deployable path
- current README / docs

If behavior changes materially, update the docs in the repo rather than leaving the logic implicit.

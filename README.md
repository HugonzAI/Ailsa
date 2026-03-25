# Ailsa

Ailsa is a lightweight MVP skeleton for generating clinician-reviewable cardiac inpatient note drafts from consultation transcripts.

## Current scope

- paste transcript text or upload audio
- generate a draft cardiac ward note
- review/edit the result in the browser
- keep the architecture simple enough to iterate fast

## Planned stack

- Next.js app router frontend + API routes
- Whisper or compatible speech-to-text provider for transcription
- Claude Sonnet as the primary note-generation model
- Cloudflare Workers hosts the app; model inference stays external for MVP

## Product direction

Ailsa is being shaped for a New Zealand inpatient cardiology workflow first:

- ward round note drafting
- active problem list drafting
- plan-for-today drafting
- later, discharge summary support

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
npm run deploy
```

## Environment

Copy `.env.example` to `.env.local` and fill keys when ready.

For now the app works in mock mode if `MOCK_NOTE_GENERATION=1`.

## Claude integration

To enable real note generation:

1. Copy `.env.example` to `.env.local`
2. Set `ANTHROPIC_API_KEY`
3. Optionally set `MOCK_NOTE_GENERATION=0`
4. Run `npm run dev`

The API route will use Claude in provider mode when mock mode is disabled and a key is present.

## Transcription integration

To enable Whisper transcription:

1. Set `OPENAI_API_KEY`
2. Set `MOCK_TRANSCRIPTION=0`
3. Upload an audio file in the UI

While scaffolding, `MOCK_TRANSCRIPTION=1` keeps the product flow usable without an external transcription dependency.

## Cloudflare Workers deployment

This project is prepared for Cloudflare Workers via OpenNext.

### Local preview in Workers runtime

```bash
npm run preview
```

### Deploy

```bash
npm run deploy
```

### Required Cloudflare build/runtime vars

Set these in Cloudflare when you want real providers instead of mocks:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `MOCK_TRANSCRIPTION=0`
- `MOCK_NOTE_GENERATION=0`

For local Workers preview, `.dev.vars` currently keeps both mock flags enabled.

# Ailsa

Ailsa is a lightweight MVP skeleton for generating clinician-reviewable SOAP note drafts from consultation transcripts.

## Current scope

- paste or upload transcript text
- generate a draft SOAP note
- review/edit the result in the browser
- keep the architecture simple enough to iterate fast

## Planned stack

- Next.js app router frontend + API routes
- Whisper or compatible speech-to-text provider for transcription
- Claude Sonnet as the primary note-generation model
- GCP hosts the app; model inference stays external for MVP

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run build
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

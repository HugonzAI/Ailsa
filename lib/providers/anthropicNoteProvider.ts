// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

import {
  buildConsultantLetterPrompt,
  buildDischargeSummaryPrompt,
  buildStructuredCardiacPrompt,
  coerceConsultantLetter,
  coerceDischargeSummary,
  coerceStructuredCardiacNote,
  getAnthropicApiKey,
  getAnthropicModel,
  getDocumentType,
  renderStructuredOutput,
  sanitizeConsultantLetter,
  sanitizeDischargeSummary,
  sanitizeStructuredCardiacNote,
} from "@/lib/anthropic";
import type {
  EncounterType,
  StructuredOutput,
} from "@/lib/types";
import type { NoteProvider } from "@/lib/providers/noteProvider";

function buildPrompt(transcript: string, encounterType?: EncounterType) {
  const documentType = getDocumentType(encounterType);
  if (documentType === "cardiology_consultant_letter") return buildConsultantLetterPrompt(transcript);
  if (documentType === "cardiac_discharge_summary") return buildDischargeSummaryPrompt(transcript);
  return buildStructuredCardiacPrompt(transcript, encounterType);
}

function sanitizeOutput(output: StructuredOutput, transcript: string, encounterType?: EncounterType): StructuredOutput {
  if (output.documentType === "cardiology_consultant_letter") return sanitizeConsultantLetter(output, transcript);
  if (output.documentType === "cardiac_discharge_summary") return sanitizeDischargeSummary(output, transcript);
  return sanitizeStructuredCardiacNote(output, transcript, encounterType);
}

function parseOutput(parsed: unknown, encounterType?: EncounterType): StructuredOutput {
  const documentType = getDocumentType(encounterType);
  if (documentType === "cardiology_consultant_letter") return coerceConsultantLetter(parsed);
  if (documentType === "cardiac_discharge_summary") return coerceDischargeSummary(parsed);
  return coerceStructuredCardiacNote(parsed);
}

export class AnthropicNoteProvider implements NoteProvider {
  async generateNote(transcript: string, encounterType?: EncounterType) {
    const apiKey = getAnthropicApiKey();
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is missing. Add it to .env.local or re-enable mock mode.");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: getAnthropicModel(),
        max_tokens: 2200,
        temperature: 0.1,
        system: "You produce structured cardiology documentation outputs for clinician review.",
        messages: [{ role: "user", content: buildPrompt(transcript, encounterType) }],
      }),
    });

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("Claude note generation failed", json);
      throw new Error(json.error?.message || "Claude note generation failed.");
    }

    const text = (json.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text || "")
      .join("\n")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("Structured note JSON parse failed", text, error);
      throw new Error("Model did not return valid structured JSON.");
    }

    const structured = sanitizeOutput(parseOutput(parsed, encounterType), transcript, encounterType);

    return {
      soapNote: renderStructuredOutput(structured),
      structured,
    };
  }
}

import {
  buildConsultantLetterPrompt,
  buildDischargeSummaryPrompt,
  buildStructuredCardiacPrompt,
  coerceConsultantLetter,
  coerceDischargeSummary,
  coerceStructuredCardiacNote,
  getDocumentType,
  getMiniMaxApiKey,
  getMiniMaxModel,
  renderStructuredOutput,
  sanitizeConsultantLetter,
  sanitizeDischargeSummary,
  sanitizeStructuredCardiacNote,
} from "@/lib/minimax";
import type { EncounterType, StructuredOutput } from "@/lib/types";
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

function normalizeJsonLikeText(input: string) {
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1");
}

function extractJsonPayload(text: string) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Model returned empty content.");

  const withoutThinking = trimmed.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
  const fencedMatch = withoutThinking.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() || withoutThinking;

  const directParsers = [candidate, trimmed].flatMap((value) => [value, normalizeJsonLikeText(value)]);
  for (const attempt of directParsers) {
    try {
      return JSON.parse(attempt);
    } catch {
      // keep trying
    }
  }

  const starts = [candidate.indexOf("{"), candidate.indexOf("[")].filter((index) => index >= 0);
  if (!starts.length) {
    throw new Error("Model did not return valid structured JSON.");
  }

  const start = Math.min(...starts);
  const openChar = candidate[start];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < candidate.length; i += 1) {
    const char = candidate[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === openChar) depth += 1;
    if (char === closeChar) depth -= 1;

    if (depth === 0) {
      const slice = candidate.slice(start, i + 1);
      for (const attempt of [slice, normalizeJsonLikeText(slice)]) {
        try {
          return JSON.parse(attempt);
        } catch {
          // keep trying
        }
      }
    }
  }

  throw new Error("Model did not return valid structured JSON.");
}

export class MiniMaxNoteProvider implements NoteProvider {
  async generateNote(transcript: string, encounterType?: EncounterType) {
    const apiKey = getMiniMaxApiKey();
    if (!apiKey) {
      throw new Error("MINIMAX_API_KEY is missing. Add it to .env.local or re-enable mock mode.");
    }

    const response = await fetch("https://api.minimax.io/v1/text/chatcompletion_v2", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getMiniMaxModel(),
        temperature: 0.1,
        max_completion_tokens: 2200,
        messages: [
          {
            role: "system",
            name: "MiniMax AI",
            content:
              "You produce structured cardiology documentation outputs for clinician review. Return exactly one valid JSON object only. Use double-quoted JSON keys and strings. Do not include markdown fences, commentary, preambles, trailing notes, or any text outside the JSON. Do not leave trailing commas.",
          },
          { role: "user", name: "user", content: buildPrompt(transcript, encounterType) },
        ],
      }),
    });

    const json = (await response.json()) as {
      id?: string;
      choices?: Array<{
        message?: {
          content?: string;
          reasoning_content?: string;
          role?: string;
          name?: string;
        };
        delta?: { content?: string; role?: string };
        finish_reason?: string;
        index?: number;
      }>;
      base_resp?: { status_code?: number; status_msg?: string };
      error?: { message?: string };
      [key: string]: unknown;
    };

    if (!response.ok || (json.base_resp?.status_code && json.base_resp.status_code !== 0)) {
      console.error("MiniMax note generation failed", json);
      throw new Error(json.error?.message || json.base_resp?.status_msg || "MiniMax note generation failed.");
    }

    const text = [
      json.choices?.[0]?.message?.content,
      json.choices?.[0]?.message?.reasoning_content,
      json.choices?.[0]?.delta?.content,
      typeof json.content === "string" ? json.content : "",
    ]
      .find((value) => typeof value === "string" && value.trim())
      ?.trim() || "";
    let parsed: unknown;
    try {
      parsed = extractJsonPayload(text);
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

// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

import { getOpenAIApiKey } from "@/lib/openai";
import type { TranscriptSpeaker, TranscriptSpeakerLine } from "@/lib/types";

type SpeakerLabel = TranscriptSpeaker;
type SpeakerLine = TranscriptSpeakerLine;

const genericSpeakers = new Set<SpeakerLabel>(["Unknown", "Speaker 1", "Speaker 2", "Speaker 3"]);

function getTranscriptPostprocessModel() {
  return process.env.OPENAI_TRANSCRIPT_POSTPROCESS_MODEL || "gpt-4.1-mini";
}

function buildPrompt(transcript: string) {
  return [
    "You are post-processing a clinical audio transcript for a NZ cardiology documentation tool.",
    "Your job is ONLY to segment by speaker and assign conservative role labels.",
    "Do not summarize, rewrite, beautify, explain, or add details that were not present.",
    "Keep the wording source-faithful and conservative.",
    "Output must stay in English.",
    "If a role is uncertain, use Unknown or Speaker 1 / Speaker 2 / Speaker 3 rather than guessing.",
    "Prefer Doctor, Patient, Nurse only when strongly supported by the wording.",
    "Questioning, counselling, plan statements, and ordering language often indicate Doctor, but only if the wording clearly supports that.",
    "First-person symptom reporting often indicates Patient, but only if clearly supported by the wording.",
    "Observation handover language, telemetry/obs/fluid-balance reporting often indicates Nurse, but only if clearly supported by the wording.",
    "Keep speaker continuity stable. Avoid unnecessary speaker changes for consecutive lines that sound like the same person continuing.",
    "Do not invent vital signs, diagnoses, medications, plans, or missing context.",
    "Return JSON only in the shape: { \"lines\": [{ \"speaker\": \"Doctor\", \"text\": \"...\" }] }",
    "Transcript:",
    transcript,
  ].join("\n\n");
}

function normalizeSpeakerLabel(label: string | undefined): SpeakerLabel {
  const cleaned = label?.trim();
  if (!cleaned) return "Unknown";
  if (cleaned === "Doctor" || cleaned === "Patient" || cleaned === "Nurse" || cleaned === "Family") return cleaned;
  if (cleaned === "Speaker 1" || cleaned === "Speaker 2" || cleaned === "Speaker 3") return cleaned;
  return "Unknown";
}

function scoreMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function inferRoleFromText(text: string, currentSpeaker: SpeakerLabel): SpeakerLabel {
  if (!genericSpeakers.has(currentSpeaker)) return currentSpeaker;

  const normalized = text.toLowerCase();

  const doctorCues = [
    /\bwhat brings you in\b/,
    /\bany chest pain\b/,
    /\bany shortness of breath\b/,
    /\bcontinue\b.*\b(furosemide|metoprolol|amiodarone|apixaban)\b/,
    /\bplan\b/,
    /\bwe'?ll\b/,
    /\blet'?s\b/,
    /\bcheck\b.*\b(ecg|troponins?|echo|u&e|labs?)\b/,
    /\bdischarge\b/,
    /\breview\b.*\b(tomorrow|later|today)\b/,
  ];

  const patientCues = [
    /\bi have\b/,
    /\bi'?ve been\b/,
    /\bi feel\b/,
    /\bi am\b/,
    /\bmy chest\b/,
    /\bi'?m short of breath\b/,
    /\bi still feel\b/,
    /\bno chest pain\b/,
    /\bno shortness of breath\b/,
  ];

  const nurseCues = [
    /\bnursing staff\b/,
    /\btelemetry showed\b/,
    /\bobs\b/,
    /\bfluid balance\b/,
    /\burine output\b/,
    /\bweight is down\b/,
    /\bblood pressure\b.*\bheart rate\b/,
    /\bnoted overnight\b/,
  ];

  const scores = [
    { speaker: "Doctor" as SpeakerLabel, score: scoreMatches(normalized, doctorCues) },
    { speaker: "Patient" as SpeakerLabel, score: scoreMatches(normalized, patientCues) },
    { speaker: "Nurse" as SpeakerLabel, score: scoreMatches(normalized, nurseCues) },
  ].sort((a, b) => b.score - a.score);

  const best = scores[0];
  const second = scores[1];

  if (!best || best.score < 2) return currentSpeaker;
  if (second && best.score === second.score) return currentSpeaker;

  return best.speaker;
}

function smoothSpeakerLines(lines: SpeakerLine[]) {
  const normalized = lines
    .map((line) => ({
      speaker: inferRoleFromText(line.text?.trim() || "", normalizeSpeakerLabel(line.speaker)),
      text: line.text?.trim() || "",
    }))
    .filter((line) => line.text);

  for (let index = 1; index < normalized.length - 1; index += 1) {
    const previous = normalized[index - 1];
    const current = normalized[index];
    const next = normalized[index + 1];

    if (genericSpeakers.has(current.speaker) && previous.speaker === next.speaker && !genericSpeakers.has(previous.speaker)) {
      current.speaker = previous.speaker;
    }
  }

  const merged: SpeakerLine[] = [];

  for (const line of normalized) {
    const last = merged[merged.length - 1];
    if (last && last.speaker === line.speaker) {
      last.text = `${last.text} ${line.text}`.replace(/\s+/g, " ").trim();
      continue;
    }
    merged.push({ ...line });
  }

  return merged;
}

function formatSpeakerTranscript(lines: SpeakerLine[]) {
  return lines
    .map((line) => {
      const speaker = line.speaker?.trim();
      const text = line.text?.trim();
      if (!speaker || !text) return "";
      return `${speaker}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

export class TranscriptPostProcessor {
  async enhance(transcript: string): Promise<{ transcript: string; speakerLines: TranscriptSpeakerLine[] }> {
    const apiKey = getOpenAIApiKey();
    if (!apiKey || !transcript.trim()) return { transcript, speakerLines: [] };

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: getTranscriptPostprocessModel(),
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You only restructure transcripts into conservative speaker-labelled English lines. Never add facts. If uncertain, keep labels generic.",
            },
            {
              role: "user",
              content: buildPrompt(transcript),
            },
          ],
        }),
      });

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      if (!response.ok) {
        console.error("Transcript post-processing failed", json);
        return { transcript, speakerLines: [] };
      }

      const content = json.choices?.[0]?.message?.content?.trim();
      if (!content) return { transcript, speakerLines: [] };

      const parsed = JSON.parse(content) as { lines?: SpeakerLine[] };
      if (!parsed.lines?.length) return { transcript, speakerLines: [] };

      const speakerLines = smoothSpeakerLines(parsed.lines);
      const formatted = formatSpeakerTranscript(speakerLines);
      return {
        transcript: formatted || transcript,
        speakerLines,
      };
    } catch (error) {
      console.error("Transcript post-processing failed", error);
      return { transcript, speakerLines: [] };
    }
  }
}

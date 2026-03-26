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
    "Your job is ONLY to segment by speaker and assign conservative labels.",
    "Default to generic labels such as Speaker 1 / Speaker 2 / Speaker 3 unless the role is very clear from the words themselves.",
    "Do not summarize, rewrite, beautify, explain, or add details that were not present.",
    "Keep the wording source-faithful and conservative.",
    "Output must stay in English.",
    "If a role is uncertain, use Unknown or Speaker 1 / Speaker 2 / Speaker 3 rather than guessing.",
    "Only use Doctor, Patient, Nurse, or Family when the wording is strongly and explicitly supportive.",
    "Do not infer Nurse from ordinary clinician questioning alone.",
    "Keep speaker continuity stable. Avoid unnecessary speaker changes for consecutive lines that sound like the same person continuing.",
    "Do not invent vital signs, diagnoses, medications, plans, or missing context.",
    "Return JSON only in the shape: { \"lines\": [{ \"speaker\": \"Speaker 1\", \"text\": \"...\" }] }",
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

  const explicitDoctorCues = [
    /\bi(?:'m| am) (?:a )?(?:doctor|dr|medical student|registrar|house officer)\b/,
    /\bworking with dr\.?\b/,
  ];

  const doctorCues = [
    /\bwhat brings you in\b/,
    /\bany chest pain\b/,
    /\bany shortness of breath\b/,
    /\bcontinue\b.*\b(furosemide|metoprolol|amiodarone|apixaban)\b/,
    /\bcheck\b.*\b(ecg|troponins?|echo|u&e|labs?)\b/,
    /\breview\b.*\b(tomorrow|later|today)\b/,
    /\bwe'?ll\b/,
    /\blet'?s\b/,
  ];

  const patientCues = [
    /\bi have\b/,
    /\bi'?ve been\b/,
    /\bi feel\b/,
    /\bi am\b/,
    /\bi'?m\b/,
    /\bmy chest\b/,
    /\bmy neck\b/,
    /\bi'?m short of breath\b/,
    /\bi still feel\b/,
    /\bno chest pain\b/,
    /\bno shortness of breath\b/,
  ];

  const explicitNurseCues = [
    /\bi(?:'m| am) (?:the )?nurse\b/,
    /\bthis is nursing handover\b/,
    /\bnursing staff\b/,
  ];

  if (scoreMatches(normalized, explicitDoctorCues) >= 1) return "Doctor";
  if (scoreMatches(normalized, explicitNurseCues) >= 1) return "Nurse";

  const doctorScore = scoreMatches(normalized, doctorCues);
  const patientScore = scoreMatches(normalized, patientCues);

  if (patientScore >= 2 && patientScore > doctorScore) return "Patient";
  if (doctorScore >= 3 && doctorScore > patientScore + 1) return "Doctor";

  return currentSpeaker;
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
                "You only restructure transcripts into conservative speaker-labelled English lines. Default to generic speaker labels. Never add facts. If uncertain, keep labels generic.",
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

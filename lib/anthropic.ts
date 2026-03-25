import Anthropic from "@anthropic-ai/sdk";

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
}

export function buildSoapPrompt(transcript: string, encounterType = "GP consultation") {
  return [
    "You are a clinical documentation assistant.",
    `Encounter type: ${encounterType}.`,
    "Generate a concise draft SOAP note for clinician review.",
    "Requirements:",
    "- Use exactly these section headings: Subjective, Objective, Assessment, Plan",
    "- Only include facts explicitly supported by the transcript",
    "- If something is not stated, omit it rather than guessing",
    "- Be clinically conservative and concise",
    "- Do not add billing language or meta commentary",
    "- This is a draft note, not a final signed medical record",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

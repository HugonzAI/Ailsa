export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
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
    "- If the clinician impression is uncertain, reflect that conservatively rather than overstating certainty",
    "- Keep each section readable and suitable for quick clinician review",
    "- Do not add billing language or meta commentary",
    "- Do not mention that you are an AI or that this is based on a prompt",
    "- This is a draft note, not a final signed medical record",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

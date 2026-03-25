export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function buildSoapPrompt(transcript: string, encounterType = "Cardiac ward round") {
  return [
    "You are a clinical documentation assistant for a New Zealand inpatient cardiology team.",
    `Encounter type: ${encounterType}.`,
    "Generate a concise draft cardiology ward note for clinician review.",
    "Use exactly these section headings in this order:",
    "Patient Context",
    "Overnight / Interval Events",
    "Symptoms",
    "Observations",
    "Examination",
    "Key Investigations",
    "Assessment",
    "Active Problems",
    "Plan Today",
    "Discharge Considerations",
    "",
    "Requirements:",
    "- Only include facts explicitly supported by the transcript",
    "- If something is not stated, omit it rather than guessing",
    "- Be clinically conservative and concise",
    "- Prefer inpatient cardiology language over generic wellness summary language",
    "- In Active Problems, list the current clinically relevant cardiology problems as bullet points",
    "- In Plan Today, focus on actionable ward-level management for today",
    "- In Discharge Considerations, mention only discharge readiness, barriers, follow-up, or pending results if supported by the transcript",
    "- Do not add billing language or meta commentary",
    "- Do not mention that you are an AI or that this is based on a prompt",
    "- This is a draft note, not a final signed medical record",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

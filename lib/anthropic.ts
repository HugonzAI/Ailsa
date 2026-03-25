import type { StructuredCardiacNote } from "@/lib/types";

export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function emptyStructuredNote(): StructuredCardiacNote {
  return {
    patientContext: "",
    overnightEvents: "",
    symptoms: "",
    observations: "",
    examination: "",
    keyInvestigations: "",
    assessment: "",
    activeProblems: [],
    planToday: [],
    dischargeConsiderations: "",
  };
}

export function buildStructuredCardiacPrompt(transcript: string, encounterType = "Cardiac ward round") {
  return [
    "You are a clinical documentation assistant for a New Zealand inpatient cardiology team.",
    `Encounter type: ${encounterType}.`,
    "Return only valid JSON.",
    "Do not wrap the JSON in markdown fences.",
    "Do not include explanatory text before or after the JSON.",
    "Write like a registrar or house officer drafting a concise ward note.",
    "Only include facts explicitly supported by the transcript.",
    "If something is not stated, use an empty string or empty array rather than guessing.",
    "Use this exact JSON shape:",
    '{',
    '  "patientContext": "",',
    '  "overnightEvents": "",',
    '  "symptoms": "",',
    '  "observations": "",',
    '  "examination": "",',
    '  "keyInvestigations": "",',
    '  "assessment": "",',
    '  "activeProblems": [""],',
    '  "planToday": [""],',
    '  "dischargeConsiderations": ""',
    '}',
    "Requirements:",
    "- Keep strings compact and clinically styled",
    "- activeProblems should be a short list of current cardiology problems",
    "- planToday should be a short list of concrete ward actions for today",
    "- dischargeConsiderations should mention readiness, barriers, or follow-up only if supported by the transcript",
    "- Do not invent demographics, comorbidities, or results that are not stated",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

export function renderStructuredNote(note: StructuredCardiacNote) {
  return [
    "Patient Context",
    note.patientContext || "",
    "",
    "Overnight / Interval Events",
    note.overnightEvents || "",
    "",
    "Symptoms",
    note.symptoms || "",
    "",
    "Observations",
    note.observations || "",
    "",
    "Examination",
    note.examination || "",
    "",
    "Key Investigations",
    note.keyInvestigations || "",
    "",
    "Assessment",
    note.assessment || "",
    "",
    "Active Problems",
    ...(note.activeProblems.length ? note.activeProblems.map((item) => `- ${item}`) : [""]),
    "",
    "Plan Today",
    ...(note.planToday.length ? note.planToday.map((item) => `- ${item}`) : [""]),
    "",
    "Discharge Considerations",
    note.dischargeConsiderations || "",
  ].join("\n").trim();
}

export function coerceStructuredCardiacNote(input: unknown): StructuredCardiacNote {
  const data = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;

  const toStringValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const toStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

  return {
    patientContext: toStringValue(data.patientContext),
    overnightEvents: toStringValue(data.overnightEvents),
    symptoms: toStringValue(data.symptoms),
    observations: toStringValue(data.observations),
    examination: toStringValue(data.examination),
    keyInvestigations: toStringValue(data.keyInvestigations),
    assessment: toStringValue(data.assessment),
    activeProblems: toStringArray(data.activeProblems),
    planToday: toStringArray(data.planToday),
    dischargeConsiderations: toStringValue(data.dischargeConsiderations),
  };
}

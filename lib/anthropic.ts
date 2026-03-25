import type { PatientContext, StructuredCardiacNote } from "@/lib/types";

export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function emptyPatientContext(): PatientContext {
  return {
    explicitDemographics: "",
    explicitAdmissionReason: "",
    explicitCardiacBackground: [],
  };
}

export function emptyStructuredNote(): StructuredCardiacNote {
  return {
    patientContext: emptyPatientContext(),
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
    "Do not infer sex, age, ward location, admission reason, or background diagnosis unless the transcript explicitly states them.",
    "If a diagnosis is only implied rather than explicitly stated, phrase it conservatively in assessment instead of placing it as a hard patient-context fact.",
    "Use this exact JSON shape:",
    '{',
    '  "patientContext": {',
    '    "explicitDemographics": "",',
    '    "explicitAdmissionReason": "",',
    '    "explicitCardiacBackground": [""]',
    '  },',
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
    "- Prefer ward-round shorthand over polished explanatory prose",
    "- Observations should read like compact monitoring data, not full sentences, when possible",
    "- Assessment should usually be one short clinically conservative summary line",
    "- activeProblems should be a short list of current cardiology problems",
    "- planToday should be a short list of concrete ward actions for today using terse action-oriented wording",
    "- dischargeConsiderations should mention readiness, barriers, or follow-up only if supported by the transcript",
    "- Do not invent demographics, comorbidities, admission details, or results that are not stated",
    "- patientContext should be especially strict: if not explicit in the transcript, leave it blank or partial rather than filling gaps",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

function formatPatientContext(context: PatientContext) {
  const parts = [
    context.explicitDemographics,
    context.explicitAdmissionReason,
    ...(context.explicitCardiacBackground.length ? [`Background: ${context.explicitCardiacBackground.join('; ')}`] : []),
  ].filter(Boolean);

  return parts.join("\n");
}

export function renderStructuredNote(note: StructuredCardiacNote) {
  return [
    "Patient Context",
    formatPatientContext(note.patientContext),
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

function coercePatientContext(value: unknown): PatientContext {
  const data = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const toStringValue = (input: unknown) => (typeof input === "string" ? input.trim() : "");
  const toStringArray = (input: unknown) =>
    Array.isArray(input) ? input.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

  return {
    explicitDemographics: toStringValue(data.explicitDemographics),
    explicitAdmissionReason: toStringValue(data.explicitAdmissionReason),
    explicitCardiacBackground: toStringArray(data.explicitCardiacBackground),
  };
}

export function sanitizeStructuredCardiacNote(note: StructuredCardiacNote, transcript: string): StructuredCardiacNote {
  const lower = transcript.toLowerCase();

  const hasExplicitSex = /\b(female|male|woman|man)\b/i.test(transcript);
  const hasExplicitAdmission = /(admitted with|admitted for|reason for admission|primary reason for admission|presented with chest pain|presented with syncope|presented with dyspnoea)/i.test(lower);
  const hasExplicitBackground = /(history of|past medical history|pmhx|known to have|background of|prior pci|prior cabg|known hfrEF|known hf|known af|known ischaemic heart disease)/i.test(lower);

  return {
    ...note,
    patientContext: {
      explicitDemographics: hasExplicitSex ? note.patientContext.explicitDemographics : "",
      explicitAdmissionReason: hasExplicitAdmission ? note.patientContext.explicitAdmissionReason : "",
      explicitCardiacBackground: hasExplicitBackground ? note.patientContext.explicitCardiacBackground : [],
    },
  };
}

export function coerceStructuredCardiacNote(input: unknown): StructuredCardiacNote {
  const data = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;

  const toStringValue = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const toStringArray = (value: unknown) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];

  return {
    patientContext: coercePatientContext(data.patientContext),
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

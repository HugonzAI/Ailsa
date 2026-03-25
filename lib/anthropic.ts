import type { EvidenceSupportItem, PatientContext, StructuredCardiacNote, TaskItem } from "@/lib/types";

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
    tasksAllocated: [],
    actionSummary: [],
    nextReview: "",
    escalationsSafetyConcerns: "",
    dischargeConsiderations: "",
    evidenceSupport: [],
    evidenceLimitations: [],
  };
}

export function buildStructuredCardiacPrompt(transcript: string, encounterType = "Cardiac ward round") {
  return [
    "You are a clinical documentation assistant for a New Zealand inpatient cardiology team.",
    `Encounter type: ${encounterType}.`,
    "Return only valid JSON.",
    "Do not wrap the JSON in markdown fences.",
    "Do not include explanatory text before or after the JSON.",
    "Write like a registrar or house officer drafting a concise ward note or handover note.",
    "Only include facts explicitly supported by the transcript.",
    "If something is not stated, use an empty string or empty array rather than guessing.",
    "Do not infer sex, age, ward location, admission reason, or background diagnosis unless the transcript explicitly states them.",
    "If a diagnosis is only implied rather than explicitly stated, phrase it conservatively in assessment instead of placing it as a hard patient-context fact.",
    "Evidence support must stay separate from the note body. Do not turn the note itself into a long explanation.",
    "For evidenceSupport: only provide conservative, guideline-aware support statements that are clearly tied to transcript-supported clinical framing. If unsure, leave evidenceSupport empty.",
    "Do not pretend to quote a paper or guideline you cannot clearly support. citationLabel should be generic unless explicitly grounded elsewhere.",
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
    '  "tasksAllocated": [{ "task": "", "owner": "", "timing": "", "urgency": "" }],',
    '  "actionSummary": [""],',
    '  "nextReview": "",',
    '  "escalationsSafetyConcerns": "",',
    '  "dischargeConsiderations": "",',
    '  "evidenceSupport": [{ "claim": "", "rationale": "", "evidenceType": "guideline", "confidence": "low", "citationLabel": "" }],',
    '  "evidenceLimitations": [""]',
    '}',
    "Requirements:",
    "- Keep strings compact and clinically styled",
    "- Prefer ward-round shorthand over polished explanatory prose",
    "- Observations should read like compact monitoring data, not full sentences, when possible",
    "- Assessment should usually be one short clinically conservative summary line",
    "- activeProblems should be a short list of current cardiology problems",
    "- planToday should be a short list of concrete ward actions for today using terse action-oriented wording",
    "- tasksAllocated should only include clearly attributable tasks from the transcript; leave owner/timing/urgency blank if not stated",
    "- actionSummary should be a concise list of the highest-priority actions coming out of the note",
    "- nextReview should mention next review timing or trigger only if supported by the transcript",
    "- escalationsSafetyConcerns should be blank unless the transcript explicitly mentions a risk, escalation concern, or safety issue",
    "- dischargeConsiderations should mention readiness, barriers, or follow-up only if supported by the transcript",
    "- evidenceSupport is optional and separate from the note body",
    "- evidenceSupport items should be short, conservative, and framed as support/context rather than orders",
    "- evidenceSupport claim must be traceable to transcript-supported syndrome framing, common work-up logic, or risk-flag logic",
    "- evidenceLimitations should capture what is missing or why evidence support is limited if relevant",
    "- Do not invent demographics, comorbidities, admission details, results, or literature citations that are not stated",
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

function formatTask(task: TaskItem) {
  const parts = [task.task, task.owner, task.timing, task.urgency].filter(Boolean);
  return parts.join(" — ");
}

function formatEvidenceItem(item: EvidenceSupportItem) {
  const meta = [item.evidenceType, item.confidence, item.citationLabel].filter(Boolean).join(" | ");
  const body = [item.claim, item.rationale].filter(Boolean).join(" — ");
  return meta ? `${body} (${meta})` : body;
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
    "Tasks Allocated",
    ...(note.tasksAllocated.length ? note.tasksAllocated.map((item) => `- ${formatTask(item)}`) : [""]),
    "",
    "Action Summary",
    ...(note.actionSummary.length ? note.actionSummary.map((item) => `- ${item}`) : [""]),
    "",
    "Next Review",
    note.nextReview || "",
    "",
    "Escalations / Safety Concerns",
    note.escalationsSafetyConcerns || "",
    "",
    "Discharge Considerations",
    note.dischargeConsiderations || "",
    "",
    "Evidence Support",
    ...(note.evidenceSupport.length ? note.evidenceSupport.map((item) => `- ${formatEvidenceItem(item)}`) : [""]),
    "",
    "Evidence Limitations",
    ...(note.evidenceLimitations.length ? note.evidenceLimitations.map((item) => `- ${item}`) : [""]),
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

function coerceTaskItems(value: unknown): TaskItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const data = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
      return {
        task: typeof data.task === "string" ? data.task.trim() : "",
        owner: typeof data.owner === "string" ? data.owner.trim() : "",
        timing: typeof data.timing === "string" ? data.timing.trim() : "",
        urgency: typeof data.urgency === "string" ? data.urgency.trim() : "",
      };
    })
    .filter((item) => item.task || item.owner || item.timing || item.urgency);
}

function coerceEvidenceItems(value: unknown): EvidenceSupportItem[] {
  if (!Array.isArray(value)) return [];

  const evidenceTypes = new Set(["guideline", "common-practice", "risk-flag"]);
  const confidenceTypes = new Set(["low", "medium", "high"]);

  return value
    .map((item) => {
      const data = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
      const claim = typeof data.claim === "string" ? data.claim.trim() : "";
      const rationale = typeof data.rationale === "string" ? data.rationale.trim() : "";
      const evidenceType = typeof data.evidenceType === "string" && evidenceTypes.has(data.evidenceType) ? data.evidenceType : "common-practice";
      const confidence = typeof data.confidence === "string" && confidenceTypes.has(data.confidence) ? data.confidence : "low";
      const citationLabel = typeof data.citationLabel === "string" ? data.citationLabel.trim() : "";

      return {
        claim,
        rationale,
        evidenceType: evidenceType as EvidenceSupportItem["evidenceType"],
        confidence: confidence as EvidenceSupportItem["confidence"],
        citationLabel,
      };
    })
    .filter((item) => item.claim || item.rationale);
}

function extractNextReview(transcript: string, currentValue: string) {
  if (currentValue.trim()) return currentValue.trim();

  const patterns = [
    /review after ([^.\n]+)/i,
    /follow(?:ing)? ([^.\n]+ results)/i,
    /reassess ([^.\n]+)/i,
    /review (tomorrow[^.\n]*)/i,
    /(within 24(?: to 48)? hours[^.\n]*)/i,
    /(24 to 48 hours[^.\n]*)/i,
    /(pending investigations[^.\n]*)/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match?.[1]) {
      const value = match[0].trim().replace(/\s+/g, " ");
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
  }

  return "";
}

export function sanitizeStructuredCardiacNote(note: StructuredCardiacNote, transcript: string): StructuredCardiacNote {
  const lower = transcript.toLowerCase();

  const hasExplicitSex = /\b(female|male|woman|man)\b/i.test(transcript);
  const hasExplicitAdmission = /(admitted with|admitted for|reason for admission|primary reason for admission|presented with chest pain|presented with syncope|presented with dyspnoea)/i.test(lower);
  const hasExplicitBackground = /(history of|past medical history|pmhx|known to have|background of|prior pci|prior cabg|known hfre?f|known hf|known af|known ischaemic heart disease)/i.test(lower);
  const hasEscalationSignal = /(escalat|safety|concern|watch closely|unstable|review urgently|if deteriorates|if worsens)/i.test(lower);
  const hasNextReviewSignal = /(review tomorrow|review later|next review|following results|after results|reassess tomorrow|within 24|24 to 48 hours|pending investigations|review after)/i.test(lower);
  const mentionGuidelineSource = /(guideline|evidence|acs|angina|heart failure|atrial fibrillation|arrhythmia|troponin|stress test|angiography|telemetry|ecg|echo)/i.test(lower);

  return {
    ...note,
    patientContext: {
      explicitDemographics: hasExplicitSex ? note.patientContext.explicitDemographics : "",
      explicitAdmissionReason: hasExplicitAdmission ? note.patientContext.explicitAdmissionReason : "",
      explicitCardiacBackground: hasExplicitBackground ? note.patientContext.explicitCardiacBackground : [],
    },
    nextReview: hasNextReviewSignal ? extractNextReview(transcript, note.nextReview) : "",
    escalationsSafetyConcerns: hasEscalationSignal ? note.escalationsSafetyConcerns : "",
    tasksAllocated: note.tasksAllocated
      .map((task) => ({
        ...task,
        urgency: task.urgency && new RegExp(`\\b${task.urgency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(transcript) ? task.urgency : "",
      }))
      .filter((task) => task.task),
    actionSummary: note.actionSummary.filter(Boolean),
    evidenceSupport: mentionGuidelineSource
      ? note.evidenceSupport
          .map((item) => ({
            ...item,
            citationLabel: /guideline|consensus|esc|aha|acc|nz/i.test(item.citationLabel) ? item.citationLabel : item.citationLabel || "General cardiology guidance",
          }))
          .filter((item) => item.claim && item.rationale)
      : [],
    evidenceLimitations: note.evidenceLimitations.filter(Boolean),
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
    tasksAllocated: coerceTaskItems(data.tasksAllocated),
    actionSummary: toStringArray(data.actionSummary),
    nextReview: toStringValue(data.nextReview),
    escalationsSafetyConcerns: toStringValue(data.escalationsSafetyConcerns),
    dischargeConsiderations: toStringValue(data.dischargeConsiderations),
    evidenceSupport: coerceEvidenceItems(data.evidenceSupport),
    evidenceLimitations: toStringArray(data.evidenceLimitations),
  };
}

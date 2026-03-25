import type {
  ConsultantAssessmentPlanItem,
  ConsultantMedicationGroups,
  ConsultantReferralContext,
  DocumentType,
  EncounterType,
  EvidenceSupportItem,
  PatientContext,
  StructuredCardiacNote,
  StructuredConsultantLetter,
  StructuredDischargeSummary,
  StructuredOutput,
  TaskItem,
} from "@/lib/types";

export function getAnthropicApiKey() {
  return process.env.ANTHROPIC_API_KEY || null;
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export function getDocumentType(encounterType?: EncounterType): DocumentType {
  if (encounterType === "Cardiology consultant letter") return "cardiology_consultant_letter";
  if (encounterType === "Cardiac discharge") return "cardiac_discharge_summary";
  return "cardiac_inpatient_note";
}

export function emptyPatientContext(): PatientContext {
  return {
    explicitDemographics: "",
    explicitAdmissionReason: "",
    explicitCardiacBackground: [],
  };
}

export function emptyConsultantReferralContext(): ConsultantReferralContext {
  return {
    referrer: "",
    reasonForReferral: "",
    visitType: "",
    openingLine: "",
  };
}

export function emptyConsultantMedicationGroups(): ConsultantMedicationGroups {
  return {
    antithrombotics: [],
    antihypertensives: [],
    heartFailureMedications: [],
    lipidLoweringAgents: [],
    otherMedications: [],
  };
}

export function emptyStructuredNote(): StructuredCardiacNote {
  return {
    documentType: "cardiac_inpatient_note",
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

export function emptyConsultantLetter(): StructuredConsultantLetter {
  return {
    documentType: "cardiology_consultant_letter",
    referralContext: emptyConsultantReferralContext(),
    cardiacRiskFactors: [],
    cardiacHistory: [],
    otherMedicalHistory: [],
    currentMedications: emptyConsultantMedicationGroups(),
    allergies: [],
    socialHistory: [],
    presentingHistory: "",
    physicalExamination: "",
    investigations: [],
    summary: "",
    assessmentPlan: [],
    followUp: "",
    closing: "",
    evidenceSupport: [],
    evidenceLimitations: [],
  };
}

export function emptyDischargeSummary(): StructuredDischargeSummary {
  return {
    documentType: "cardiac_discharge_summary",
    patientContext: emptyPatientContext(),
    admissionCourse: "",
    keyInvestigations: [],
    procedures: [],
    dischargeDiagnoses: [],
    medicationChanges: [],
    dischargeStatus: "",
    followUpPlans: [],
    dischargeInstructions: [],
    pendingResults: [],
    escalationAdvice: "",
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
    '  "documentType": "cardiac_inpatient_note",',
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

export function buildConsultantLetterPrompt(transcript: string) {
  return [
    "You are a clinical documentation assistant drafting a cardiology consultant letter for clinician review.",
    "Return only valid JSON.",
    "Do not wrap the JSON in markdown fences.",
    "Do not include explanatory text before or after the JSON.",
    "Write in clear formal specialist-letter style rather than ward-round shorthand.",
    "Only include facts explicitly supported by the transcript.",
    "If something is not stated, use an empty string or empty array rather than guessing.",
    "Do not invent diagnoses, prior cardiac history, medications, allergies, or family history that are not explicitly mentioned.",
    "Use this exact JSON shape:",
    '{',
    '  "documentType": "cardiology_consultant_letter",',
    '  "referralContext": { "referrer": "", "reasonForReferral": "", "visitType": "", "openingLine": "" },',
    '  "cardiacRiskFactors": [""],',
    '  "cardiacHistory": [""],',
    '  "otherMedicalHistory": [""],',
    '  "currentMedications": {',
    '    "antithrombotics": [""],',
    '    "antihypertensives": [""],',
    '    "heartFailureMedications": [""],',
    '    "lipidLoweringAgents": [""],',
    '    "otherMedications": [""]',
    '  },',
    '  "allergies": [""],',
    '  "socialHistory": [""],',
    '  "presentingHistory": "",',
    '  "physicalExamination": "",',
    '  "investigations": [""],',
    '  "summary": "",',
    '  "assessmentPlan": [{ "problem": "", "assessment": "", "plan": "" }],',
    '  "followUp": "",',
    '  "closing": "",',
    '  "evidenceSupport": [{ "claim": "", "rationale": "", "evidenceType": "guideline", "confidence": "low", "citationLabel": "" }],',
    '  "evidenceLimitations": [""]',
    '}',
    "Requirements:",
    "- This is a consultant-letter draft, not a ward note",
    "- Allow fuller prose in presentingHistory and summary",
    "- Keep assessmentPlan structured by problem",
    "- Keep openingLine and closing optional; do not force them",
    "- Use evidenceSupport only as a separate conservative support layer, not as part of the letter body",
    "- citationLabel should stay generic unless clearly grounded elsewhere",
    "- If there is no explicit allergy information, leave allergies empty rather than writing none known",
    "- If there is no explicit cardiac history, leave cardiacHistory empty or include only clearly stated negatives like 'No known prior cardiac history' if the transcript truly says that",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

export function buildDischargeSummaryPrompt(transcript: string) {
  return [
    "You are a clinical documentation assistant drafting a cardiac discharge summary for clinician review.",
    "Return only valid JSON.",
    "Do not wrap the JSON in markdown fences.",
    "Do not include explanatory text before or after the JSON.",
    "Write in concise discharge-summary style: clinically clear, more complete than a ward note, but not essay-like.",
    "Only include facts explicitly supported by the transcript.",
    "If something is not stated, use an empty string or empty array rather than guessing.",
    "Do not invent diagnoses, procedures, discharge medications, follow-up, or pending results.",
    "Use this exact JSON shape:",
    '{',
    '  "documentType": "cardiac_discharge_summary",',
    '  "patientContext": { "explicitDemographics": "", "explicitAdmissionReason": "", "explicitCardiacBackground": [""] },',
    '  "admissionCourse": "",',
    '  "keyInvestigations": [""],',
    '  "procedures": [""],',
    '  "dischargeDiagnoses": [""],',
    '  "medicationChanges": [""],',
    '  "dischargeStatus": "",',
    '  "followUpPlans": [""],',
    '  "dischargeInstructions": [""],',
    '  "pendingResults": [""],',
    '  "escalationAdvice": "",',
    '  "evidenceSupport": [{ "claim": "", "rationale": "", "evidenceType": "guideline", "confidence": "low", "citationLabel": "" }],',
    '  "evidenceLimitations": [""]',
    '}',
    "Requirements:",
    "- This is a discharge summary, not a ward note or consultant letter",
    "- Focus on admission course, discharge diagnoses, medication changes, follow-up, and pending items",
    "- Keep dischargeStatus concise and patient-state oriented",
    "- If discharge advice or follow-up is not explicit, leave it blank",
    "- evidenceSupport stays separate from the discharge body and should be conservative or empty",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

function formatPatientContext(context: PatientContext) {
  return [
    context.explicitDemographics,
    context.explicitAdmissionReason,
    ...(context.explicitCardiacBackground.length ? [`Background: ${context.explicitCardiacBackground.join('; ')}`] : []),
  ]
    .filter(Boolean)
    .join("\n");
}

function formatTask(task: TaskItem) {
  return [task.task, task.owner, task.timing, task.urgency].filter(Boolean).join(" — ");
}

function formatEvidenceItem(item: EvidenceSupportItem) {
  const meta = [item.evidenceType, item.confidence, item.citationLabel].filter(Boolean).join(" | ");
  const body = [item.claim, item.rationale].filter(Boolean).join(" — ");
  return meta ? `${body} (${meta})` : body;
}

function formatMedicationGroup(title: string, items: string[]) {
  return `${title}: ${items.length ? items.join('; ') : ''}`;
}

function formatAssessmentPlanItem(item: ConsultantAssessmentPlanItem, index: number) {
  return [
    `#${index + 1} ${item.problem}`.trim(),
    item.assessment ? `Assessment: ${item.assessment}` : "",
    item.plan ? `Plan: ${item.plan}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function renderStructuredOutput(output: StructuredOutput) {
  if (output.documentType === "cardiology_consultant_letter") {
    return [
      "Referral Context",
      [output.referralContext.openingLine, output.referralContext.referrer, output.referralContext.reasonForReferral, output.referralContext.visitType]
        .filter(Boolean)
        .join("\n"),
      "",
      "Cardiac Risk Factors",
      ...(output.cardiacRiskFactors.length ? output.cardiacRiskFactors.map((item) => `- ${item}`) : [""]),
      "",
      "Cardiac History",
      ...(output.cardiacHistory.length ? output.cardiacHistory.map((item) => `- ${item}`) : [""]),
      "",
      "Other Medical History",
      ...(output.otherMedicalHistory.length ? output.otherMedicalHistory.map((item) => `- ${item}`) : [""]),
      "",
      "Current Medications",
      formatMedicationGroup("Antithrombotics", output.currentMedications.antithrombotics),
      formatMedicationGroup("Antihypertensives", output.currentMedications.antihypertensives),
      formatMedicationGroup("Heart failure medications", output.currentMedications.heartFailureMedications),
      formatMedicationGroup("Lipid-lowering agents", output.currentMedications.lipidLoweringAgents),
      formatMedicationGroup("Other medications", output.currentMedications.otherMedications),
      "",
      "Allergies",
      ...(output.allergies.length ? output.allergies.map((item) => `- ${item}`) : [""]),
      "",
      "Social History",
      ...(output.socialHistory.length ? output.socialHistory.map((item) => `- ${item}`) : [""]),
      "",
      "Presenting History",
      output.presentingHistory || "",
      "",
      "Physical Examination",
      output.physicalExamination || "",
      "",
      "Investigations",
      ...(output.investigations.length ? output.investigations.map((item) => `- ${item}`) : [""]),
      "",
      "Summary",
      output.summary || "",
      "",
      "Assessment / Plan",
      ...(output.assessmentPlan.length ? output.assessmentPlan.map(formatAssessmentPlanItem) : [""]),
      "",
      "Follow Up",
      output.followUp || "",
      "",
      "Closing",
      output.closing || "",
      "",
      "Evidence Support",
      ...(output.evidenceSupport.length ? output.evidenceSupport.map((item) => `- ${formatEvidenceItem(item)}`) : [""]),
      "",
      "Evidence Limitations",
      ...(output.evidenceLimitations.length ? output.evidenceLimitations.map((item) => `- ${item}`) : [""]),
    ]
      .join("\n")
      .trim();
  }

  if (output.documentType === "cardiac_discharge_summary") {
    return [
      "Patient Context",
      formatPatientContext(output.patientContext),
      "",
      "Admission Course",
      output.admissionCourse || "",
      "",
      "Key Investigations",
      ...(output.keyInvestigations.length ? output.keyInvestigations.map((item) => `- ${item}`) : [""]),
      "",
      "Procedures",
      ...(output.procedures.length ? output.procedures.map((item) => `- ${item}`) : [""]),
      "",
      "Discharge Diagnoses",
      ...(output.dischargeDiagnoses.length ? output.dischargeDiagnoses.map((item) => `- ${item}`) : [""]),
      "",
      "Medication Changes",
      ...(output.medicationChanges.length ? output.medicationChanges.map((item) => `- ${item}`) : [""]),
      "",
      "Discharge Status",
      output.dischargeStatus || "",
      "",
      "Follow Up Plans",
      ...(output.followUpPlans.length ? output.followUpPlans.map((item) => `- ${item}`) : [""]),
      "",
      "Discharge Instructions",
      ...(output.dischargeInstructions.length ? output.dischargeInstructions.map((item) => `- ${item}`) : [""]),
      "",
      "Pending Results",
      ...(output.pendingResults.length ? output.pendingResults.map((item) => `- ${item}`) : [""]),
      "",
      "Escalation Advice",
      output.escalationAdvice || "",
      "",
      "Evidence Support",
      ...(output.evidenceSupport.length ? output.evidenceSupport.map((item) => `- ${formatEvidenceItem(item)}`) : [""]),
      "",
      "Evidence Limitations",
      ...(output.evidenceLimitations.length ? output.evidenceLimitations.map((item) => `- ${item}`) : [""]),
    ]
      .join("\n")
      .trim();
  }

  return [
    "Patient Context",
    formatPatientContext(output.patientContext),
    "",
    "Overnight / Interval Events",
    output.overnightEvents || "",
    "",
    "Symptoms",
    output.symptoms || "",
    "",
    "Observations",
    output.observations || "",
    "",
    "Examination",
    output.examination || "",
    "",
    "Key Investigations",
    output.keyInvestigations || "",
    "",
    "Assessment",
    output.assessment || "",
    "",
    "Active Problems",
    ...(output.activeProblems.length ? output.activeProblems.map((item) => `- ${item}`) : [""]),
    "",
    "Plan Today",
    ...(output.planToday.length ? output.planToday.map((item) => `- ${item}`) : [""]),
    "",
    "Tasks Allocated",
    ...(output.tasksAllocated.length ? output.tasksAllocated.map((item) => `- ${formatTask(item)}`) : [""]),
    "",
    "Action Summary",
    ...(output.actionSummary.length ? output.actionSummary.map((item) => `- ${item}`) : [""]),
    "",
    "Next Review",
    output.nextReview || "",
    "",
    "Escalations / Safety Concerns",
    output.escalationsSafetyConcerns || "",
    "",
    "Discharge Considerations",
    output.dischargeConsiderations || "",
    "",
    "Evidence Support",
    ...(output.evidenceSupport.length ? output.evidenceSupport.map((item) => `- ${formatEvidenceItem(item)}`) : [""]),
    "",
    "Evidence Limitations",
    ...(output.evidenceLimitations.length ? output.evidenceLimitations.map((item) => `- ${item}`) : [""]),
  ]
    .join("\n")
    .trim();
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function coercePatientContext(value: unknown): PatientContext {
  const data = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    explicitDemographics: toStringValue(data.explicitDemographics),
    explicitAdmissionReason: toStringValue(data.explicitAdmissionReason),
    explicitCardiacBackground: toStringArray(data.explicitCardiacBackground),
  };
}

function coerceConsultantReferralContext(value: unknown): ConsultantReferralContext {
  const data = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    referrer: toStringValue(data.referrer),
    reasonForReferral: toStringValue(data.reasonForReferral),
    visitType: toStringValue(data.visitType),
    openingLine: toStringValue(data.openingLine),
  };
}

function coerceConsultantMedicationGroups(value: unknown): ConsultantMedicationGroups {
  const data = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  return {
    antithrombotics: toStringArray(data.antithrombotics),
    antihypertensives: toStringArray(data.antihypertensives),
    heartFailureMedications: toStringArray(data.heartFailureMedications),
    lipidLoweringAgents: toStringArray(data.lipidLoweringAgents),
    otherMedications: toStringArray(data.otherMedications),
  };
}

function coerceTaskItems(value: unknown): TaskItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const data = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
      return {
        task: toStringValue(data.task),
        owner: toStringValue(data.owner),
        timing: toStringValue(data.timing),
        urgency: toStringValue(data.urgency),
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
      const evidenceType = toStringValue(data.evidenceType);
      const confidence = toStringValue(data.confidence);
      return {
        claim: toStringValue(data.claim),
        rationale: toStringValue(data.rationale),
        evidenceType: (evidenceTypes.has(evidenceType) ? evidenceType : "common-practice") as EvidenceSupportItem["evidenceType"],
        confidence: (confidenceTypes.has(confidence) ? confidence : "low") as EvidenceSupportItem["confidence"],
        citationLabel: toStringValue(data.citationLabel),
      };
    })
    .filter((item) => item.claim || item.rationale);
}

function coerceAssessmentPlan(value: unknown): ConsultantAssessmentPlanItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const data = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
      return {
        problem: toStringValue(data.problem),
        assessment: toStringValue(data.assessment),
        plan: toStringValue(data.plan),
      };
    })
    .filter((item) => item.problem || item.assessment || item.plan);
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

function sanitizeEvidenceSupportItems(
  items: EvidenceSupportItem[],
  transcript: string,
  options: { mode: "inpatient" | "consultant" },
) {
  const lower = transcript.toLowerCase();
  const syndromeSignals =
    options.mode === "consultant"
      ? /(angina|ischaemi|chest pain|chest pressure|dyspnoea|stress test|angiography|coronary|ecg|family history|risk factor)/i
      : /(heart failure|hfre?f|diuresis|fluid balance|telemetry|atrial fibrillation|arrhythmia|ecg|echo|troponin|congestion|renal function|electrolytes)/i;
  const hardCitationPattern = /(doi|nejm|lancet|circulation|jacc|eur heart j|pmid)/i;

  return items
    .map((item) => {
      const joined = `${item.claim} ${item.rationale}`.toLowerCase();
      const anchored = syndromeSignals.test(joined) && syndromeSignals.test(lower);
      const conservativeClaim = !/(must|definitely|confirmed|proves|diagnostic of|should be treated as)/i.test(joined);
      const normalizedConfidence = anchored ? item.confidence : "low";
      const normalizedCitation = hardCitationPattern.test(item.citationLabel)
        ? ""
        : /guideline|consensus|esc|aha|acc|nz/i.test(item.citationLabel)
          ? item.citationLabel
          : item.citationLabel || "General cardiology guidance";

      return {
        ...item,
        confidence: normalizedConfidence,
        citationLabel: normalizedCitation,
        _anchored: anchored,
        _conservativeClaim: conservativeClaim,
      };
    })
    .filter((item) => item.claim && item.rationale && item._anchored && item._conservativeClaim)
    .map(({ _anchored, _conservativeClaim, ...item }) => item);
}

function appendEvidenceLimitations(existing: string[], additions: string[]) {
  return Array.from(new Set([...existing.filter(Boolean), ...additions.filter(Boolean)]));
}

export function sanitizeStructuredCardiacNote(note: StructuredCardiacNote, transcript: string): StructuredCardiacNote {
  const lower = transcript.toLowerCase();
  const hasExplicitSex = /\b(female|male|woman|man)\b/i.test(transcript);
  const hasExplicitAdmission = /(admitted with|admitted for|reason for admission|primary reason for admission|presented with chest pain|presented with syncope|presented with dyspnoea)/i.test(lower);
  const hasExplicitBackground = /(history of|past medical history|pmhx|known to have|background of|prior pci|prior cabg|known hfre?f|known hf|known af|known ischaemic heart disease)/i.test(lower);
  const hasEscalationSignal = /(escalat|safety|concern|watch closely|unstable|review urgently|if deteriorates|if worsens)/i.test(lower);
  const hasNextReviewSignal = /(review tomorrow|review later|next review|following results|after results|reassess tomorrow|within 24|24 to 48 hours|pending investigations|review after)/i.test(lower);
  const hasEvidenceContext = /(heart failure|hfre?f|diuresis|fluid balance|telemetry|atrial fibrillation|arrhythmia|ecg|echo|troponin|stress test|angiography|renal function|electrolytes)/i.test(lower);
  const evidenceSupport = hasEvidenceContext ? sanitizeEvidenceSupportItems(note.evidenceSupport, transcript, { mode: "inpatient" }) : [];
  const evidenceLimitations = appendEvidenceLimitations(note.evidenceLimitations, [
    !hasEvidenceContext ? "Evidence support withheld because transcript support was too limited for safe cardiology-specific rationale." : "",
    !/(ecg|echo|troponin|telemetry|creatinine|electrolytes|stress test|angiography)/i.test(lower)
      ? "Key investigation detail is limited in the transcript, which narrows evidence-style support."
      : "",
  ]);

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
    evidenceSupport,
    evidenceLimitations,
  };
}

export function sanitizeConsultantLetter(letter: StructuredConsultantLetter, transcript: string): StructuredConsultantLetter {
  const lower = transcript.toLowerCase();
  const hasEvidenceContext = /(angina|coronary|chest pain|chest pressure|stress test|angiography|ecg|echo|family history|risk factor|hypertension|pre-diabetes|smok)/i.test(lower);
  const hasFollowUpSignal = /(follow[- ]?up|review after|pending investigations|sooner if|results)/i.test(lower);
  const hasReferrer = /(referred by|referral from|sent by dr|from dr\.?)/i.test(lower);
  const evidenceSupport = hasEvidenceContext ? sanitizeEvidenceSupportItems(letter.evidenceSupport, transcript, { mode: "consultant" }) : [];
  const evidenceLimitations = appendEvidenceLimitations(letter.evidenceLimitations, [
    !hasEvidenceContext ? "Evidence support withheld because the transcript did not provide enough consultant-letter clinical context." : "",
    !/(ecg|stress test|angiography|echo|troponin|blood work)/i.test(lower)
      ? "Investigation detail is limited, so evidence-style support remains conservative."
      : "",
  ]);

  return {
    ...letter,
    referralContext: {
      ...letter.referralContext,
      referrer: hasReferrer ? letter.referralContext.referrer : "",
    },
    cardiacRiskFactors: letter.cardiacRiskFactors.filter(Boolean),
    cardiacHistory: letter.cardiacHistory.filter(Boolean),
    otherMedicalHistory: letter.otherMedicalHistory.filter(Boolean),
    allergies: letter.allergies.filter(Boolean),
    socialHistory: letter.socialHistory.filter(Boolean),
    investigations: letter.investigations.filter(Boolean),
    assessmentPlan: letter.assessmentPlan.filter((item) => item.problem || item.assessment || item.plan),
    followUp: hasFollowUpSignal ? letter.followUp : "",
    evidenceSupport,
    evidenceLimitations,
  };
}

export function sanitizeDischargeSummary(summary: StructuredDischargeSummary, transcript: string): StructuredDischargeSummary {
  const lower = transcript.toLowerCase();
  const hasExplicitSex = /\b(female|male|woman|man)\b/i.test(transcript);
  const hasExplicitAdmission = /(admitted with|admitted for|reason for admission|presented with)/i.test(lower);
  const hasExplicitBackground = /(history of|past medical history|pmhx|known to have|background of|prior pci|prior cabg|known hfre?f|known hf|known af)/i.test(lower);
  const hasEvidenceContext = /(discharge|follow up|medication|echo|ecg|troponin|angiography|stent|pci|cabg|heart failure|arrhythmia|af|renal function)/i.test(lower);
  const evidenceSupport = hasEvidenceContext ? sanitizeEvidenceSupportItems(summary.evidenceSupport, transcript, { mode: "inpatient" }) : [];
  const evidenceLimitations = appendEvidenceLimitations(summary.evidenceLimitations, [
    !hasEvidenceContext ? "Evidence support withheld because discharge-specific transcript detail was limited." : "",
    !/(follow up|clinic|gp|pending|result)/i.test(lower) ? "Follow-up and pending-result detail is limited in the transcript." : "",
  ]);

  return {
    ...summary,
    patientContext: {
      explicitDemographics: hasExplicitSex ? summary.patientContext.explicitDemographics : "",
      explicitAdmissionReason: hasExplicitAdmission ? summary.patientContext.explicitAdmissionReason : "",
      explicitCardiacBackground: hasExplicitBackground ? summary.patientContext.explicitCardiacBackground : [],
    },
    keyInvestigations: summary.keyInvestigations.filter(Boolean),
    procedures: summary.procedures.filter(Boolean),
    dischargeDiagnoses: summary.dischargeDiagnoses.filter(Boolean),
    medicationChanges: summary.medicationChanges.filter(Boolean),
    followUpPlans: summary.followUpPlans.filter(Boolean),
    dischargeInstructions: summary.dischargeInstructions.filter(Boolean),
    pendingResults: summary.pendingResults.filter(Boolean),
    evidenceSupport,
    evidenceLimitations,
  };
}

export function coerceStructuredCardiacNote(input: unknown): StructuredCardiacNote {
  const data = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  return {
    documentType: "cardiac_inpatient_note",
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

export function coerceConsultantLetter(input: unknown): StructuredConsultantLetter {
  const data = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  return {
    documentType: "cardiology_consultant_letter",
    referralContext: coerceConsultantReferralContext(data.referralContext),
    cardiacRiskFactors: toStringArray(data.cardiacRiskFactors),
    cardiacHistory: toStringArray(data.cardiacHistory),
    otherMedicalHistory: toStringArray(data.otherMedicalHistory),
    currentMedications: coerceConsultantMedicationGroups(data.currentMedications),
    allergies: toStringArray(data.allergies),
    socialHistory: toStringArray(data.socialHistory),
    presentingHistory: toStringValue(data.presentingHistory),
    physicalExamination: toStringValue(data.physicalExamination),
    investigations: toStringArray(data.investigations),
    summary: toStringValue(data.summary),
    assessmentPlan: coerceAssessmentPlan(data.assessmentPlan),
    followUp: toStringValue(data.followUp),
    closing: toStringValue(data.closing),
    evidenceSupport: coerceEvidenceItems(data.evidenceSupport),
    evidenceLimitations: toStringArray(data.evidenceLimitations),
  };
}

export function coerceDischargeSummary(input: unknown): StructuredDischargeSummary {
  const data = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  return {
    documentType: "cardiac_discharge_summary",
    patientContext: coercePatientContext(data.patientContext),
    admissionCourse: toStringValue(data.admissionCourse),
    keyInvestigations: toStringArray(data.keyInvestigations),
    procedures: toStringArray(data.procedures),
    dischargeDiagnoses: toStringArray(data.dischargeDiagnoses),
    medicationChanges: toStringArray(data.medicationChanges),
    dischargeStatus: toStringValue(data.dischargeStatus),
    followUpPlans: toStringArray(data.followUpPlans),
    dischargeInstructions: toStringArray(data.dischargeInstructions),
    pendingResults: toStringArray(data.pendingResults),
    escalationAdvice: toStringValue(data.escalationAdvice),
    evidenceSupport: coerceEvidenceItems(data.evidenceSupport),
    evidenceLimitations: toStringArray(data.evidenceLimitations),
  };
}

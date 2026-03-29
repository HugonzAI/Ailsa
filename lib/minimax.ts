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

export function getMiniMaxApiKey() {
  return process.env.MINIMAX_API_KEY || null;
}

export function getMiniMaxModel() {
  return process.env.MINIMAX_MODEL || "MiniMax-M2.7";
}

export function getDocumentType(encounterType?: EncounterType | string): DocumentType {
  if (encounterType === "Cardiology consultant letter") return "cardiology_consultant_letter";
  if (encounterType === "Discharge" || encounterType === "Cardiac discharge") return "cardiac_discharge_summary";
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

function buildEncounterSpecificWardHints(encounterType: string) {
  if (encounterType === "HF review") {
    return [
      "- For HF-focused notes, prefer shorthand such as 'ADHF', 'HFrEF', 'still overloaded', 'euvolaemic', 'Wt down', 'FB negative', 'JVP up', 'bibasal crackles', 'trace oedema' when explicitly supported",
      "- HF plans should sound like ward actions: 'Continue IV frusemide', 'Daily wt / FB', 'Recheck U&E/Cr', 'Titrate GDMT as tolerated'",
    ];
  }

  if (encounterType === "Chest pain") {
    return [
      "- For chest-pain / ACS notes, prefer shorthand such as 'CP', 'possible ACS', 'trops flat', 'ECG nil dynamic change', 'pain settled' when explicitly supported",
      "- Chest-pain plans should sound like ward actions: 'Repeat trops/ECG', 'Telemetry', 'Discuss for angiography', 'Continue DAPT/anticoagulation only if explicitly supported'",
    ];
  }

  if (encounterType === "AF review") {
    return [
      "- For AF-focused notes, prefer shorthand such as 'AF', 'AF with RVR', 'now SR', 'rate controlled', 'brief AF overnight' when explicitly supported",
      "- AF plans should sound like ward actions: 'Continue bisoprolol/metoprolol', 'Telemetry', 'Keep K > 4 / Mg > 1', 'Review anticoagulation' only if explicitly supported",
    ];
  }

  return [];
}

export function buildStructuredCardiacPrompt(transcript: string, encounterType = "Ward round") {
  return [
    "You are a clinical documentation assistant for a New Zealand inpatient cardiology team.",
    `Encounter type: ${encounterType}.`,
    "Return only valid JSON.",
    "Do not wrap the JSON in markdown fences.",
    "Do not include explanatory text before or after the JSON.",
    "Write like a registrar or house officer drafting a concise NZ cardiology ward-round note.",
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
    "- Keep strings compact, terse, and clinically styled",
    "- Prefer ward-round shorthand over polished explanatory prose",
    "- Main note sections should read like ward-note lines, not mini-paragraph explanations",
    "- The note should feel easy for a busy doctor to scan quickly",
    "- Prefer common readable shorthand, but do not force abbreviations if they make the line feel choppy or awkward",
    "- Keep one clinical idea per line when possible; if a short sentence reads more naturally than a fragmented line, prefer the short sentence",
    "- Avoid model-style filler such as 'responding to', 'in the setting of', 'with improvement in', 'favourable response', or reassuring/beautifying language unless truly necessary",
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
    "- Good style examples: 'ADHF improving', 'Brief AF overnight, now SR', 'nil CP', 'Less SOB', 'Wt down 1.2 kg', 'Sats 96% RA', 'JVP mildly up', 'Bibasal crackles improved', 'Continue IV frusemide', 'Recheck U&E/Cr'",
    ...buildEncounterSpecificWardHints(encounterType),
    "- Bad style examples: long explanatory sentences, duplicated reasoning, guideline-style teaching prose, or beautifying phrases like 'doing well', 'favourable response', 'clinically stable' inside the main note",
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
    "- Use clear formal specialist-letter style with calm, efficient prose",
    "- Allow fuller prose in presentingHistory and summary, but avoid fluffy or overly warm wording",
    "- Keep assessmentPlan structured by problem",
    "- Keep openingLine and closing optional; do not force them",
    "- Avoid generic pleasantries like 'pleasant patient' unless explicitly stated",
    "- Summary should read like a concise consultant impression, not a rehash of the whole history",
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
    "- Use clear discharge-ready wording: concise, practical, and easy to scan",
    "- Keep dischargeStatus concise and patient-state oriented",
    "- Prefer brief problem-oriented bullets or short sentences over explanatory paragraphs",
    "- If discharge advice or follow-up is not explicit, leave it blank",
    "- evidenceSupport stays separate from the discharge body and should be conservative or empty",
    "",
    "Transcript:",
    transcript,
  ].join("\n");
}

function wrapReadableLine(value: string, max = 110) {
  const input = value.trim();
  if (!input || input.length <= max) return input;

  const breakPatterns = ["; ", " — ", ", ", " and "];
  for (const separator of breakPatterns) {
    const parts = input.split(separator);
    if (parts.length > 1) {
      const lines: string[] = [];
      let current = "";

      for (const rawPart of parts) {
        const part = rawPart.trim();
        const candidate = current ? `${current}${separator}${part}` : part;
        if (candidate.length <= max) {
          current = candidate;
        } else {
          if (current) lines.push(current.trim());
          current = part;
        }
      }

      if (current) lines.push(current.trim());
      if (lines.length > 1) return lines.join("\n");
    }
  }

  return input;
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

function formatEvidenceItem(item: EvidenceSupportItem) {
  const meta = [item.evidenceType, item.confidence, item.citationLabel].filter(Boolean).join(" | ");
  const body = [item.claim, item.rationale].filter(Boolean).join(" — ");
  return meta ? `${body} (${meta})` : body;
}

function formatMedicationGroup(title: string, items: string[]) {
  return wrapReadableLine(`${title}: ${items.length ? items.join('; ') : ''}`);
}

function formatAssessmentPlanItem(item: ConsultantAssessmentPlanItem, index: number) {
  const assessmentLines = item.assessment
    ? wrapReadableLine(item.assessment, 88)
        .split("\n")
        .filter(Boolean)
        .map((line, i) => `${i === 0 ? "Assessment: " : "  "}${line}`)
        .join("\n")
    : "";

  const planLines = item.plan
    ? wrapReadableLine(item.plan, 88)
        .split("\n")
        .filter(Boolean)
        .map((line, i) => `${i === 0 ? "Plan: " : "  "}${line}`)
        .join("\n")
    : "";

  return [wrapReadableLine(`#${index + 1} ${item.problem}`.trim(), 88), assessmentLines, planLines]
    .filter(Boolean)
    .join("\n");
}

export function renderStructuredOutput(output: StructuredOutput) {
  if (output.documentType === "cardiology_consultant_letter") {
    const medicationBlock = [
      formatMedicationGroup("Antithrombotics", output.currentMedications.antithrombotics),
      formatMedicationGroup("Antihypertensives", output.currentMedications.antihypertensives),
      formatMedicationGroup("Heart failure medications", output.currentMedications.heartFailureMedications),
      formatMedicationGroup("Lipid-lowering agents", output.currentMedications.lipidLoweringAgents),
      formatMedicationGroup("Other medications", output.currentMedications.otherMedications),
    ]
      .filter((item) => !/:\s*$/.test(item))
      .join("\n");

    return [
      [output.referralContext.openingLine, output.referralContext.referrer, output.referralContext.reasonForReferral, output.referralContext.visitType]
        .filter(Boolean)
        .map((item) => wrapReadableLine(item, 88))
        .join("\n"),
      wrapReadableLine(output.presentingHistory || "", 88),
      output.investigations.length ? `Investigations\n${output.investigations.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
      output.summary ? `Summary\n${wrapReadableLine(output.summary, 88)}` : "",
      output.assessmentPlan.length ? `Assessment / Plan\n${output.assessmentPlan.map(formatAssessmentPlanItem).join("\n\n")}` : "",
      output.followUp ? `Follow-up\n${wrapReadableLine(output.followUp, 88)}` : "",
      [
        output.cardiacRiskFactors.length ? `Cardiac Risk Factors\n${output.cardiacRiskFactors.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.cardiacHistory.length ? `Cardiac History\n${output.cardiacHistory.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.otherMedicalHistory.length ? `Other Medical History\n${output.otherMedicalHistory.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        medicationBlock ? `Current Medications\n${medicationBlock}` : "",
        output.allergies.length ? `Allergies\n${output.allergies.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.socialHistory.length ? `Social History\n${output.socialHistory.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.physicalExamination ? `Physical Examination\n${wrapReadableLine(output.physicalExamination, 88)}` : "",
        wrapReadableLine(output.closing || ""),
      ]
        .filter(Boolean)
        .join("\n\n"),
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (output.documentType === "cardiac_discharge_summary") {
    return [
      output.admissionCourse ? `Admission Course\n${wrapReadableLine(output.admissionCourse, 88)}` : "",
      output.dischargeDiagnoses.length ? `Discharge Diagnoses\n${output.dischargeDiagnoses.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
      output.medicationChanges.length ? `Medication Changes\n${output.medicationChanges.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
      output.dischargeStatus ? `Discharge Status\n${wrapReadableLine(output.dischargeStatus, 88)}` : "",
      output.followUpPlans.length ? `Follow-up\n${output.followUpPlans.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
      output.dischargeInstructions.length ? `Discharge Instructions\n${output.dischargeInstructions.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
      [
        formatPatientContext(output.patientContext) ? `Patient Context\n${wrapReadableLine(formatPatientContext(output.patientContext), 88)}` : "",
        output.keyInvestigations.length ? `Key Investigations\n${output.keyInvestigations.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.procedures.length ? `Procedures\n${output.procedures.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.pendingResults.length ? `Pending Results\n${output.pendingResults.map((item) => `- ${wrapReadableLine(item, 88)}`).join("\n")}` : "",
        output.escalationAdvice ? `Return Advice\n${wrapReadableLine(output.escalationAdvice, 88)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  return [
    "Overnight",
    wrapReadableLine(output.overnightEvents || ""),
    "",
    "Sx",
    wrapReadableLine(output.symptoms || ""),
    "",
    "Obs",
    wrapReadableLine(output.observations || ""),
    "",
    "Exam",
    wrapReadableLine(output.examination || ""),
    "",
    "Ix",
    wrapReadableLine(output.keyInvestigations || ""),
    "",
    "Assessment",
    wrapReadableLine(output.assessment || ""),
    "",
    "Problems",
    ...(output.activeProblems.length ? output.activeProblems.flatMap((item) => wrapReadableLine(item).split("\n").map((line) => `- ${line}`)) : [""]),
    "",
    "Plan",
    ...(output.planToday.length ? output.planToday.flatMap((item) => wrapReadableLine(item).split("\n").map((line) => `- ${line}`)) : [""]),
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
  options: { mode: "inpatient" | "consultant" | "discharge" },
) {
  const lower = transcript.toLowerCase();
  const syndromeSignals =
    options.mode === "consultant"
      ? /(angina|ischaemi|chest pain|chest pressure|dyspnoea|stress test|angiography|coronary|ecg|family history|risk factor)/i
      : options.mode === "discharge"
        ? /(heart failure|hfre?f|diuresis|fluid overload|atrial fibrillation|\baf\b|echo|troponin|creatinine|renal function|electrolytes|discharge|follow up|palpitations)/i
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

function inferWardTasksFromPlan(planItems: string[], transcript: string): TaskItem[] {
  const lower = transcript.toLowerCase();
  const tasks: TaskItem[] = [];

  const pushTask = (task: string, owner = "Medical team", timing = "Today", urgency = "") => {
    if (!task.trim()) return;
    if (tasks.some((item) => item.task.toLowerCase() === task.toLowerCase())) return;
    tasks.push({ task, owner, timing, urgency });
  };

  for (const item of planItems) {
    const normalized = item.toLowerCase();
    if (/recheck|repeat|monitor|review|arrange|follow up|telemetry|daily|check/.test(normalized)) {
      pushTask(item);
    }
  }

  if (!tasks.length) {
    if (/(recheck u&e|renal function|electrolytes|creatinine)/i.test(lower)) pushTask("Recheck U&E/Cr");
    else if (/review tomorrow|review later|next review/i.test(lower)) pushTask("Review tomorrow");
  }

  return tasks.slice(0, 3);
}

function inferEvidenceSupportFromTranscript(
  transcript: string,
  options: { mode: "inpatient" | "consultant" | "discharge" },
): EvidenceSupportItem[] {
  const lower = transcript.toLowerCase();

  if (options.mode === "inpatient") {
    if (/(heart failure|hfre?f|diuresis|fluid overload|jvp|crackles|oedema)/i.test(lower) && /(improving|less breathless|weight is down|weight down|negative 1\.?\d*|fluid balance was negative)/i.test(lower)) {
      return [
        {
          claim: "Current picture is consistent with improving decompensated heart failure after decongestive treatment.",
          rationale: "Improving breathlessness together with decongestion signals such as weight loss, negative fluid balance, or improved congestion supports response to diuresis.",
          evidenceType: "common-practice",
          confidence: "medium",
          citationLabel: "General heart failure guidance",
        },
      ];
    }
  }

  if (options.mode === "consultant") {
    if (/(chest pressure|chest discomfort|angina|dyspnoea)/i.test(lower) && /(rest|exertional|climbing stairs|mowing the lawn|bus)/i.test(lower)) {
      return [
        {
          claim: "Exertional chest discomfort relieved by rest is a clinically important anginal pattern.",
          rationale: "The transcript describes exertional symptoms with rest relief and associated cardiopulmonary symptoms, which is consistent with possible angina assessment.",
          evidenceType: "common-practice",
          confidence: "medium",
          citationLabel: "General cardiology guidance",
        },
      ];
    }
  }

  if (options.mode === "discharge") {
    if (/(hfre?f|heart failure|fluid overload)/i.test(lower) && /(diuresis|improved|breathing comfortably|room air|oedema)/i.test(lower)) {
      return [
        {
          claim: "Post-discharge renal and electrolyte follow-up is consistent with common safety practice after decompensated heart failure treated with diuresis.",
          rationale: "The transcript describes heart failure treated with diuresis and ongoing discharge plans that include renal function and electrolyte review.",
          evidenceType: "risk-flag",
          confidence: "medium",
          citationLabel: "General heart failure guidance",
        },
      ];
    }
  }

  return [];
}

function stripTrailingPunctuation(value: string) {
  return value.trim().replace(/[.;:,\s]+$/g, "");
}

function compressWardPhrase(value: string) {
  return stripTrailingPunctuation(
    value
      .replace(/^overall[,\s]*/i, "")
      .replace(/^this (looks|appears) like\s+/i, "")
      .replace(/^there (was|were)\s+/i, "")
      .replace(/^patient (reports|reported)\s+/i, "")
      .replace(/^review of systems:\s*/i, "")
      .replace(/^vital signs:\s*/i, "")
      .replace(/^physical examination:\s*/i, "")
      .replace(/^diagnostic studies:\s*/i, "")
      .replace(/\bwith clinical and\b/gi, "and")
      .replace(/\bresponding to diuresis with\b/gi, "improving with diuresis and")
      .replace(/\bfavou?rable response to\b/gi, "on")
      .replace(/\bdoing well on\b/gi, "on")
      .replace(/\bclinically stable\b/gi, "stable")
      .replace(/\bsuitable for discharge\b/gi, "for discharge")
      .replace(/\bif improvement continues\b/gi, "if improving")
      .replace(/\bin the setting of\b/gi, "with")
      .replace(/\bwith improvement in\b/gi, "improved")
      .replace(/\bthere is\b/gi, "")
      .replace(/\bthere are\b/gi, "")
      .replace(/\bhas been\b/gi, "")
      .replace(/\bhave been\b/gi, "")
      .replace(/\bis now back in\b/gi, "now in")
      .replace(/\bon room air\b/gi, "RA")
      .replace(/\boxygen saturation\b/gi, "Sats")
      .replace(/\bsaturation\b/gi, "sats")
      .replace(/\bblood pressure\b/gi, "BP")
      .replace(/\bheart rate\b/gi, "HR")
      .replace(/\burine output\b/gi, "UO")
      .replace(/\bfluid balance\b/gi, "FB")
      .replace(/\bweight is down\b/gi, "Wt down")
      .replace(/\bweight down\b/gi, "Wt down")
      .replace(/\bshortness of breath\b/gi, "SOB")
      .replace(/\bbreathlessness\b/gi, "SOB")
      .replace(/\bdyspn(?:oe|ea)a\b/gi, "SOB")
      .replace(/\bchest pain free\b/gi, "CP free")
      .replace(/\bno chest pain\b/gi, "nil CP")
      .replace(/\bno shortness of breath\b/gi, "nil SOB")
      .replace(/\borthopn(?:oe|ea)a\b/gi, "orthopnoea")
      .replace(/\bparoxysmal nocturnal dyspn(?:oe|ea)a\b/gi, "PND")
      .replace(/\bjugular venous pressure\b/gi, "JVP")
      .replace(/\bcreatinine\b/gi, "Cr")
      .replace(/\bpotassium\b/gi, "K")
      .replace(/\burea and electrolytes\b/gi, "U&E")
      .replace(/\bchest x-?ray\b/gi, "CXR")
      .replace(/\btransthoracic echo(?:cardiogram)?\b/gi, "TTE")
      .replace(/\btelemetry showed\b/gi, "Telemetry")
      .replace(/\bback in sinus rhythm\b/gi, "now SR")
      .replace(/\bin sinus rhythm\b/gi, "SR")
      .replace(/\s{2,}/g, " "),
  );
}

function compressAssessment(value: string) {
  const compressed = compressWardPhrase(value)
    .replace(/^improving decompensated heart failure with reduced ejection fraction(.*)$/i, "ADHF / HFrEF improving$1")
    .replace(/^decompensated heart failure with reduced ejection fraction(.*)$/i, "ADHF / HFrEF$1")
    .replace(/^improving heart failure with reduced ejection fraction(.*)$/i, "HFrEF improving$1")
    .replace(/^acute decompensated heart failure(.*)$/i, "ADHF$1")
    .replace(/^atrial fibrillation(.*)$/i, "AF$1")
    .replace(/^heart failure with reduced ejection fraction(.*)$/i, "HFrEF$1")
    .replace(/^non st elevation myocardial infarction(.*)$/i, "NSTEMI$1")
    .replace(/^possible acute coronary syndrome(.*)$/i, "Possible ACS$1")
    .replace(/^likely acute coronary syndrome(.*)$/i, "Likely ACS$1")
    .replace(/^likely /i, "Likely ")
    .replace(/^possible /i, "Possible ");

  return stripTrailingPunctuation(compressed);
}

function compressPlanItem(value: string) {
  return stripTrailingPunctuation(
    compressWardPhrase(value)
      .replace(/^medications:\s*/i, "")
      .replace(/^follow-?up:\s*/i, "")
      .replace(/^plan:?\s*/i, "")
      .replace(/^continue with\s+/i, "Continue ")
      .replace(/^continue oral\s+/i, "Continue PO ")
      .replace(/^continue intravenous\s+/i, "Continue IV ")
      .replace(/^monitoring\s+/i, "Monitor ")
      .replace(/^repeat\s+/i, "Repeat ")
      .replace(/^recheck\s+/i, "Recheck ")
      .replace(/^consideration of\s+/i, "Consider "),
  );
}

function applyWardSyndromePhrases(value: string) {
  return stripTrailingPunctuation(
    value
      .replace(/\bfluid overloaded\b/gi, "overloaded")
      .replace(/\bstill fluid overloaded\b/gi, "still overloaded")
      .replace(/\bvolume overloaded\b/gi, "overloaded")
      .replace(/\bnegative fluid balance\b/gi, "FB negative")
      .replace(/\bdaily weights?\b/gi, "daily wt")
      .replace(/\bguideline directed medical therapy\b/gi, "GDMT")
      .replace(/\bleft ventricular ejection fraction\b/gi, "LVEF")
      .replace(/\bperipheral oedema\b/gi, "oedema")
      .replace(/\bintravenous diuresis\b/gi, "IV diuresis")
      .replace(/\biv diuresis\b/gi, "IV diuresis")
      .replace(/\bacute coronary syndrome\b/gi, "ACS")
      .replace(/\bdual antiplatelet therapy\b/gi, "DAPT")
      .replace(/\bno dynamic ecg changes?\b/gi, "ECG nil dynamic change")
      .replace(/\bwithout dynamic ecg changes?\b/gi, "ECG nil dynamic change")
      .replace(/\btroponin(?:s)? remained flat\b/gi, "trops flat")
      .replace(/\btroponin(?:s)? (?:is|are) flat\b/gi, "trops flat")
      .replace(/\bserial troponins? negative\b/gi, "serial trops negative")
      .replace(/\bchest pain settled\b/gi, "CP settled")
      .replace(/\bchest pain improved\b/gi, "CP improved")
      .replace(/\batrial fibrillation with rapid ventricular response\b/gi, "AF with RVR")
      .replace(/\brapid ventricular response\b/gi, "RVR")
      .replace(/\brate controlled\b/gi, "rate controlled")
      .replace(/\bpotassium greater than 4\b/gi, "K > 4")
      .replace(/\bmagnesium greater than 1\b/gi, "Mg > 1")
      .replace(/\bmagnesium above 1\b/gi, "Mg > 1")
      .replace(/\s{2,}/g, " "),
  );
}

function applySyndromeAssessmentPack(value: string, transcriptLower: string) {
  let next = applyWardSyndromePhrases(value);

  const hasHF = /(heart failure|hfre?f|adhf|diuresis|fluid overload|overloaded|jvp|oedema|orthopnoea|pnd)/i.test(transcriptLower);
  const hasACS = /(chest pain|acs|angina|troponin|trops|ecg|stemi|nstemi|angiography)/i.test(transcriptLower);
  const hasAF = /(atrial fibrillation|\baf\b|arrhythmia|telemetry|sinus rhythm|rate controlled|rvr)/i.test(transcriptLower);

  if (hasHF) {
    next = next
      .replace(/\badhf improving with diuresis\b/gi, "ADHF improving")
      .replace(/\bhf improving with diuresis\b/gi, "HF improving")
      .replace(/\bhfre?f with residual congestion\b/gi, "HFrEF, still mildly overloaded")
      .replace(/\badhf with residual congestion\b/gi, "ADHF, still mildly overloaded");
  }

  if (hasACS) {
    next = next
      .replace(/\bpossible acs with trops flat\b/gi, "Possible ACS, trops flat")
      .replace(/\bpossible acs and ecg nil dynamic change\b/gi, "Possible ACS, ECG nil dynamic change")
      .replace(/\bcp improved and trops flat\b/gi, "CP improved, trops flat");
  }

  if (hasAF) {
    next = next
      .replace(/\baf now sr\b/gi, "AF, now SR")
      .replace(/\bbrief af overnight now sr\b/gi, "Brief AF overnight, now SR")
      .replace(/\baf with rvr now rate controlled\b/gi, "AF with RVR, now rate controlled");
  }

  return stripTrailingPunctuation(next);
}

function applySyndromePlanPack(value: string, transcriptLower: string) {
  let next = applyWardSyndromePhrases(value);

  const hasHF = /(heart failure|hfre?f|adhf|diuresis|fluid overload|overloaded|jvp|oedema|orthopnoea|pnd)/i.test(transcriptLower);
  const hasACS = /(chest pain|acs|angina|troponin|trops|ecg|stemi|nstemi|angiography)/i.test(transcriptLower);
  const hasAF = /(atrial fibrillation|\baf\b|arrhythmia|telemetry|sinus rhythm|rate controlled|rvr)/i.test(transcriptLower);

  if (hasHF) {
    next = next
      .replace(/\bmonitor renal function and electrolytes\b/gi, "Recheck U&E/Cr")
      .replace(/\bmonitor fluid balance\b/gi, "Daily FB")
      .replace(/\bmonitor weights?\b/gi, "Daily wt")
      .replace(/\bcontinue iv furosemide\b/gi, "Continue IV frusemide")
      .replace(/\bcontinue furosemide\b/gi, "Continue frusemide")
      .replace(/\bconsider discharge in 24 to 48 hours\b/gi, "Possible discharge 24-48 h");
  }

  if (hasACS) {
    next = next
      .replace(/\brepeat troponins? and ecg\b/gi, "Repeat trops/ECG")
      .replace(/\brepeat ecg and troponins?\b/gi, "Repeat trops/ECG")
      .replace(/\bmonitor on telemetry\b/gi, "Telemetry")
      .replace(/\bdiscuss for angiography\b/gi, "Discuss for angiography");
  }

  if (hasAF) {
    next = next
      .replace(/\bcontinue beta blocker\b/gi, "Continue beta-blocker")
      .replace(/\bcontinue metoprolol\b/gi, "Continue metoprolol")
      .replace(/\bcontinue bisoprolol\b/gi, "Continue bisoprolol")
      .replace(/\bkeep potassium greater than 4\b/gi, "Keep K > 4")
      .replace(/\bkeep magnesium greater than 1\b/gi, "Keep Mg > 1")
      .replace(/\breview anticoagulation\b/gi, "Review anticoagulation");
  }

  return stripTrailingPunctuation(next);
}

function applyEncounterAwareWardTone(value: string, encounterType: EncounterType | string | undefined, kind: "assessment" | "plan") {
  if (!value) return value;
  let next = value;

  if (encounterType === "HF review") {
    next = kind === "assessment"
      ? next
          .replace(/^HFrEF improving$/i, "ADHF improving")
          .replace(/^HF improving$/i, "ADHF improving")
          .replace(/^ADHF, still mildly overloaded$/i, "ADHF improving, still mildly overloaded")
          .replace(/^HFrEF, still mildly overloaded$/i, "HFrEF, still mildly overloaded")
          .replace(/^HFrEF$/i, "HFrEF review")
      : next
          .replace(/^Continue frusemide$/i, "Continue IV frusemide")
          .replace(/^Continue diuresis$/i, "Continue IV frusemide")
          .replace(/^Daily FB$/i, "Daily wt / FB")
          .replace(/^Possible discharge 24-48 h$/i, "Possible discharge 24–48 h");
  }

  if (encounterType === "Chest pain") {
    next = kind === "assessment"
      ? next
          .replace(/^Possible ACS$/i, "Chest pain, ?ACS")
          .replace(/^Likely ACS$/i, "Chest pain, likely ACS")
      : next
          .replace(/^Telemetry$/i, "Telemetry / serial ECG")
          .replace(/^Repeat trops\/ECG$/i, "Serial trops / ECG");
  }

  if (encounterType === "AF review") {
    next = kind === "assessment"
      ? next
          .replace(/^AF$/i, "AF review")
          .replace(/^AF, now SR$/i, "PAF, now SR")
      : next
          .replace(/^Continue beta-blocker$/i, "Rate control")
          .replace(/^Telemetry$/i, "Telemetry / rhythm watch");
  }

  return stripTrailingPunctuation(next);
}

function splitIntoWardBullets(value: string) {
  const source = value.trim();
  if (!source) return "";

  const parts = source
    .split(/\n|;|,(?=\s(?:no|nil|less|more|brief|now|bp|hr|sats|oxygen|o2|afebrile|jvp|trace|bibasal|crackles|creatinine|potassium|troponin|echo|ecg|telemetry|wt|weight|cp|sob|orthopnoea|pnd|continue|monitor|recheck|repeat|consider)\b)/i)
    .map((item) => compressWardPhrase(item))
    .filter(Boolean);

  if (!parts.length) return compressWardPhrase(source);
  return parts.slice(0, 4).join("\n");
}

function polishWardLine(value: string) {
  const cleaned = stripTrailingPunctuation(
    value
      .replace(/^\s*(and|but)\s+/i, "")
      .replace(/^,\s*/, "")
      .replace(/\s+,/g, ",")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );

  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function compressProblems(items: string[]) {
  return items.map((item) => polishWardLine(compressWardPhrase(item))).filter(Boolean).slice(0, 5);
}

function normalizeFragment(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(the|a|an|overall|mild|trace|brief|now|today)\b/g, " ")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeWardText(value: string, seen: string[]) {
  const kept: string[] = [];

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const normalized = normalizeFragment(line);
    if (!normalized) continue;

    const duplicate = seen.some((prior) => {
      if (!prior) return false;
      return prior === normalized || prior.includes(normalized) || normalized.includes(prior);
    });

    if (!duplicate) {
      kept.push(polishWardLine(line));
      seen.push(normalized);
    }
  }

  return kept.join("\n");
}

function dedupeProblemList(items: string[], seen: string[]) {
  return items.filter((item) => {
    const normalized = normalizeFragment(item);
    if (!normalized) return false;

    const duplicate = seen.some((prior) => {
      if (!prior) return false;
      if (prior === normalized) return true;
      if (normalized.length >= 12 && prior.includes(normalized)) return true;
      if (prior.length >= 12 && normalized.includes(prior)) return true;
      return false;
    });

    if (duplicate) return false;
    seen.push(normalized);
    return true;
  });
}

function compressConsultantSentence(value: string) {
  return stripTrailingPunctuation(
    value
      .replace(/\bI had the pleasure of seeing this patient today\.?/gi, "Seen today for cardiology review")
      .replace(/\bThey are a pleasant individual\b/gi, "Patient")
      .replace(/\bwho was referred for cardiac assessment\b/gi, "referred for cardiac assessment")
      .replace(/\bReview of systems is otherwise non-contributory\.?/gi, "")
      .replace(/\s{2,}/g, " "),
  );
}

function compressDischargeSentence(value: string) {
  return stripTrailingPunctuation(
    value
      .replace(/\bOver the admission\b/gi, "During admission")
      .replace(/\bPlan on discharge is to\b/gi, "Discharge plan:")
      .replace(/\bAdvise return for\b/gi, "Return if")
      .replace(/\s{2,}/g, " "),
  );
}

function compressStringArray(items: string[], formatter: (value: string) => string, limit = 6) {
  return items.map((item) => formatter(item)).filter(Boolean).slice(0, limit);
}

export function sanitizeStructuredCardiacNote(note: StructuredCardiacNote, transcript: string, encounterType?: EncounterType | string): StructuredCardiacNote {
  const lower = transcript.toLowerCase();
  const hasExplicitSex = /\b(female|male|woman|man)\b/i.test(transcript);
  const hasExplicitAdmission = /(admitted with|admitted for|reason for admission|primary reason for admission|presented with chest pain|presented with syncope|presented with dyspnoea)/i.test(lower);
  const hasExplicitBackground = /(history of|past medical history|pmhx|known to have|background of|prior pci|prior cabg|known hfre?f|known hf|known af|known ischaemic heart disease)/i.test(lower);
  const hasEscalationSignal = /(escalat|safety|concern|watch closely|unstable|review urgently|if deteriorates|if worsens)/i.test(lower);
  const hasNextReviewSignal = /(review tomorrow|review later|next review|following results|after results|reassess tomorrow|within 24|24 to 48 hours|pending investigations|review after)/i.test(lower);
  const hasEvidenceContext = /(heart failure|hfre?f|diuresis|fluid balance|telemetry|atrial fibrillation|arrhythmia|ecg|echo|troponin|stress test|angiography|renal function|electrolytes)/i.test(lower);
  const evidenceSupport = hasEvidenceContext
    ? sanitizeEvidenceSupportItems(note.evidenceSupport, transcript, { mode: "inpatient" })
    : [];
  const fallbackEvidenceSupport = evidenceSupport.length ? evidenceSupport : inferEvidenceSupportFromTranscript(transcript, { mode: "inpatient" });
  const evidenceLimitations = appendEvidenceLimitations(note.evidenceLimitations, [
    !hasEvidenceContext ? "Evidence support withheld because transcript support was too limited for safe cardiology-specific rationale." : "",
    !/(ecg|echo|troponin|telemetry|creatinine|electrolytes|stress test|angiography)/i.test(lower)
      ? "Key investigation detail is limited in the transcript, which narrows evidence-style support."
      : "",
  ]);

  const overnightEventsRaw = polishWardLine(applyWardSyndromePhrases(splitIntoWardBullets(note.overnightEvents)));
  const symptomsRaw = polishWardLine(applyWardSyndromePhrases(splitIntoWardBullets(note.symptoms)));
  const observationsRaw = polishWardLine(applyWardSyndromePhrases(splitIntoWardBullets(note.observations)));
  const examinationRaw = polishWardLine(applyWardSyndromePhrases(splitIntoWardBullets(note.examination)));
  const keyInvestigationsRaw = polishWardLine(applyWardSyndromePhrases(splitIntoWardBullets(note.keyInvestigations)));
  const assessmentRaw = polishWardLine(
    applyEncounterAwareWardTone(applySyndromeAssessmentPack(compressAssessment(note.assessment), lower), encounterType, "assessment"),
  );

  const seenFragments: string[] = [];
  const overnightEvents = dedupeWardText(overnightEventsRaw, seenFragments) || overnightEventsRaw;
  const symptoms = dedupeWardText(symptomsRaw, seenFragments) || symptomsRaw;
  const observations = dedupeWardText(observationsRaw, seenFragments) || observationsRaw;
  const examination = dedupeWardText(examinationRaw, seenFragments) || examinationRaw;
  const keyInvestigations = dedupeWardText(keyInvestigationsRaw, seenFragments) || keyInvestigationsRaw;
  const assessment = dedupeWardText(assessmentRaw, seenFragments) || assessmentRaw;
  const activeProblems = dedupeProblemList(
    compressProblems(note.activeProblems).map((item) =>
      polishWardLine(applyEncounterAwareWardTone(applySyndromeAssessmentPack(item, lower), encounterType, "assessment")),
    ),
    [],
  );

  return {
    ...note,
    patientContext: {
      explicitDemographics: hasExplicitSex ? note.patientContext.explicitDemographics : "",
      explicitAdmissionReason: hasExplicitAdmission ? note.patientContext.explicitAdmissionReason : "",
      explicitCardiacBackground: hasExplicitBackground ? note.patientContext.explicitCardiacBackground : [],
    },
    overnightEvents,
    symptoms,
    observations,
    examination,
    keyInvestigations,
    assessment,
    activeProblems,
    planToday: note.planToday.map((item) => polishWardLine(applyEncounterAwareWardTone(applySyndromePlanPack(compressPlanItem(item), lower), encounterType, "plan"))).filter(Boolean).slice(0, 5),
    nextReview: hasNextReviewSignal ? extractNextReview(transcript, note.nextReview) : "",
    escalationsSafetyConcerns: hasEscalationSignal ? compressWardPhrase(note.escalationsSafetyConcerns) : "",
    tasksAllocated: (() => {
      const explicitTasks = note.tasksAllocated
        .map((task) => ({
          ...task,
          task: polishWardLine(applyEncounterAwareWardTone(applySyndromePlanPack(compressPlanItem(task.task), lower), encounterType, "plan")),
          owner: polishWardLine(compressWardPhrase(task.owner)),
          timing: polishWardLine(applyEncounterAwareWardTone(applySyndromePlanPack(compressWardPhrase(task.timing), lower), encounterType, "plan")),
          urgency: task.urgency && new RegExp(`\\b${task.urgency.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(transcript) ? polishWardLine(compressWardPhrase(task.urgency)) : "",
        }))
        .filter((task) => task.task);
      return explicitTasks.length ? explicitTasks : inferWardTasksFromPlan(note.planToday, transcript);
    })(),
    actionSummary: note.actionSummary.map((item) => polishWardLine(applyEncounterAwareWardTone(applySyndromePlanPack(compressPlanItem(item), lower), encounterType, "plan"))).filter(Boolean).slice(0, 4),
    dischargeConsiderations: polishWardLine(compressWardPhrase(note.dischargeConsiderations)),
    evidenceSupport: fallbackEvidenceSupport,
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
      referrer: hasReferrer ? compressConsultantSentence(letter.referralContext.referrer) : "",
      reasonForReferral: compressConsultantSentence(letter.referralContext.reasonForReferral),
      visitType: compressConsultantSentence(letter.referralContext.visitType),
      openingLine: compressConsultantSentence(letter.referralContext.openingLine),
    },
    cardiacRiskFactors: compressStringArray(letter.cardiacRiskFactors.filter(Boolean), compressConsultantSentence),
    cardiacHistory: compressStringArray(letter.cardiacHistory.filter(Boolean), compressConsultantSentence),
    otherMedicalHistory: compressStringArray(letter.otherMedicalHistory.filter(Boolean), compressConsultantSentence),
    allergies: compressStringArray(letter.allergies.filter(Boolean), compressConsultantSentence),
    socialHistory: compressStringArray(letter.socialHistory.filter(Boolean), compressConsultantSentence),
    presentingHistory: compressConsultantSentence(letter.presentingHistory),
    physicalExamination: compressConsultantSentence(letter.physicalExamination),
    investigations: compressStringArray(letter.investigations.filter(Boolean), compressConsultantSentence),
    summary: compressConsultantSentence(letter.summary),
    assessmentPlan: letter.assessmentPlan
      .map((item) => ({
        problem: compressConsultantSentence(item.problem),
        assessment: compressConsultantSentence(item.assessment),
        plan: compressConsultantSentence(item.plan),
      }))
      .filter((item) => item.problem || item.assessment || item.plan),
    followUp: hasFollowUpSignal ? compressConsultantSentence(letter.followUp) : "",
    closing: compressConsultantSentence(letter.closing),
    evidenceSupport,
    evidenceLimitations,
  };
}

export function sanitizeDischargeSummary(summary: StructuredDischargeSummary, transcript: string): StructuredDischargeSummary {
  const lower = transcript.toLowerCase();
  const hasExplicitSex = /\b(female|male|woman|man)\b/i.test(transcript);
  const hasExplicitAdmission = /(admitted with|admitted for|reason for admission|presented with)/i.test(lower);
  const hasExplicitBackground = /(history of|past medical history|pmhx|known to have|background of|prior pci|prior cabg|known hfre?f|known hf|known af)/i.test(lower);
  const hasEvidenceContext = /(heart failure|hfre?f|arrhythmia|atrial fibrillation|\baf\b|pci|cabg|angiography|echo|renal function|electrolytes|medication change|diuresis)/i.test(lower);
  const evidenceSupport = hasEvidenceContext ? sanitizeEvidenceSupportItems(summary.evidenceSupport, transcript, { mode: "discharge" }) : [];
  const fallbackEvidenceSupport = evidenceSupport.length ? evidenceSupport : inferEvidenceSupportFromTranscript(transcript, { mode: "discharge" });
  const evidenceLimitations = appendEvidenceLimitations(summary.evidenceLimitations, [
    !hasEvidenceContext ? "Evidence support withheld because discharge-specific transcript detail was limited." : "",
    !/(follow up|clinic|gp|pending|result)/i.test(lower) ? "Follow-up and pending-result detail is limited in the transcript." : "",
  ]);

  return {
    ...summary,
    patientContext: {
      explicitDemographics: hasExplicitSex ? compressDischargeSentence(summary.patientContext.explicitDemographics) : "",
      explicitAdmissionReason: hasExplicitAdmission ? compressDischargeSentence(summary.patientContext.explicitAdmissionReason) : "",
      explicitCardiacBackground: hasExplicitBackground
        ? compressStringArray(summary.patientContext.explicitCardiacBackground, compressDischargeSentence)
        : [],
    },
    admissionCourse: compressDischargeSentence(summary.admissionCourse),
    keyInvestigations: compressStringArray(summary.keyInvestigations.filter(Boolean), compressDischargeSentence),
    procedures: compressStringArray(summary.procedures.filter(Boolean), compressDischargeSentence),
    dischargeDiagnoses: compressStringArray(summary.dischargeDiagnoses.filter(Boolean), compressDischargeSentence),
    medicationChanges: compressStringArray(summary.medicationChanges.filter(Boolean), compressDischargeSentence),
    dischargeStatus: compressDischargeSentence(summary.dischargeStatus),
    followUpPlans: compressStringArray(summary.followUpPlans.filter(Boolean), compressDischargeSentence),
    dischargeInstructions: compressStringArray(summary.dischargeInstructions.filter(Boolean), compressDischargeSentence),
    pendingResults: compressStringArray(summary.pendingResults.filter(Boolean), compressDischargeSentence),
    escalationAdvice: compressDischargeSentence(summary.escalationAdvice) || (/(advise return for|return for|seek urgent review if|worsening breathlessness|recurrent chest pain|palpitations)/i.test(lower)
      ? compressDischargeSentence(
          transcript.match(/(advise return for[^.]+|return for[^.]+|seek urgent review if[^.]+)/i)?.[0] || "",
        )
      : ""),
    evidenceSupport: fallbackEvidenceSupport,
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

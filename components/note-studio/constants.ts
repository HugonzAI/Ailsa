import type {
  EncounterType,
  PatientContext,
  StructuredCardiacNote,
  StructuredConsultantLetter,
  StructuredDischargeSummary,
  StructuredOutput,
} from "@/lib/types";

export type ReviewStatus = "pending" | "accepted" | "rejected";
export type AuditEntry = { action: "accepted" | "rejected"; timestamp: string; encounterType: string };

export const outputPlaceholder = "Cardiology draft will appear here.";

export const demoTranscript = `Registrar: Overnight she was less breathless and there was no further chest pain.
Nurse: Telemetry showed brief atrial fibrillation overnight, now back in sinus rhythm.
Doctor: Weight is down 1.2 kg, urine output was good, and fluid balance was negative 1.4 litres.
Doctor: Blood pressure 108 over 64, heart rate 78, oxygen saturation 96 percent on room air, afebrile.
Doctor: JVP is mildly elevated, bibasal crackles have improved, and there is only trace ankle oedema now.
Doctor: Creatinine is stable, potassium is 4.2, troponin is flat, and yesterday's echo showed reduced LV systolic function with EF around 35 percent.
Doctor: Overall this looks like improving decompensated HFrEF.
Doctor: Continue IV furosemide today, monitor renal function and electrolytes, continue bisoprolol, and consider discharge in 24 to 48 hours if she keeps improving.`;

export const consultantDemoTranscript = `Consultant: Referred by Dr Martinez for cardiac assessment of chest discomfort.
Consultant: The patient reports 3 weeks of exertional chest pressure when climbing stairs, mowing the lawn, or rushing for the bus. Symptoms improve with rest after around 5 minutes.
Consultant: Associated dyspnoea, diaphoresis, and intermittent left arm heaviness. One episode occurred at rest during emotional stress.
Consultant: Background includes reflux and chronic low back pain. No known prior cardiac history.
Consultant: Cardiovascular risk factors include hypertension, pre-diabetes, previous smoking, and family history of premature coronary artery disease.
Consultant: Current medications are vitamins, ibuprofen as needed, and omeprazole regularly.
Consultant: ECG and blood work were ordered today, with stress testing to be arranged. Overall this is concerning for possible angina. Follow up after stress test results.`;

export const dischargeDemoTranscript = `Doctor: Admitted with decompensated HFrEF and fluid overload. Over the admission she improved with IV diuresis and monitoring. Brief atrial fibrillation occurred overnight but settled.
Doctor: Echo showed reduced LV systolic function with EF around 35 percent. Creatinine remained stable and troponin stayed flat.
Doctor: She is now breathing comfortably on room air with improved JVP and minimal peripheral oedema.
Doctor: Discharge diagnoses are decompensated HFrEF and brief paroxysmal atrial fibrillation.
Doctor: Plan on discharge is to continue furosemide and bisoprolol, arrange cardiology follow up, and repeat renal function and electrolytes after discharge.
Doctor: Advise return for worsening breathlessness, chest pain, palpitations, or recurrent fluid overload symptoms.`;

export const encounterOptions: EncounterType[] = [
  "Ward round",
  "Admission",
  "Discharge",
  "Handover",
  "Chest pain",
  "HF review",
  "AF review",
  "Syncope review",
  "Cardiology consultant letter",
];

export const emptyPatientContext: PatientContext = {
  explicitDemographics: "",
  explicitAdmissionReason: "",
  explicitCardiacBackground: [],
};

export const emptyStructuredNote: StructuredCardiacNote = {
  documentType: "cardiac_inpatient_note",
  patientContext: emptyPatientContext,
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

export const emptyConsultantLetter: StructuredConsultantLetter = {
  documentType: "cardiology_consultant_letter",
  referralContext: { referrer: "", reasonForReferral: "", visitType: "", openingLine: "" },
  cardiacRiskFactors: [],
  cardiacHistory: [],
  otherMedicalHistory: [],
  currentMedications: {
    antithrombotics: [],
    antihypertensives: [],
    heartFailureMedications: [],
    lipidLoweringAgents: [],
    otherMedications: [],
  },
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

export const emptyDischargeSummary: StructuredDischargeSummary = {
  documentType: "cardiac_discharge_summary",
  patientContext: emptyPatientContext,
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

export function formatAuditTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

export function getEmptyStructuredOutput(next: EncounterType): StructuredOutput {
  if (next === "Cardiology consultant letter") return emptyConsultantLetter;
  if (next === "Discharge") return emptyDischargeSummary;
  return emptyStructuredNote;
}

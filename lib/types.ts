export type EncounterType =
  | "Cardiac ward round"
  | "Cardiac admission"
  | "Cardiac discharge"
  | "Cardiac handover"
  | "Chest pain / ACS review"
  | "Decompensated heart failure"
  | "AF / arrhythmia review"
  | "Syncope / presyncope review"
  | "Cardiology consultant letter";

export type DocumentType = "cardiac_inpatient_note" | "cardiology_consultant_letter" | "cardiac_discharge_summary";

export type NoteGenerationRequest = {
  transcript: string;
  encounterType?: EncounterType;
};

export type PatientContext = {
  explicitDemographics: string;
  explicitAdmissionReason: string;
  explicitCardiacBackground: string[];
};

export type TaskItem = {
  task: string;
  owner: string;
  timing: string;
  urgency: string;
};

export type EvidenceSupportType = "guideline" | "common-practice" | "risk-flag";
export type EvidenceConfidence = "low" | "medium" | "high";

export type EvidenceSupportItem = {
  claim: string;
  rationale: string;
  evidenceType: EvidenceSupportType;
  confidence: EvidenceConfidence;
  citationLabel: string;
};

export type StructuredCardiacNote = {
  documentType: "cardiac_inpatient_note";
  patientContext: PatientContext;
  overnightEvents: string;
  symptoms: string;
  observations: string;
  examination: string;
  keyInvestigations: string;
  assessment: string;
  activeProblems: string[];
  planToday: string[];
  tasksAllocated: TaskItem[];
  actionSummary: string[];
  nextReview: string;
  escalationsSafetyConcerns: string;
  dischargeConsiderations: string;
  evidenceSupport: EvidenceSupportItem[];
  evidenceLimitations: string[];
};

export type StructuredDischargeSummary = {
  documentType: "cardiac_discharge_summary";
  patientContext: PatientContext;
  admissionCourse: string;
  keyInvestigations: string[];
  procedures: string[];
  dischargeDiagnoses: string[];
  medicationChanges: string[];
  dischargeStatus: string;
  followUpPlans: string[];
  dischargeInstructions: string[];
  pendingResults: string[];
  escalationAdvice: string;
  evidenceSupport: EvidenceSupportItem[];
  evidenceLimitations: string[];
};

export type ConsultantReferralContext = {
  referrer: string;
  reasonForReferral: string;
  visitType: string;
  openingLine: string;
};

export type ConsultantMedicationGroups = {
  antithrombotics: string[];
  antihypertensives: string[];
  heartFailureMedications: string[];
  lipidLoweringAgents: string[];
  otherMedications: string[];
};

export type ConsultantAssessmentPlanItem = {
  problem: string;
  assessment: string;
  plan: string;
};

export type StructuredConsultantLetter = {
  documentType: "cardiology_consultant_letter";
  referralContext: ConsultantReferralContext;
  cardiacRiskFactors: string[];
  cardiacHistory: string[];
  otherMedicalHistory: string[];
  currentMedications: ConsultantMedicationGroups;
  allergies: string[];
  socialHistory: string[];
  presentingHistory: string;
  physicalExamination: string;
  investigations: string[];
  summary: string;
  assessmentPlan: ConsultantAssessmentPlanItem[];
  followUp: string;
  closing: string;
  evidenceSupport: EvidenceSupportItem[];
  evidenceLimitations: string[];
};

export type StructuredOutput = StructuredCardiacNote | StructuredConsultantLetter | StructuredDischargeSummary;

export type NoteGenerationResponse = {
  soapNote: string;
  structured: StructuredOutput;
  mode: "mock" | "provider";
};

export type TranscriptSpeaker = "Doctor" | "Patient" | "Nurse" | "Family" | "Unknown" | "Speaker 1" | "Speaker 2" | "Speaker 3";

export type TranscriptSpeakerLine = {
  speaker: TranscriptSpeaker;
  text: string;
};

export type TranscriptionResponse = {
  transcript: string;
  speakerLines?: TranscriptSpeakerLine[];
  mode: "mock" | "provider";
  filename?: string;
};

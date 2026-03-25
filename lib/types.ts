export type EncounterType =
  | "Cardiac ward round"
  | "Cardiac admission"
  | "Cardiac discharge"
  | "Cardiac handover"
  | "Chest pain / ACS review"
  | "Decompensated heart failure"
  | "AF / arrhythmia review"
  | "Syncope / presyncope review";

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

export type NoteGenerationResponse = {
  soapNote: string;
  structured: StructuredCardiacNote;
  mode: "mock" | "provider";
};

export type TranscriptionResponse = {
  transcript: string;
  mode: "mock" | "provider";
  filename?: string;
};

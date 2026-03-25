export type EncounterType =
  | "Cardiac ward round"
  | "Cardiac admission"
  | "Cardiac discharge"
  | "Chest pain / ACS review"
  | "Decompensated heart failure"
  | "AF / arrhythmia review"
  | "Syncope / presyncope review";

export type NoteGenerationRequest = {
  transcript: string;
  encounterType?: EncounterType;
};

export type StructuredCardiacNote = {
  patientContext: string;
  overnightEvents: string;
  symptoms: string;
  observations: string;
  examination: string;
  keyInvestigations: string;
  assessment: string;
  activeProblems: string[];
  planToday: string[];
  dischargeConsiderations: string;
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

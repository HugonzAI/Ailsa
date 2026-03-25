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

export type NoteGenerationResponse = {
  soapNote: string;
  mode: "mock" | "provider";
};

export type TranscriptionResponse = {
  transcript: string;
  mode: "mock" | "provider";
  filename?: string;
};

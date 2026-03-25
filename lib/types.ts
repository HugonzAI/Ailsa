export type EncounterType =
  | "GP consultation"
  | "Follow-up visit"
  | "Urgent care"
  | "Telehealth"
  | "Specialist review";

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

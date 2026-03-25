export type NoteGenerationRequest = {
  transcript: string;
  encounterType?: string;
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

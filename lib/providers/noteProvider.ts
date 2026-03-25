// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

import type { EncounterType, StructuredOutput } from "@/lib/types";

export interface NoteProvider {
  generateNote(
    transcript: string,
    encounterType: EncounterType | undefined,
  ): Promise<{ soapNote: string; structured: StructuredOutput }>;
}

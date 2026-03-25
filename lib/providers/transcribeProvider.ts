// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

export interface TranscribeProvider {
  transcribe(audio: Blob, filename: string, language?: string): Promise<string>;
}

// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

import { getOpenAIApiKey } from "@/lib/openai";
import type { TranscribeProvider } from "@/lib/providers/transcribeProvider";

export class WhisperTranscribeProvider implements TranscribeProvider {
  async transcribe(audio: Blob, filename: string) {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing. Add it to .env.local or re-enable mock transcription.");
    }

    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", "whisper-1");
    form.append("response_format", "text");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Whisper transcription failed", text);
      throw new Error("Transcription failed.");
    }

    return text;
  }
}

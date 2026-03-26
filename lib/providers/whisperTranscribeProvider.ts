// Swap this class for MedGemmaProvider / LocalTranscribeProvider when deploying on-premise.

import { getOpenAIApiKey, getOpenAITranscribeModel } from "@/lib/openai";
import type { TranscribeProvider } from "@/lib/providers/transcribeProvider";

const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;

function buildWhisperPrompt(language?: string) {
  if (language && language !== "en") {
    return [
      "Return a faithful English transcript only.",
      "Translate literally and conservatively.",
      "Do not summarize, explain, embellish, or infer unstated details.",
      "Preserve medical abbreviations, drug names, measurements, uncertainty, false starts, and speaker wording as closely as possible.",
      "If the speaker is unclear, keep it conservative rather than guessing.",
    ].join(" ");
  }

  return [
    "Return a faithful verbatim transcript only.",
    "Do not summarize, explain, embellish, or infer unstated details.",
    "Preserve cardiology abbreviations, drug names, measurements, uncertainty, false starts, and speaker wording as spoken.",
    "If audio is unclear, keep it conservative rather than guessing.",
  ].join(" ");
}

export class WhisperTranscribeProvider implements TranscribeProvider {
  async transcribe(audio: Blob, filename: string, language?: string) {
    const apiKey = getOpenAIApiKey();
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing. Add it to .env.local or re-enable mock transcription.");
    }

    if (audio.size > MAX_TRANSCRIBE_BYTES) {
      throw new Error("Audio file exceeds the provider 25 MB upload limit. Use browser recording for segmented transcription, or upload a shorter clip.");
    }

    const endpoint = language && language !== "en"
      ? "https://api.openai.com/v1/audio/translations"
      : "https://api.openai.com/v1/audio/transcriptions";
    const model = getOpenAITranscribeModel();

    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", model);
    form.append("response_format", "text");
    form.append("temperature", "0");
    form.append("prompt", buildWhisperPrompt(language));
    if (language && language !== "en") {
      form.append("language", language);
    } else if (language) {
      form.append("language", language);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Whisper transcription failed", text);

      if (response.status === 413 || text.includes("Maximum content size limit")) {
        throw new Error("Audio file exceeds the provider 25 MB upload limit. Use browser recording for segmented transcription, or upload a shorter clip.");
      }

      throw new Error("Transcription failed.");
    }

    return text.trim();
  }
}

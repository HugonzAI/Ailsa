import { NextResponse } from "next/server";
import { WhisperTranscribeProvider } from "@/lib/providers/whisperTranscribeProvider";
import type { TranscriptionResponse } from "@/lib/types";

function buildMockTranscript(filename?: string) {
  return [
    "Doctor: Hi, what brings you in today?",
    "Patient: I have had a sore throat, fever, and mild cough for the past two days.",
    "Doctor: Any shortness of breath or chest pain?",
    "Patient: No shortness of breath and no chest pain.",
    "Doctor: Any medication allergies?",
    "Patient: No known drug allergies.",
    `Doctor: Mock transcription generated${filename ? ` for file ${filename}` : ""}.`,
  ].join("\n");
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("audio");
  const language = formData.get("language");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Audio file is required." }, { status: 400 });
  }

  const mockMode = process.env.MOCK_TRANSCRIPTION !== "0";

  if (mockMode) {
    const response: TranscriptionResponse = {
      transcript: buildMockTranscript(file.name),
      mode: "mock",
      filename: file.name,
    };
    return NextResponse.json(response);
  }

  try {
    const provider = new WhisperTranscribeProvider();
    const transcript = await provider.transcribe(file, file.name, typeof language === "string" ? language : undefined);

    const result: TranscriptionResponse = {
      transcript,
      mode: "provider",
      filename: file.name,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Whisper transcription failed", error);

    if (error instanceof Error && error.message.includes("OPENAI_API_KEY is missing")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
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

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is missing. Add it to .env.local or re-enable mock transcription." },
      { status: 500 },
    );
  }

  try {
    const transcription = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "text",
    });

    const response: TranscriptionResponse = {
      transcript: typeof transcription === "string" ? transcription : String(transcription),
      mode: "provider",
      filename: file.name,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Whisper transcription failed", error);
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }
}

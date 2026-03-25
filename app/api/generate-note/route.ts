import { NextResponse } from "next/server";
import { buildSoapPrompt, getAnthropicClient, getAnthropicModel } from "@/lib/anthropic";
import type { NoteGenerationRequest, NoteGenerationResponse } from "@/lib/types";

function buildMockSoapNote(transcript: string): string {
  const preview = transcript
    .split("\n")
    .slice(0, 3)
    .map((line) => line.trim())
    .join(" ");

  return [
    "Subjective",
    "Patient reports sore throat and fever for two days with mild cough. No shortness of breath. No known drug allergies mentioned.",
    "",
    "Objective",
    "Temperature recorded at 38.3C. Throat described as red without exudate.",
    "",
    "Assessment",
    "Likely viral upper respiratory infection based on recorded symptoms and exam findings.",
    "",
    "Plan",
    "Rest, fluids, paracetamol as needed, and return for review if symptoms worsen or breathing becomes difficult.",
    "",
    `Transcript preview used in mock mode: ${preview}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json()) as NoteGenerationRequest;

  if (!body.transcript || !body.transcript.trim()) {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
  }

  const transcript = body.transcript.trim();
  const mockMode = process.env.MOCK_NOTE_GENERATION !== "0";

  if (mockMode) {
    const response: NoteGenerationResponse = {
      soapNote: buildMockSoapNote(transcript),
      mode: "mock",
    };

    return NextResponse.json(response);
  }

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json(
      {
        error: "ANTHROPIC_API_KEY is missing. Add it to .env.local or re-enable mock mode.",
      },
      { status: 500 },
    );
  }

  try {
    const completion = await client.messages.create({
      model: getAnthropicModel(),
      max_tokens: 900,
      temperature: 0.2,
      system: "You produce draft clinical SOAP notes for clinician review.",
      messages: [
        {
          role: "user",
          content: buildSoapPrompt(transcript, body.encounterType),
        },
      ],
    });

    const text = completion.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const response: NoteGenerationResponse = {
      soapNote: text || "No note output returned.",
      mode: "provider",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Claude note generation failed", error);
    return NextResponse.json(
      {
        error: "Claude note generation failed.",
      },
      { status: 502 },
    );
  }
}

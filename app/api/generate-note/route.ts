import { NextResponse } from "next/server";
import { buildSoapPrompt, getAnthropicApiKey, getAnthropicModel } from "@/lib/anthropic";
import type { NoteGenerationRequest, NoteGenerationResponse } from "@/lib/types";

function buildMockSoapNote(transcript: string): string {
  const preview = transcript
    .split("\n")
    .slice(0, 3)
    .map((line) => line.trim())
    .join(" ");

  return [
    "Patient Context",
    "Admitted under cardiology with decompensated heart failure picture.",
    "",
    "Overnight / Interval Events",
    "Improved breathlessness overnight with no recurrent chest pain. Brief AF noted on telemetry and self-resolved.",
    "",
    "Symptoms",
    "Less dyspnoeic today. No ongoing chest pain. No current palpitations reported.",
    "",
    "Observations",
    "Haemodynamically stable. Weight down and negative fluid balance documented.",
    "",
    "Examination",
    "Mildly elevated JVP with improving bibasal crackles and only trace peripheral oedema.",
    "",
    "Key Investigations",
    "Creatinine stable, potassium acceptable, troponin flat, echo showing reduced LV systolic function.",
    "",
    "Assessment",
    "Improving decompensated HFrEF with favourable response to diuresis.",
    "",
    "Active Problems",
    "- Decompensated heart failure, improving with IV diuresis\n- Brief atrial fibrillation episode overnight\n- Ongoing discharge planning if improvement continues",
    "",
    "Plan Today",
    "Continue IV diuresis today, monitor renal function and electrolytes, continue guideline-directed therapy where tolerated, and reassess discharge readiness tomorrow.",
    "",
    "Discharge Considerations",
    "Potential discharge in 24–48 hours if clinically stable with continued improvement and no new rhythm issues.",
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

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "ANTHROPIC_API_KEY is missing. Add it to .env.local or re-enable mock mode.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
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
      }),
    });

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("Claude note generation failed", json);
      return NextResponse.json(
        {
          error: json.error?.message || "Claude note generation failed.",
        },
        { status: 502 },
      );
    }

    const text = (json.content || [])
      .filter((block) => block.type === "text")
      .map((block) => block.text || "")
      .join("\n")
      .trim();

    const result: NoteGenerationResponse = {
      soapNote: text || "No note output returned.",
      mode: "provider",
    };

    return NextResponse.json(result);
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

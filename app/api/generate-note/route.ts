import { NextResponse } from "next/server";
import {
  buildStructuredCardiacPrompt,
  coerceStructuredCardiacNote,
  getAnthropicApiKey,
  getAnthropicModel,
  renderStructuredNote,
  sanitizeStructuredCardiacNote,
} from "@/lib/anthropic";
import type { NoteGenerationRequest, NoteGenerationResponse, StructuredCardiacNote } from "@/lib/types";

function buildMockStructuredNote(): StructuredCardiacNote {
  return {
    patientContext: {
      explicitDemographics: "",
      explicitAdmissionReason: "Admitted under cardiology with decompensated HFrEF.",
      explicitCardiacBackground: ["Reduced EF on recent echo"],
    },
    overnightEvents: "Less breathless overnight. No recurrent chest pain. Brief AF noted on telemetry and self-resolved.",
    symptoms: "Improved dyspnoea today. No ongoing chest pain or palpitations.",
    observations: "BP 108/64 | HR 78 | SpO2 96% RA | Afebrile | Wt down 1.2 kg | Fluid balance -1.4 L",
    examination: "JVP mildly elevated. Bibasal crackles improved. Trace peripheral oedema.",
    keyInvestigations: "Creatinine stable. K acceptable. Troponin flat. Echo with reduced LV systolic function.",
    assessment: "Improving decompensated HFrEF with favourable response to IV diuresis. Brief AF overnight now back in sinus rhythm.",
    activeProblems: [
      "Decompensated HFrEF, improving on IV diuresis",
      "Brief paroxysmal AF overnight, currently in sinus rhythm",
      "Residual volume overload with mildly elevated JVP",
    ],
    planToday: [
      "Continue IV furosemide",
      "Monitor renal function and electrolytes",
      "Continue bisoprolol",
      "Reassess discharge readiness tomorrow if improvement continues",
    ],
    tasksAllocated: [
      {
        task: "U&E review",
        owner: "medical team",
        timing: "today",
        urgency: "",
      },
    ],
    actionSummary: [
      "Continue IV diuresis",
      "Track renal function and electrolytes",
      "Review rhythm recurrence on telemetry",
    ],
    nextReview: "Review again tomorrow; consider discharge in 24–48 hours if stable.",
    escalationsSafetyConcerns: "",
    dischargeConsiderations: "Potential discharge in 24–48 hours if clinically stable with no further rhythm issues and ongoing response to treatment.",
    evidenceSupport: [
      {
        claim: "Current picture is consistent with improving decompensated HFrEF after diuresis.",
        rationale: "Improving breathlessness, negative fluid balance, weight reduction, and improving congestion all support response to decongestive therapy.",
        evidenceType: "common-practice",
        confidence: "medium",
        citationLabel: "General heart failure guidance",
      },
      {
        claim: "Ongoing electrolyte and renal monitoring is consistent with standard IV diuresis safety practice.",
        rationale: "Transcript includes continued IV furosemide with explicit plan to monitor renal function and electrolytes.",
        evidenceType: "risk-flag",
        confidence: "high",
        citationLabel: "General inpatient heart failure practice",
      },
    ],
    evidenceLimitations: [
      "No full medication chart available in transcript.",
      "No trend data beyond the described overnight interval.",
    ],
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as NoteGenerationRequest;

  if (!body.transcript || !body.transcript.trim()) {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
  }

  const transcript = body.transcript.trim();
  const mockMode = process.env.MOCK_NOTE_GENERATION !== "0";

  if (mockMode) {
    const structured = sanitizeStructuredCardiacNote(buildMockStructuredNote(), transcript);
    const response: NoteGenerationResponse = {
      soapNote: renderStructuredNote(structured),
      structured,
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
        max_tokens: 1800,
        temperature: 0.1,
        system: "You produce structured inpatient cardiology note, handover, and evidence-support data for clinician review.",
        messages: [
          {
            role: "user",
            content: buildStructuredCardiacPrompt(transcript, body.encounterType),
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

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      console.error("Structured note JSON parse failed", text, error);
      return NextResponse.json(
        {
          error: "Model did not return valid structured JSON.",
        },
        { status: 502 },
      );
    }

    const structured = sanitizeStructuredCardiacNote(coerceStructuredCardiacNote(parsed), transcript);
    const result: NoteGenerationResponse = {
      soapNote: renderStructuredNote(structured),
      structured,
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

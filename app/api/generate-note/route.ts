import { NextResponse } from "next/server";
import {
  buildConsultantLetterPrompt,
  buildDischargeSummaryPrompt,
  buildStructuredCardiacPrompt,
  coerceConsultantLetter,
  coerceDischargeSummary,
  coerceStructuredCardiacNote,
  getAnthropicApiKey,
  getAnthropicModel,
  getDocumentType,
  renderStructuredOutput,
  sanitizeConsultantLetter,
  sanitizeDischargeSummary,
  sanitizeStructuredCardiacNote,
} from "@/lib/anthropic";
import type {
  NoteGenerationRequest,
  NoteGenerationResponse,
  StructuredCardiacNote,
  StructuredConsultantLetter,
  StructuredDischargeSummary,
  StructuredOutput,
} from "@/lib/types";

function buildMockStructuredNote(): StructuredCardiacNote {
  return {
    documentType: "cardiac_inpatient_note",
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
    tasksAllocated: [{ task: "U&E review", owner: "medical team", timing: "today", urgency: "" }],
    actionSummary: ["Continue IV diuresis", "Track renal function and electrolytes", "Review rhythm recurrence on telemetry"],
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
    ],
    evidenceLimitations: ["No full medication chart available in transcript."],
  };
}

function buildMockConsultantLetter(): StructuredConsultantLetter {
  return {
    documentType: "cardiology_consultant_letter",
    referralContext: {
      referrer: "Dr Martinez",
      reasonForReferral: "Chest discomfort for cardiac assessment",
      visitType: "New patient cardiac assessment",
      openingLine: "I had the pleasure of seeing this patient today for cardiac assessment.",
    },
    cardiacRiskFactors: ["Hypertension", "Pre-diabetes", "Ex-smoker", "Family history of premature coronary artery disease"],
    cardiacHistory: ["No known prior cardiac history"],
    otherMedicalHistory: ["Gastro-oesophageal reflux disease", "Chronic low back pain"],
    currentMedications: {
      antithrombotics: [],
      antihypertensives: [],
      heartFailureMedications: [],
      lipidLoweringAgents: [],
      otherMedications: ["Vitamins", "Ibuprofen as needed", "Omeprazole regularly"],
    },
    allergies: [],
    socialHistory: ["Sedentary desk job", "Limited exercise since symptom onset", "Ex-smoker"],
    presentingHistory: "Referred for assessment of exertional chest pressure over the past 3 weeks, associated with dyspnoea, diaphoresis, and intermittent left arm heaviness, resolving with rest.",
    physicalExamination: "Examination performed.",
    investigations: ["ECG ordered", "Blood work ordered", "Stress test to be scheduled"],
    summary: "Symptoms are concerning for possible angina in the context of multiple cardiovascular risk factors.",
    assessmentPlan: [
      {
        problem: "Suspected angina",
        assessment: "Exertional chest pressure with associated dyspnoea and arm symptoms is concerning for ischaemia.",
        plan: "ECG and blood work today. Arrange stress testing. Consider further coronary imaging depending on results.",
      },
    ],
    followUp: "Follow up after stress test results, or sooner if symptoms worsen.",
    closing: "Thank you for the referral.",
    evidenceSupport: [
      {
        claim: "Exertional chest pressure relieved by rest is a clinically important angina pattern.",
        rationale: "The transcript describes exertional symptoms with relief on resting and associated dyspnoea/arm symptoms.",
        evidenceType: "common-practice",
        confidence: "medium",
        citationLabel: "General cardiology guidance",
      },
    ],
    evidenceLimitations: ["No ECG result included in transcript.", "No troponin or imaging result yet available."],
  };
}

function buildMockDischargeSummary(): StructuredDischargeSummary {
  return {
    documentType: "cardiac_discharge_summary",
    patientContext: {
      explicitDemographics: "",
      explicitAdmissionReason: "Admitted with decompensated HFrEF.",
      explicitCardiacBackground: ["Reduced LV systolic function on echo"],
    },
    admissionCourse: "Admitted with fluid overload and dyspnoea. Improved with IV diuresis and monitoring. Brief AF occurred overnight but resolved.",
    keyInvestigations: ["Echo with EF around 35%", "Creatinine remained stable", "Troponin flat"],
    procedures: [],
    dischargeDiagnoses: ["Decompensated HFrEF", "Brief paroxysmal atrial fibrillation"],
    medicationChanges: ["Continue furosemide", "Continue bisoprolol"],
    dischargeStatus: "Clinically improved, euvolaemic, and suitable for discharge if stable.",
    followUpPlans: ["Cardiology follow up", "Ongoing renal function and electrolyte monitoring"],
    dischargeInstructions: ["Return for worsening breathlessness, chest pain, palpitations, or fluid overload symptoms"],
    pendingResults: [],
    escalationAdvice: "Seek urgent review if symptoms recur or worsen after discharge.",
    evidenceSupport: [
      {
        claim: "Renal and electrolyte follow-up is consistent with common post-diuresis safety practice.",
        rationale: "The transcript describes ongoing diuretic therapy with monitoring during admission.",
        evidenceType: "risk-flag",
        confidence: "medium",
        citationLabel: "General heart failure guidance",
      },
    ],
    evidenceLimitations: ["Discharge medication reconciliation is incomplete in the transcript."],
  };
}

function buildPrompt(transcript: string, encounterType?: NoteGenerationRequest["encounterType"]) {
  const documentType = getDocumentType(encounterType);
  if (documentType === "cardiology_consultant_letter") return buildConsultantLetterPrompt(transcript);
  if (documentType === "cardiac_discharge_summary") return buildDischargeSummaryPrompt(transcript);
  return buildStructuredCardiacPrompt(transcript, encounterType);
}

function sanitizeOutput(output: StructuredOutput, transcript: string): StructuredOutput {
  if (output.documentType === "cardiology_consultant_letter") return sanitizeConsultantLetter(output, transcript);
  if (output.documentType === "cardiac_discharge_summary") return sanitizeDischargeSummary(output, transcript);
  return sanitizeStructuredCardiacNote(output, transcript);
}

function parseOutput(parsed: unknown, encounterType?: NoteGenerationRequest["encounterType"]): StructuredOutput {
  const documentType = getDocumentType(encounterType);
  if (documentType === "cardiology_consultant_letter") return coerceConsultantLetter(parsed);
  if (documentType === "cardiac_discharge_summary") return coerceDischargeSummary(parsed);
  return coerceStructuredCardiacNote(parsed);
}

export async function POST(request: Request) {
  const body = (await request.json()) as NoteGenerationRequest;

  if (!body.transcript || !body.transcript.trim()) {
    return NextResponse.json({ error: "Transcript is required." }, { status: 400 });
  }

  const transcript = body.transcript.trim();
  const mockMode = process.env.MOCK_NOTE_GENERATION !== "0";

  if (mockMode) {
    const documentType = getDocumentType(body.encounterType);
    const raw =
      documentType === "cardiology_consultant_letter"
        ? buildMockConsultantLetter()
        : documentType === "cardiac_discharge_summary"
          ? buildMockDischargeSummary()
          : buildMockStructuredNote();
    const structured = sanitizeOutput(raw, transcript);
    const response: NoteGenerationResponse = {
      soapNote: renderStructuredOutput(structured),
      structured,
      mode: "mock",
    };
    return NextResponse.json(response);
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is missing. Add it to .env.local or re-enable mock mode." },
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
        max_tokens: 2200,
        temperature: 0.1,
        system: "You produce structured cardiology documentation outputs for clinician review.",
        messages: [{ role: "user", content: buildPrompt(transcript, body.encounterType) }],
      }),
    });

    const json = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("Claude note generation failed", json);
      return NextResponse.json({ error: json.error?.message || "Claude note generation failed." }, { status: 502 });
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
      return NextResponse.json({ error: "Model did not return valid structured JSON." }, { status: 502 });
    }

    const structured = sanitizeOutput(parseOutput(parsed, body.encounterType), transcript);
    const result: NoteGenerationResponse = {
      soapNote: renderStructuredOutput(structured),
      structured,
      mode: "provider",
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Claude note generation failed", error);
    return NextResponse.json({ error: "Claude note generation failed." }, { status: 502 });
  }
}

"use client";

import { useMemo, useState } from "react";
import type {
  EncounterType,
  PatientContext,
  StructuredCardiacNote,
  StructuredConsultantLetter,
  StructuredDischargeSummary,
  StructuredOutput,
} from "@/lib/types";

const demoTranscript = `Registrar: Overnight she was less breathless and there was no further chest pain.
Nurse: Telemetry showed brief atrial fibrillation overnight, now back in sinus rhythm.
Doctor: Weight is down 1.2 kg, urine output was good, and fluid balance was negative 1.4 litres.
Doctor: Blood pressure 108 over 64, heart rate 78, oxygen saturation 96 percent on room air, afebrile.
Doctor: JVP is mildly elevated, bibasal crackles have improved, and there is only trace ankle oedema now.
Doctor: Creatinine is stable, potassium is 4.2, troponin is flat, and yesterday's echo showed reduced LV systolic function with EF around 35 percent.
Doctor: Overall this looks like improving decompensated HFrEF.
Doctor: Continue IV furosemide today, monitor renal function and electrolytes, continue bisoprolol, and consider discharge in 24 to 48 hours if she keeps improving.`;

const consultantDemoTranscript = `Consultant: Referred by Dr Martinez for cardiac assessment of chest discomfort.
Consultant: The patient reports 3 weeks of exertional chest pressure when climbing stairs, mowing the lawn, or rushing for the bus. Symptoms improve with rest after around 5 minutes.
Consultant: Associated dyspnoea, diaphoresis, and intermittent left arm heaviness. One episode occurred at rest during emotional stress.
Consultant: Background includes reflux and chronic low back pain. No known prior cardiac history.
Consultant: Cardiovascular risk factors include hypertension, pre-diabetes, previous smoking, and family history of premature coronary artery disease.
Consultant: Current medications are vitamins, ibuprofen as needed, and omeprazole regularly.
Consultant: ECG and blood work were ordered today, with stress testing to be arranged. Overall this is concerning for possible angina. Follow up after stress test results.`;

const dischargeDemoTranscript = `Doctor: Admitted with decompensated HFrEF and fluid overload. Over the admission she improved with IV diuresis and monitoring. Brief atrial fibrillation occurred overnight but settled.
Doctor: Echo showed reduced LV systolic function with EF around 35 percent. Creatinine remained stable and troponin stayed flat.
Doctor: She is now breathing comfortably on room air with improved JVP and minimal peripheral oedema.
Doctor: Discharge diagnoses are decompensated HFrEF and brief paroxysmal atrial fibrillation.
Doctor: Plan on discharge is to continue furosemide and bisoprolol, arrange cardiology follow up, and repeat renal function and electrolytes after discharge.
Doctor: Advise return for worsening breathlessness, chest pain, palpitations, or recurrent fluid overload symptoms.`;

const encounterOptions: EncounterType[] = [
  "Cardiac ward round",
  "Cardiac admission",
  "Cardiac discharge",
  "Cardiac handover",
  "Chest pain / ACS review",
  "Decompensated heart failure",
  "AF / arrhythmia review",
  "Syncope / presyncope review",
  "Cardiology consultant letter",
];

const emptyPatientContext: PatientContext = {
  explicitDemographics: "",
  explicitAdmissionReason: "",
  explicitCardiacBackground: [],
};

const emptyStructuredNote: StructuredCardiacNote = {
  documentType: "cardiac_inpatient_note",
  patientContext: emptyPatientContext,
  overnightEvents: "",
  symptoms: "",
  observations: "",
  examination: "",
  keyInvestigations: "",
  assessment: "",
  activeProblems: [],
  planToday: [],
  tasksAllocated: [],
  actionSummary: [],
  nextReview: "",
  escalationsSafetyConcerns: "",
  dischargeConsiderations: "",
  evidenceSupport: [],
  evidenceLimitations: [],
};

const emptyConsultantLetter: StructuredConsultantLetter = {
  documentType: "cardiology_consultant_letter",
  referralContext: { referrer: "", reasonForReferral: "", visitType: "", openingLine: "" },
  cardiacRiskFactors: [],
  cardiacHistory: [],
  otherMedicalHistory: [],
  currentMedications: {
    antithrombotics: [],
    antihypertensives: [],
    heartFailureMedications: [],
    lipidLoweringAgents: [],
    otherMedications: [],
  },
  allergies: [],
  socialHistory: [],
  presentingHistory: "",
  physicalExamination: "",
  investigations: [],
  summary: "",
  assessmentPlan: [],
  followUp: "",
  closing: "",
  evidenceSupport: [],
  evidenceLimitations: [],
};

const emptyDischargeSummary: StructuredDischargeSummary = {
  documentType: "cardiac_discharge_summary",
  patientContext: emptyPatientContext,
  admissionCourse: "",
  keyInvestigations: [],
  procedures: [],
  dischargeDiagnoses: [],
  medicationChanges: [],
  dischargeStatus: "",
  followUpPlans: [],
  dischargeInstructions: [],
  pendingResults: [],
  escalationAdvice: "",
  evidenceSupport: [],
  evidenceLimitations: [],
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="structuredSection">
      <span className="label">{title}</span>
      <div className="output compact">{children || "—"}</div>
    </div>
  );
}

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState("Cardiology draft will appear here.");
  const [structured, setStructured] = useState<StructuredOutput>(emptyStructuredNote);
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encounterType, setEncounterType] = useState<EncounterType>("Cardiac ward round");

  const transcriptStats = useMemo(() => {
    const chars = transcript.trim().length;
    const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [transcript]);

  async function generate() {
    setLoading(true);
    setStatus("Generating draft...");
    try {
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, encounterType }),
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const data = (await response.json()) as { soapNote: string; mode: string; structured: StructuredOutput };
      setOutput(data.soapNote);
      setStructured(data.structured || emptyStructuredNote);
      setStatus(`Draft ready · ${data.mode} mode · ${encounterType}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to generate draft");
      setOutput("Could not generate a cardiology draft. Check API keys or keep MOCK_NOTE_GENERATION=1 while scaffolding.");
      setStructured(encounterType === "Cardiology consultant letter" ? emptyConsultantLetter : encounterType === "Cardiac discharge" ? emptyDischargeSummary : emptyStructuredNote);
    } finally {
      setLoading(false);
    }
  }

  async function transcribeAudio() {
    if (!selectedFile) {
      setStatus("Choose an audio file first");
      return;
    }
    setTranscribing(true);
    setStatus(`Transcribing ${selectedFile.name}...`);
    try {
      const formData = new FormData();
      formData.append("audio", selectedFile);
      const response = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!response.ok) throw new Error(`Transcription failed with status ${response.status}`);
      const data = (await response.json()) as { transcript: string; mode: string; filename?: string };
      setTranscript(data.transcript);
      setStatus(`Transcript ready · ${data.mode} mode${data.filename ? ` · ${data.filename}` : ""}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to transcribe audio");
    } finally {
      setTranscribing(false);
    }
  }

  async function copyOutput() {
    if (!output || output === "Cardiology draft will appear here.") {
      setStatus("Nothing to copy yet");
      return;
    }
    try {
      await navigator.clipboard.writeText(output);
      setStatus("Draft copied to clipboard");
    } catch (error) {
      console.error(error);
      setStatus("Copy failed");
    }
  }

  function resetDemoTranscript() {
    if (encounterType === "Cardiology consultant letter") setTranscript(consultantDemoTranscript);
    else if (encounterType === "Cardiac discharge") setTranscript(dischargeDemoTranscript);
    else setTranscript(demoTranscript);
  }

  const patientContextText =
    structured.documentType === "cardiac_inpatient_note" || structured.documentType === "cardiac_discharge_summary"
      ? [
          structured.patientContext.explicitDemographics,
          structured.patientContext.explicitAdmissionReason,
          ...(structured.patientContext.explicitCardiacBackground.length
            ? [`Background: ${structured.patientContext.explicitCardiacBackground.join("; ")}`]
            : []),
        ]
          .filter(Boolean)
          .join("\n")
      : "";

  const consultantMedicationText =
    structured.documentType === "cardiology_consultant_letter"
      ? [
          ["Antithrombotics", structured.currentMedications.antithrombotics],
          ["Antihypertensives", structured.currentMedications.antihypertensives],
          ["Heart failure medications", structured.currentMedications.heartFailureMedications],
          ["Lipid-lowering agents", structured.currentMedications.lipidLoweringAgents],
          ["Other medications", structured.currentMedications.otherMedications],
        ]
          .map(([label, items]) => `${label}: ${(items as string[]).join("; ") || "—"}`)
          .join("\n")
      : "";

  const evidenceSupportText = structured.evidenceSupport.length
    ? structured.evidenceSupport
        .map((item) => `• ${[item.claim, item.rationale].filter(Boolean).join(" — ")} (${[item.evidenceType, item.confidence, item.citationLabel].filter(Boolean).join(" | ")})`)
        .join("\n")
    : "—";

  const evidenceLimitationsText = structured.evidenceLimitations.length ? structured.evidenceLimitations.map((item) => `• ${item}`).join("\n") : "—";

  const hasStructuredContent = output !== "Cardiology draft will appear here.";

  return (
    <section className="workspaceShell">
      <aside className="workspacePanel intakePanel">
        <div className="panelHeader">
          <h2>Encounter intake</h2>
          <p>Capture audio or paste transcript text, then choose the documentation mode.</p>
        </div>

        <label className="label" htmlFor="encounterType">Encounter type</label>
        <select
          id="encounterType"
          className="input"
          value={encounterType}
          onChange={(e) => {
            const next = e.target.value as EncounterType;
            setEncounterType(next);
            setStructured(next === "Cardiology consultant letter" ? emptyConsultantLetter : next === "Cardiac discharge" ? emptyDischargeSummary : emptyStructuredNote);
            setOutput("Cardiology draft will appear here.");
          }}
        >
          {encounterOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <label className="label" htmlFor="audio">Consultation audio</label>
        <input id="audio" type="file" accept="audio/*" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />

        <div className="buttonRow stackOnMobile">
          <button className="buttonSecondary" type="button" onClick={transcribeAudio} disabled={transcribing}>
            {transcribing ? "Transcribing…" : "Transcribe audio"}
          </button>
        </div>

        {selectedFile ? <div className="meta compactMeta">Selected: {selectedFile.name}</div> : null}

        <label className="label" htmlFor="transcript">Consultation transcript</label>
        <textarea id="transcript" className="textarea intakeTextarea" value={transcript} onChange={(e) => setTranscript(e.target.value)} />

        <div className="statsRow">
          <div className="statPill">{transcriptStats.words} words</div>
          <div className="statPill">{transcriptStats.chars} chars</div>
        </div>

        <div className="buttonRow stackOnMobile">
          <button className="button" type="button" onClick={generate} disabled={loading}>
            {loading
              ? "Generating…"
              : structured.documentType === "cardiology_consultant_letter"
                ? "Generate consultant letter"
                : structured.documentType === "cardiac_discharge_summary"
                  ? "Generate discharge summary"
                  : "Generate clinical draft"}
          </button>
          <button className="buttonSecondary" type="button" onClick={resetDemoTranscript}>Reset demo</button>
        </div>

        <div className="meta">Status: {status}</div>
      </aside>

      <section className="workspacePanel draftPanel">
        <div className="panelHeader draftHeader">
          <div>
            <h2>
              {structured.documentType === "cardiology_consultant_letter"
                ? "Clinical Draft · Consultant Letter"
                : structured.documentType === "cardiac_discharge_summary"
                  ? "Clinical Draft · Discharge Summary"
                  : "Clinical Draft"}
            </h2>
            <p>
              {structured.documentType === "cardiology_consultant_letter"
                ? "Formal specialist-letter draft for GP/referrer-facing review."
                : structured.documentType === "cardiac_discharge_summary"
                  ? "Cardiac discharge summary draft focused on admission course, medication changes, follow-up, and pending items."
                  : "Structured inpatient cardiology note for clinician review, keeping the main document central."}
            </p>
          </div>
          <div className="buttonRow compact headerActions">
            <button className="buttonSecondary" type="button" onClick={copyOutput}>Copy draft</button>
            <button className="buttonSecondary" type="button" onClick={generate} disabled={loading}>Regenerate</button>
          </div>
        </div>

        {hasStructuredContent ? (
          structured.documentType === "cardiology_consultant_letter" ? (
            <div className="draftDocumentGrid">
              <Section title="Referral Context">{[structured.referralContext.openingLine, structured.referralContext.referrer, structured.referralContext.reasonForReferral, structured.referralContext.visitType].filter(Boolean).join("\n") || "—"}</Section>
              <Section title="Cardiac Risk Factors">{structured.cardiacRiskFactors.length ? structured.cardiacRiskFactors.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Cardiac History">{structured.cardiacHistory.length ? structured.cardiacHistory.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Other Medical History">{structured.otherMedicalHistory.length ? structured.otherMedicalHistory.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Current Medications">{consultantMedicationText || "—"}</Section>
              <Section title="Allergies">{structured.allergies.length ? structured.allergies.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Social History">{structured.socialHistory.length ? structured.socialHistory.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Presenting History">{structured.presentingHistory || "—"}</Section>
              <Section title="Physical Examination">{structured.physicalExamination || "—"}</Section>
              <Section title="Investigations">{structured.investigations.length ? structured.investigations.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Summary">{structured.summary || "—"}</Section>
              <Section title="Assessment / Plan">{structured.assessmentPlan.length ? structured.assessmentPlan.map((item, index) => `#${index + 1} ${item.problem}\nAssessment: ${item.assessment}\nPlan: ${item.plan}`).join("\n\n") : "—"}</Section>
              <Section title="Follow Up">{structured.followUp || "—"}</Section>
              <Section title="Closing">{structured.closing || "—"}</Section>
            </div>
          ) : structured.documentType === "cardiac_discharge_summary" ? (
            <div className="draftDocumentGrid">
              <Section title="Patient Context">{patientContextText || "—"}</Section>
              <Section title="Admission Course">{structured.admissionCourse || "—"}</Section>
              <Section title="Key Investigations">{structured.keyInvestigations.length ? structured.keyInvestigations.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Procedures">{structured.procedures.length ? structured.procedures.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Discharge Diagnoses">{structured.dischargeDiagnoses.length ? structured.dischargeDiagnoses.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Medication Changes">{structured.medicationChanges.length ? structured.medicationChanges.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Discharge Status">{structured.dischargeStatus || "—"}</Section>
              <Section title="Follow Up Plans">{structured.followUpPlans.length ? structured.followUpPlans.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Discharge Instructions">{structured.dischargeInstructions.length ? structured.dischargeInstructions.map((item) => `• ${item}`).join("\n") : "—"}</Section>
            </div>
          ) : (
            <div className="draftDocumentGrid">
              <Section title="Patient Context">{patientContextText || "—"}</Section>
              <Section title="Overnight / Interval Events">{structured.overnightEvents || "—"}</Section>
              <Section title="Symptoms">{structured.symptoms || "—"}</Section>
              <Section title="Observations">{structured.observations || "—"}</Section>
              <Section title="Examination">{structured.examination || "—"}</Section>
              <Section title="Key Investigations">{structured.keyInvestigations || "—"}</Section>
              <Section title="Assessment">{structured.assessment || "—"}</Section>
              <Section title="Active Problems">{structured.activeProblems.length ? structured.activeProblems.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Plan Today">{structured.planToday.length ? structured.planToday.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Discharge Considerations">{structured.dischargeConsiderations || "—"}</Section>
            </div>
          )
        ) : (
          <div className="output draftPlaceholder">{output}</div>
        )}
      </section>

      <aside className="workspaceRail">
        <section className="workspacePanel railPanel">
          <div className="panelHeader">
            <h2>
              {structured.documentType === "cardiology_consultant_letter"
                ? "Workflow / Review"
                : structured.documentType === "cardiac_discharge_summary"
                  ? "Discharge Workflow"
                  : "Workflow / Handover"}
            </h2>
            <p>
              {structured.documentType === "cardiology_consultant_letter"
                ? "Operational review items and next-step logic, separate from the letter body."
                : structured.documentType === "cardiac_discharge_summary"
                  ? "Follow-up, pending results, and escalation items associated with discharge."
                  : "Tasks and next actions derived from the encounter."}
            </p>
          </div>

          {structured.documentType === "cardiology_consultant_letter" ? (
            <div className="railStack">
              <Section title="Investigations">{structured.investigations.length ? structured.investigations.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Follow Up">{structured.followUp || "—"}</Section>
            </div>
          ) : structured.documentType === "cardiac_discharge_summary" ? (
            <div className="railStack">
              <Section title="Pending Results">{structured.pendingResults.length ? structured.pendingResults.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Escalation Advice">{structured.escalationAdvice || "—"}</Section>
            </div>
          ) : (
            <div className="railStack">
              <Section title="Tasks Allocated">{structured.tasksAllocated.length ? structured.tasksAllocated.map((item) => `• ${[item.task, item.owner, item.timing, item.urgency].filter(Boolean).join(" — ")}`).join("\n") : "—"}</Section>
              <Section title="Action Summary">{structured.actionSummary.length ? structured.actionSummary.map((item) => `• ${item}`).join("\n") : "—"}</Section>
              <Section title="Next Review">{structured.nextReview || "—"}</Section>
              <Section title="Escalations / Safety Concerns">{structured.escalationsSafetyConcerns || "—"}</Section>
            </div>
          )}
        </section>

        <section className="workspacePanel railPanel subduedPanel">
          <div className="panelHeader">
            <h2>Evidence Support</h2>
            <p>Separate support layer. Useful for review, but quieter than the main document.</p>
          </div>
          <div className="railStack">
            <Section title="Evidence Support">{evidenceSupportText}</Section>
            <Section title="Evidence Limitations">{evidenceLimitationsText}</Section>
          </div>
        </section>
      </aside>
    </section>
  );
}

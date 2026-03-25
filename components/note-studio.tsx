"use client";

import { useMemo, useState } from "react";
import type { EncounterType, PatientContext, StructuredCardiacNote } from "@/lib/types";

const demoTranscript = `Registrar: Overnight she was less breathless and there was no further chest pain.
Nurse: Telemetry showed brief atrial fibrillation overnight, now back in sinus rhythm.
Doctor: Weight is down 1.2 kg, urine output was good, and fluid balance was negative 1.4 litres.
Doctor: Blood pressure 108 over 64, heart rate 78, oxygen saturation 96 percent on room air, afebrile.
Doctor: JVP is mildly elevated, bibasal crackles have improved, and there is only trace ankle oedema now.
Doctor: Creatinine is stable, potassium is 4.2, troponin is flat, and yesterday's echo showed reduced LV systolic function with EF around 35 percent.
Doctor: Overall this looks like improving decompensated HFrEF.
Doctor: Continue IV furosemide today, monitor renal function and electrolytes, continue bisoprolol, and consider discharge in 24 to 48 hours if she keeps improving.`;

const encounterOptions: EncounterType[] = [
  "Cardiac ward round",
  "Cardiac admission",
  "Cardiac discharge",
  "Cardiac handover",
  "Chest pain / ACS review",
  "Decompensated heart failure",
  "AF / arrhythmia review",
  "Syncope / presyncope review",
];

const emptyPatientContext: PatientContext = {
  explicitDemographics: "",
  explicitAdmissionReason: "",
  explicitCardiacBackground: [],
};

const emptyStructured: StructuredCardiacNote = {
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
};

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState("Cardiology ward note draft will appear here.");
  const [structured, setStructured] = useState<StructuredCardiacNote>(emptyStructured);
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
    setStatus("Generating draft note...");

    try {
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, encounterType }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { soapNote: string; mode: string; structured: StructuredCardiacNote };
      setOutput(data.soapNote);
      setStructured(data.structured || emptyStructured);
      setStatus(`Draft ready · ${data.mode} mode · ${encounterType}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to generate note");
      setOutput("Could not generate a cardiology ward note draft. Check API keys or keep MOCK_NOTE_GENERATION=1 while scaffolding.");
      setStructured(emptyStructured);
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

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed with status ${response.status}`);
      }

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
    if (!output || output === "Cardiology ward note draft will appear here.") {
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

  const patientContextText = [
    structured.patientContext.explicitDemographics,
    structured.patientContext.explicitAdmissionReason,
    ...(structured.patientContext.explicitCardiacBackground.length
      ? [`Background: ${structured.patientContext.explicitCardiacBackground.join("; ")}`]
      : []),
  ]
    .filter(Boolean)
    .join("\n");

  const hasStructuredContent =
    Boolean(patientContextText) ||
    Boolean(structured.overnightEvents) ||
    Boolean(structured.symptoms) ||
    Boolean(structured.observations) ||
    Boolean(structured.examination) ||
    Boolean(structured.keyInvestigations) ||
    Boolean(structured.assessment) ||
    structured.activeProblems.length > 0 ||
    structured.planToday.length > 0 ||
    structured.tasksAllocated.length > 0 ||
    structured.actionSummary.length > 0 ||
    Boolean(structured.nextReview) ||
    Boolean(structured.escalationsSafetyConcerns) ||
    Boolean(structured.dischargeConsiderations);

  return (
    <div className="grid">
      <section className="card">
        <h2>Cardiology encounter workspace</h2>
        <p>Upload audio or paste transcript text, choose the cardiac inpatient encounter type, then generate a conservative clinician-reviewable ward note draft.</p>

        <label className="label" htmlFor="encounterType">Encounter type</label>
        <select id="encounterType" className="input" value={encounterType} onChange={(e) => setEncounterType(e.target.value as EncounterType)}>
          {encounterOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <label className="label" htmlFor="audio">Consultation audio</label>
        <input
          id="audio"
          type="file"
          accept="audio/*"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />

        <div className="buttonRow">
          <button className="buttonSecondary" type="button" onClick={transcribeAudio} disabled={transcribing}>
            {transcribing ? "Transcribing…" : "Transcribe audio"}
          </button>
          {selectedFile ? <div className="meta">Selected: {selectedFile.name}</div> : null}
        </div>

        <label className="label" htmlFor="transcript">Consultation transcript</label>
        <textarea id="transcript" className="textarea" value={transcript} onChange={(e) => setTranscript(e.target.value)} />

        <div className="statsRow">
          <div className="statPill">{transcriptStats.words} words</div>
          <div className="statPill">{transcriptStats.chars} chars</div>
          <div className="statPill">{encounterType}</div>
        </div>

        <div className="buttonRow">
          <button className="button" type="button" onClick={generate} disabled={loading}>
            {loading ? "Generating…" : "Generate ward note draft"}
          </button>
          <button className="buttonSecondary" type="button" onClick={() => setTranscript(demoTranscript)}>
            Reset demo transcript
          </button>
        </div>
        <div className="meta">Status: {status}</div>
      </section>

      <section className="card">
        <h2>Structured cardiac draft</h2>
        <p>This output is meant for clinician review first. The model now returns structured cardiac note sections, problem lists, and plan items rather than only one block of text.</p>
        <div className="buttonRow compact">
          <button className="buttonSecondary" type="button" onClick={copyOutput}>Copy note</button>
          <button className="buttonSecondary" type="button" onClick={generate} disabled={loading}>Regenerate</button>
        </div>

        {hasStructuredContent ? (
          <div className="structuredGrid">
            <div className="structuredSection"><span className="label">Patient Context</span><div className="output compact">{patientContextText || "—"}</div></div>
            <div className="structuredSection"><span className="label">Overnight / Interval Events</span><div className="output compact">{structured.overnightEvents || "—"}</div></div>
            <div className="structuredSection"><span className="label">Symptoms</span><div className="output compact">{structured.symptoms || "—"}</div></div>
            <div className="structuredSection"><span className="label">Observations</span><div className="output compact">{structured.observations || "—"}</div></div>
            <div className="structuredSection"><span className="label">Examination</span><div className="output compact">{structured.examination || "—"}</div></div>
            <div className="structuredSection"><span className="label">Key Investigations</span><div className="output compact">{structured.keyInvestigations || "—"}</div></div>
            <div className="structuredSection"><span className="label">Assessment</span><div className="output compact">{structured.assessment || "—"}</div></div>
            <div className="structuredSection"><span className="label">Active Problems</span><div className="output compact">{structured.activeProblems.length ? structured.activeProblems.map((item) => `• ${item}`).join("\n") : "—"}</div></div>
            <div className="structuredSection"><span className="label">Plan Today</span><div className="output compact">{structured.planToday.length ? structured.planToday.map((item) => `• ${item}`).join("\n") : "—"}</div></div>
            <div className="structuredSection"><span className="label">Tasks Allocated</span><div className="output compact">{structured.tasksAllocated.length ? structured.tasksAllocated.map((item) => `• ${[item.task, item.owner, item.timing, item.urgency].filter(Boolean).join(" — ")}`).join("\n") : "—"}</div></div>
            <div className="structuredSection"><span className="label">Action Summary</span><div className="output compact">{structured.actionSummary.length ? structured.actionSummary.map((item) => `• ${item}`).join("\n") : "—"}</div></div>
            <div className="structuredSection"><span className="label">Next Review</span><div className="output compact">{structured.nextReview || "—"}</div></div>
            <div className="structuredSection"><span className="label">Escalations / Safety Concerns</span><div className="output compact">{structured.escalationsSafetyConcerns || "—"}</div></div>
            <div className="structuredSection"><span className="label">Discharge Considerations</span><div className="output compact">{structured.dischargeConsiderations || "—"}</div></div>
          </div>
        ) : (
          <div className="output">{output}</div>
        )}
      </section>
    </div>
  );
}

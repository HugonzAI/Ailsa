"use client";

import { useMemo, useState } from "react";
import type { EncounterType } from "@/lib/types";

const demoTranscript = `Registrar: Overnight she was less breathless and there was no further chest pain.\nNurse: Telemetry showed brief atrial fibrillation overnight, now back in sinus rhythm.\nDoctor: Weight is down 1.2 kg, urine output was good, and fluid balance was negative 1.4 litres.\nDoctor: Blood pressure 108 over 64, heart rate 78, oxygen saturation 96 percent on room air, afebrile.\nDoctor: JVP is mildly elevated, bibasal crackles have improved, and there is only trace ankle oedema now.\nDoctor: Creatinine is stable, potassium is 4.2, troponin is flat, and yesterday's echo showed reduced LV systolic function with EF around 35 percent.\nDoctor: Overall this looks like improving decompensated HFrEF.\nDoctor: Continue IV furosemide today, monitor renal function and electrolytes, continue bisoprolol, and consider discharge in 24 to 48 hours if she keeps improving.`;

const encounterOptions: EncounterType[] = [
  "Cardiac ward round",
  "Cardiac admission",
  "Cardiac discharge",
  "Chest pain / ACS review",
  "Decompensated heart failure",
  "AF / arrhythmia review",
  "Syncope / presyncope review",
];

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState("Cardiology ward note draft will appear here.");
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

      const data = (await response.json()) as { soapNote: string; mode: string };
      setOutput(data.soapNote);
      setStatus(`Draft ready · ${data.mode} mode · ${encounterType}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to generate note");
      setOutput("Could not generate a cardiology ward note draft. Check API keys or keep MOCK_NOTE_GENERATION=1 while scaffolding.");
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
        <h2>Draft cardiology ward note</h2>
        <p>This output is meant for clinician review first. It is structured around inpatient cardiology workflow rather than a generic SOAP summary.</p>
        <div className="buttonRow compact">
          <button className="buttonSecondary" type="button" onClick={copyOutput}>Copy note</button>
          <button className="buttonSecondary" type="button" onClick={generate} disabled={loading}>Regenerate</button>
        </div>
        <div className="output">{output}</div>
      </section>
    </div>
  );
}

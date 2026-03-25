"use client";

import { useMemo, useState } from "react";
import type { EncounterType } from "@/lib/types";

const demoTranscript = `Doctor: Hi Sarah, what brings you in today?\nPatient: I've had a sore throat and fever for two days.\nDoctor: Any cough or shortness of breath?\nPatient: Mild cough, no shortness of breath.\nDoctor: Any allergies to medication?\nPatient: No known drug allergies.\nDoctor: Your temperature is 38.3C and your throat looks red without exudate.\nDoctor: I think this is most likely a viral upper respiratory infection.\nDoctor: Rest, fluids, paracetamol as needed, and come back if symptoms worsen or breathing becomes difficult.`;

const encounterOptions: EncounterType[] = [
  "GP consultation",
  "Follow-up visit",
  "Urgent care",
  "Telehealth",
  "Specialist review",
];

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState("SOAP draft will appear here.");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encounterType, setEncounterType] = useState<EncounterType>("GP consultation");

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
      setOutput("Could not generate a SOAP note draft. Check API keys or keep MOCK_NOTE_GENERATION=1 while scaffolding.");
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
    if (!output || output === "SOAP draft will appear here.") {
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
        <h2>Encounter workspace</h2>
        <p>Upload audio or paste transcript text, choose the encounter type, then generate a conservative clinician-reviewable SOAP draft.</p>

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
            {loading ? "Generating…" : "Generate SOAP draft"}
          </button>
          <button className="buttonSecondary" type="button" onClick={() => setTranscript(demoTranscript)}>
            Reset demo transcript
          </button>
        </div>
        <div className="meta">Status: {status}</div>
      </section>

      <section className="card">
        <h2>Draft SOAP note</h2>
        <p>This output is meant for clinician review first. Next iterations can add uncertainty flags, transcript evidence, and export modes.</p>
        <div className="buttonRow compact">
          <button className="buttonSecondary" type="button" onClick={copyOutput}>Copy note</button>
          <button className="buttonSecondary" type="button" onClick={generate} disabled={loading}>Regenerate</button>
        </div>
        <div className="output">{output}</div>
      </section>
    </div>
  );
}

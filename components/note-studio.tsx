"use client";

import { useState } from "react";

const demoTranscript = `Doctor: Hi Sarah, what brings you in today?\nPatient: I've had a sore throat and fever for two days.\nDoctor: Any cough or shortness of breath?\nPatient: Mild cough, no shortness of breath.\nDoctor: Any allergies to medication?\nPatient: No known drug allergies.\nDoctor: Your temperature is 38.3C and your throat looks red without exudate.\nDoctor: I think this is most likely a viral upper respiratory infection.\nDoctor: Rest, fluids, paracetamol as needed, and come back if symptoms worsen or breathing becomes difficult.`;

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState("SOAP draft will appear here.");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function generate() {
    setLoading(true);
    setStatus("Generating draft note...");

    try {
      const response = await fetch("/api/generate-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, encounterType: "GP consultation" }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = (await response.json()) as { soapNote: string; mode: string };
      setOutput(data.soapNote);
      setStatus(`Draft ready · ${data.mode} mode`);
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

  return (
    <div className="grid">
      <section className="card">
        <h2>Transcript input</h2>
        <p>For MVP, paste transcript text directly or upload audio and generate a transcript first.</p>

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
        <p>This is the clinician-reviewable draft output. Later we can add confidence markers and transcript-linked evidence.</p>
        <div className="output">{output}</div>
      </section>
    </div>
  );
}

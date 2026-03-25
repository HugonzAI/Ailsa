"use client";

import { useState } from "react";

const demoTranscript = `Doctor: Hi Sarah, what brings you in today?\nPatient: I've had a sore throat and fever for two days.\nDoctor: Any cough or shortness of breath?\nPatient: Mild cough, no shortness of breath.\nDoctor: Any allergies to medication?\nPatient: No known drug allergies.\nDoctor: Your temperature is 38.3C and your throat looks red without exudate.\nDoctor: I think this is most likely a viral upper respiratory infection.\nDoctor: Rest, fluids, paracetamol as needed, and come back if symptoms worsen or breathing becomes difficult.`;

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState("SOAP draft will appear here.");
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);

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
      setStatus(`Done · ${data.mode} mode`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to generate note");
      setOutput("Could not generate a SOAP note draft. Check API keys or keep MOCK_NOTE_GENERATION=1 while scaffolding.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Transcript input</h2>
        <p>For MVP, paste the transcript or start with the seeded demo consultation.</p>
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

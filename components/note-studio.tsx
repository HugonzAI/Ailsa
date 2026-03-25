"use client";

import { useMemo, useState } from "react";
import type { EncounterType, StructuredOutput } from "@/lib/types";
import {
  consultantDemoTranscript,
  dischargeDemoTranscript,
  type AuditEntry,
  demoTranscript,
  emptyStructuredNote,
  getEmptyStructuredOutput,
  type ReviewStatus,
  outputPlaceholder,
} from "@/components/note-studio/constants";
import { IntakeRail } from "@/components/note-studio/intake-rail";
import { DraftWorkspace } from "@/components/note-studio/draft-workspace";
import { SidecarRail } from "@/components/note-studio/sidecar-rail";

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState(outputPlaceholder);
  const [structured, setStructured] = useState<StructuredOutput>(emptyStructuredNote);
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encounterType, setEncounterType] = useState<EncounterType>("Cardiac ward round");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [transcriptFromAudio, setTranscriptFromAudio] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showEvidence, setShowEvidence] = useState(true);
  const [editableOutput, setEditableOutput] = useState(false);

  const transcriptStats = useMemo(() => {
    const chars = transcript.trim().length;
    const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [transcript]);

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

  const hasStructuredContent = output !== outputPlaceholder;
  const transcriptNeedsConfirmation = Boolean(selectedFile && !transcriptConfirmed);
  const showTranscriptBanner = Boolean(transcriptFromAudio && selectedFile && !transcriptConfirmed);

  function appendAudit(action: AuditEntry["action"]) {
    setAuditLog((current) => [
      ...current,
      {
        action,
        timestamp: new Date().toISOString(),
        encounterType,
      },
    ]);
  }

  function clearDraftState(nextEncounterType = encounterType) {
    setStructured(getEmptyStructuredOutput(nextEncounterType));
    setOutput(outputPlaceholder);
    setEditableOutput(false);
  }

  async function generate() {
    setLoading(true);
    setStatus("Generating draft...");
    setReviewStatus(null);
    setEditableOutput(false);
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
      setReviewStatus("pending");
      setStatus(`Draft ready · ${data.mode} mode · ${encounterType}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to generate draft");
      setOutput("Could not generate a cardiology draft. Check API keys or keep MOCK_NOTE_GENERATION=1 while scaffolding.");
      setStructured(getEmptyStructuredOutput(encounterType));
      setReviewStatus(null);
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
      setTranscriptConfirmed(false);
      setTranscriptFromAudio(true);
      setStatus(`Transcript ready · ${data.mode} mode${data.filename ? ` · ${data.filename}` : ""}`);
    } catch (error) {
      console.error(error);
      setStatus("Failed to transcribe audio");
    } finally {
      setTranscribing(false);
    }
  }

  async function copyOutput() {
    if (!output || output === outputPlaceholder) {
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

    setSelectedFile(null);
    setTranscriptConfirmed(false);
    setTranscriptFromAudio(false);
  }

  function handleAccept(editable = false) {
    setReviewStatus("accepted");
    setEditableOutput(editable);
    appendAudit("accepted");
    setStatus(editable ? "Draft accepted for clinician editing" : "Draft accepted for clinician use");
  }

  function handleReject() {
    setReviewStatus("rejected");
    appendAudit("rejected");
    clearDraftState();
    setStatus("Draft rejected — start over when ready");
  }

  return (
    <>
      <header className="topBar">
        <div className="topBarLeft">
          <span className="brand">AILSA</span>
          <nav className="topNav">
            <a href="#">Encounter</a>
            <a href="#">Clinical Draft</a>
            <a href="#">Workflow</a>
            <a href="#">Evidence</a>
          </nav>
        </div>
        <div className="topBarRight">
          <button className="iconButton" type="button" aria-label="Notifications">◦</button>
          <button className="iconButton" type="button" aria-label="Settings">⋯</button>
          <div className="avatarDot" />
        </div>
      </header>

      <main className="clinicalWorkspace">
        <IntakeRail
          encounterType={encounterType}
          transcript={transcript}
          transcriptStats={transcriptStats}
          transcribing={transcribing}
          selectedFile={selectedFile}
          loading={loading}
          transcriptNeedsConfirmation={transcriptNeedsConfirmation}
          showTranscriptBanner={showTranscriptBanner}
          showEvidence={showEvidence}
          status={status}
          structuredDocumentType={structured.documentType}
          onEncounterChange={(next) => {
            setEncounterType(next);
            clearDraftState(next);
            setStatus("Idle");
            setReviewStatus(null);
          }}
          onTranscribeAudio={transcribeAudio}
          onAudioChange={(file) => {
            setSelectedFile(file);
            setTranscriptConfirmed(false);
            setTranscriptFromAudio(false);
          }}
          onTranscriptChange={(next) => {
            setTranscript(next);
            if (selectedFile) setTranscriptConfirmed(false);
          }}
          onConfirmTranscript={() => setTranscriptConfirmed(true)}
          onGenerate={generate}
          onResetDemo={resetDemoTranscript}
          onToggleEvidence={() => setShowEvidence((current) => !current)}
        />

        <DraftWorkspace
          structured={structured}
          encounterType={encounterType}
          status={status}
          output={output}
          hasStructuredContent={hasStructuredContent}
          patientContextText={patientContextText}
          consultantMedicationText={consultantMedicationText}
          showEvidence={showEvidence}
          reviewStatus={reviewStatus}
          auditLog={auditLog}
          editableOutput={editableOutput}
          loading={loading}
          transcriptNeedsConfirmation={transcriptNeedsConfirmation}
          onAccept={handleAccept}
          onReject={handleReject}
          onOutputChange={setOutput}
          onCopy={copyOutput}
          onGenerate={generate}
        />

        <SidecarRail structured={structured} reviewStatus={reviewStatus} onFinalize={copyOutput} onResetDemo={resetDemoTranscript} />
      </main>
    </>
  );
}

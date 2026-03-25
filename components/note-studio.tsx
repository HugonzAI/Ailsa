"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type BrowserMediaRecorder = typeof MediaRecorder;

declare global {
  interface Window {
    MediaRecorder?: BrowserMediaRecorder;
  }
}

function getSupportedMimeType() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mpeg",
  ];

  return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function getRecordedFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState(outputPlaceholder);
  const [structured, setStructured] = useState<StructuredOutput>(emptyStructuredNote);
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encounterType, setEncounterType] = useState<EncounterType>("Cardiac ward round");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [transcriptFromAudio, setTranscriptFromAudio] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showEvidence, setShowEvidence] = useState(true);
  const [editableOutput, setEditableOutput] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>("");

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop?.();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

  async function transcribeFile(file: File) {
    setSelectedFile(file);
    setTranscribing(true);
    setStatus(`Transcribing ${file.name}...`);
    try {
      const formData = new FormData();
      formData.append("audio", file);
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

  async function handleRecordToggle() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setStatus("Processing recording...");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus("Browser recording is not supported on this device");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordingMimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      });

      recorder.addEventListener("stop", async () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: recordingMimeTypeRef.current || "audio/webm",
        });
        const extension = getRecordedFileExtension(recordingMimeTypeRef.current || "audio/webm");
        const file = new File([blob], `ailsa-recording-${Date.now()}.${extension}`, {
          type: blob.type || "audio/webm",
        });

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];

        await transcribeFile(file);
      }, { once: true });

      recorder.start();
      setIsRecording(true);
      setStatus("Recording… tap again to stop");
    } catch (error) {
      console.error(error);
      setStatus("Microphone access failed");
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
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
          isRecording={isRecording}
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
          onRecordToggle={handleRecordToggle}
          onAudioChange={(file) => {
            setTranscriptConfirmed(false);
            setTranscriptFromAudio(false);
            if (file) {
              void transcribeFile(file);
              return;
            }
            setSelectedFile(null);
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

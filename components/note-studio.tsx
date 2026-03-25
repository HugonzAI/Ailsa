"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EncounterType, StructuredOutput, TranscriptSpeakerLine } from "@/lib/types";
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
import {
  deleteStoredRecording,
  getStoredRecording,
  listStoredRecordings,
  recoverInterruptedRecordings,
  saveStoredRecording,
  type StoredRecording,
} from "@/components/note-studio/recording-store";

type BrowserMediaRecorder = typeof MediaRecorder;

declare global {
  interface Window {
    MediaRecorder?: BrowserMediaRecorder;
  }
}

function getSupportedMimeType() {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  return candidates.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || "";
}

function getRecordedFileExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

function makeStoredFilename(mimeType: string) {
  return `ailsa-recording-${Date.now()}.${getRecordedFileExtension(mimeType)}`;
}

function chunkRecordingParts(parts: Blob[], maxPartsPerSegment = 20) {
  const segments: Blob[][] = [];

  for (let index = 0; index < parts.length; index += maxPartsPerSegment) {
    segments.push(parts.slice(index, index + maxPartsPerSegment));
  }

  return segments;
}

function buildGenerationTranscript(baseTranscript: string, speakerLines: TranscriptSpeakerLine[]) {
  if (!speakerLines.length) return baseTranscript;

  const grouped = {
    patient: speakerLines.filter((line) => line.speaker === "Patient"),
    clinician: speakerLines.filter((line) => line.speaker === "Doctor"),
    nursing: speakerLines.filter((line) => line.speaker === "Nurse"),
    family: speakerLines.filter((line) => line.speaker === "Family"),
    unknown: speakerLines.filter((line) => line.speaker === "Unknown" || line.speaker.startsWith("Speaker ")),
  };

  const sections = [
    "[Full speaker-aware transcript]",
    ...speakerLines.map((line) => `${line.speaker}: ${line.text}`),
  ];

  if (grouped.patient.length) {
    sections.push("", "[Patient-reported content]", ...grouped.patient.map((line) => line.text));
  }

  if (grouped.clinician.length) {
    sections.push("", "[Clinician-stated assessment/plan/questions]", ...grouped.clinician.map((line) => line.text));
  }

  if (grouped.nursing.length) {
    sections.push("", "[Nursing observations / handover]", ...grouped.nursing.map((line) => line.text));
  }

  if (grouped.family.length) {
    sections.push("", "[Family / collateral history]", ...grouped.family.map((line) => line.text));
  }

  if (grouped.unknown.length) {
    sections.push("", "[Uncertain speaker content]", ...grouped.unknown.map((line) => `${line.speaker}: ${line.text}`));
  }

  sections.push("", "[Fallback raw transcript]", baseTranscript);

  return sections.join("\n").trim();
}

async function transcribeAudioSegment(file: File, language: string) {
  const formData = new FormData();
  formData.append("audio", file);
  formData.append("language", language);
  const response = await fetch("/api/transcribe", { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Transcription failed with status ${response.status}`);
  return (await response.json()) as { transcript: string; speakerLines?: TranscriptSpeakerLine[]; mode: string; filename?: string };
}

export function NoteStudio() {
  const [transcript, setTranscript] = useState(demoTranscript);
  const [output, setOutput] = useState(outputPlaceholder);
  const [structured, setStructured] = useState<StructuredOutput>(emptyStructuredNote);
  const [status, setStatus] = useState("Idle");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("en");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encounterType, setEncounterType] = useState<EncounterType>("Cardiac ward round");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [transcriptFromAudio, setTranscriptFromAudio] = useState(false);
  const [speakerLines, setSpeakerLines] = useState<TranscriptSpeakerLine[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showEvidence, setShowEvidence] = useState(true);
  const [editableOutput, setEditableOutput] = useState(false);
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>("");
  const activeRecordingIdRef = useRef<string | null>(null);

  useEffect(() => {
    void (async () => {
      const recoveredCount = await recoverInterruptedRecordings();
      await refreshRecordings();
      if (recoveredCount > 0) {
        setStatus(
          recoveredCount === 1
            ? "Recovered 1 interrupted recording — ready to transcribe"
            : `Recovered ${recoveredCount} interrupted recordings — ready to transcribe`,
        );
      }
    })();

    return () => {
      mediaRecorderRef.current?.stop?.();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    const interval = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording]);

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

  async function refreshRecordings() {
    try {
      const next = await listStoredRecordings();
      setRecordings(next);
    } catch (error) {
      console.error(error);
    }
  }

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
        body: JSON.stringify({ transcript: buildGenerationTranscript(transcript, speakerLines), encounterType }),
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

  async function transcribeStoredRecording(recordingId: string) {
    const stored = await getStoredRecording(recordingId);
    if (!stored || stored.chunks.length === 0) {
      setStatus("No saved audio found for this recording");
      return;
    }

    const audioBlob = new Blob(stored.chunks, { type: stored.mimeType || "audio/webm" });
    const fullFile = new File([audioBlob], stored.filename, { type: audioBlob.type || stored.mimeType || "audio/webm" });
    const segments = chunkRecordingParts(stored.chunks, 20);

    setCurrentRecordingId(recordingId);
    setSelectedFile(fullFile);
    setTranscribing(true);
    setStatus(`Transcribing ${stored.filename}...`);

    await saveStoredRecording({
      ...stored,
      status: "transcribing",
      updatedAt: new Date().toISOString(),
      error: undefined,
    });
    await refreshRecordings();

    try {
      let transcriptParts: string[] = [];
      let aggregatedSpeakerLines: TranscriptSpeakerLine[] = [];
      let mode = "provider";

      for (let index = 0; index < segments.length; index += 1) {
        const segmentChunks = segments[index];
        const segmentBlob = new Blob(segmentChunks, { type: stored.mimeType || "audio/webm" });
        const segmentFile = new File(
          [segmentBlob],
          segments.length === 1
            ? stored.filename
            : stored.filename.replace(/\.(\w+)$/, `-part-${index + 1}.$1`),
          { type: segmentBlob.type || stored.mimeType || "audio/webm" },
        );

        setStatus(
          segments.length === 1
            ? `Transcribing ${stored.filename}...`
            : `Transcribing segment ${index + 1} of ${segments.length}...`,
        );

        const data = await transcribeAudioSegment(segmentFile, transcriptionLanguage);
        mode = data.mode;
        const cleaned = data.transcript.trim();
        if (cleaned) transcriptParts.push(cleaned);
        if (data.speakerLines?.length) aggregatedSpeakerLines.push(...data.speakerLines);

        const partialTranscript = transcriptParts.join("\n\n").trim();
        await saveStoredRecording({
          ...stored,
          status: "transcribing",
          transcript: partialTranscript,
          speakerLines: aggregatedSpeakerLines,
          updatedAt: new Date().toISOString(),
          error: undefined,
        });
        await refreshRecordings();
      }

      const combinedTranscript = transcriptParts.join("\n\n").trim();
      const normalizedSpeakerLines = aggregatedSpeakerLines.map((line) => ({ ...line, reviewed: line.reviewed ?? false }));
      setTranscript(combinedTranscript);
      setSpeakerLines(normalizedSpeakerLines);
      setTranscriptConfirmed(false);
      setTranscriptFromAudio(true);
      setStatus(`Transcript ready · ${mode} mode${segments.length > 1 ? ` · ${segments.length} segments` : ""}`);

      await saveStoredRecording({
        ...stored,
        status: "transcribed",
        interrupted: false,
        transcript: combinedTranscript,
        speakerLines: normalizedSpeakerLines,
        updatedAt: new Date().toISOString(),
        error: undefined,
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Transcription failed";
      setStatus("Failed to transcribe audio");
      await saveStoredRecording({
        ...stored,
        status: "failed",
        interrupted: false,
        updatedAt: new Date().toISOString(),
        error: message,
      });
    } finally {
      setTranscribing(false);
      await refreshRecordings();
    }
  }

  async function persistRecordingSnapshot(id: string, statusValue: StoredRecording["status"], chunks: Blob[], extra?: Partial<StoredRecording>) {
    const existing = await getStoredRecording(id);
    const now = new Date().toISOString();
    const fallbackMimeType = recordingMimeTypeRef.current || "audio/webm";

    const next: StoredRecording = {
      id,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      encounterType,
      filename: existing?.filename || makeStoredFilename(fallbackMimeType),
      mimeType: existing?.mimeType || fallbackMimeType,
      status: statusValue,
      interrupted: statusValue === "recording" ? existing?.interrupted : false,
      chunks,
      transcript: existing?.transcript,
      error: existing?.error,
      ...extra,
    };

    await saveStoredRecording(next);
    await refreshRecordings();
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
      const recordingId = crypto.randomUUID();
      const filename = makeStoredFilename(recorder.mimeType || mimeType || "audio/webm");

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = [];
      recordingMimeTypeRef.current = recorder.mimeType || mimeType || "audio/webm";
      activeRecordingIdRef.current = recordingId;

      await saveStoredRecording({
        id: recordingId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        encounterType,
        filename,
        mimeType: recordingMimeTypeRef.current,
        status: "recording",
        interrupted: false,
        chunks: [],
      });
      await refreshRecordings();

      recorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          if (activeRecordingIdRef.current) {
            await persistRecordingSnapshot(activeRecordingIdRef.current, "recording", [...recordedChunksRef.current], {
              filename,
              mimeType: recordingMimeTypeRef.current,
            });
          }
        }
      });

      recorder.addEventListener("stop", async () => {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        const completedRecordingId = activeRecordingIdRef.current;
        activeRecordingIdRef.current = null;

        if (completedRecordingId) {
          await persistRecordingSnapshot(completedRecordingId, "saved", [...recordedChunksRef.current], {
            filename,
            mimeType: recordingMimeTypeRef.current,
          });
          await transcribeStoredRecording(completedRecordingId);
        }

        recordedChunksRef.current = [];
      }, { once: true });

      recorder.start(2000);
      setRecordingSeconds(0);
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

    setSpeakerLines([]);
    setCurrentRecordingId(null);
    setSelectedFile(null);
    setTranscriptConfirmed(false);
    setTranscriptFromAudio(false);
  }

  function persistSpeakerLineEdits(next: TranscriptSpeakerLine[]) {
    if (!currentRecordingId) return;

    const existing = recordings.find((recording) => recording.id === currentRecordingId);
    if (!existing) return;

    const nextTranscript = next.map((line) => `${line.speaker}: ${line.text}`).join("\n");

    void saveStoredRecording({
      ...existing,
      transcript: nextTranscript,
      speakerLines: next,
      updatedAt: new Date().toISOString(),
    }).then(refreshRecordings);
  }

  function handleSpeakerLineChange(index: number, speaker: TranscriptSpeakerLine["speaker"]) {
    setSpeakerLines((current) => {
      const next = current.map((line, lineIndex) => (lineIndex === index ? { ...line, speaker, reviewed: false } : line));
      persistSpeakerLineEdits(next);
      setTranscript(next.map((item) => `${item.speaker}: ${item.text}`).join("\n"));
      return next;
    });
    setTranscriptFromAudio(true);
    setTranscriptConfirmed(false);
    setStatus("Speaker labels updated — review transcript before generating");
  }

  function handleSpeakerLineTextChange(index: number, text: string) {
    setSpeakerLines((current) => {
      const next = current.map((line, lineIndex) => (lineIndex === index ? { ...line, text, reviewed: false } : line));
      persistSpeakerLineEdits(next);
      setTranscript(next.map((item) => `${item.speaker}: ${item.text}`).join("\n"));
      return next;
    });
    setTranscriptFromAudio(true);
    setTranscriptConfirmed(false);
    setStatus("Transcript line edited — review before generating");
  }

  function handleSpeakerLineReviewToggle(index: number) {
    setSpeakerLines((current) => {
      const next = current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, reviewed: !line.reviewed } : line,
      );
      persistSpeakerLineEdits(next);
      return next;
    });
    setStatus("Transcript line review status updated");
  }

  function handleTightenOutput() {
    if (!output || output === outputPlaceholder) {
      setStatus("Nothing to tighten yet");
      return;
    }

    const tidyLines = (text: string) =>
      text
        .replace(/\n{3,}/g, "\n\n")
        .split("\n")
        .map((line) => line.replace(/\s{2,}/g, " ").replace(/[.;:,\s]+$/g, "").trim())
        .filter((line, index, all) => line && all.findIndex((candidate) => candidate.toLowerCase() === line.toLowerCase()) === index)
        .join("\n");

    let tightened = output;
    let nextStatus = "Draft refined";

    if (structured.documentType === "cardiology_consultant_letter") {
      tightened = tidyLines(
        output
          .replace(/\bI had the pleasure of seeing this patient today\.?\s*/gi, "Seen today for cardiology review.\n")
          .replace(/\bThey are a pleasant individual that was referred for cardiac assessment\.?\s*/gi, "")
          .replace(/\bThank you for the privilege of allowing me to participate in this patient's care\.?\s*/gi, "")
          .replace(/\bFeel free to reach out directly if any questions or concerns\.?\s*/gi, "")
          .replace(/\bReview of systems is otherwise non-contributory\.?\s*/gi, "")
          .replace(/\bNone known\b/gi, "None known")
      );
      nextStatus = "Consultant letter refined for specialist tone";
    } else if (structured.documentType === "cardiac_discharge_summary") {
      tightened = tidyLines(
        output
          .replace(/\bOver the admission\b/gi, "During admission")
          .replace(/\bPlan on discharge is to\b/gi, "Discharge plan:")
          .replace(/\bAdvise return for\b/gi, "Return if")
      );
      nextStatus = "Discharge summary tightened";
    } else {
      tightened = tidyLines(
        output
          .replace(/\bOverall\b[:,]?\s*/g, "")
          .replace(/\bThis (looks|appears) like\b/gi, "")
          .replace(/\bresponding to diuresis with\b/gi, "improving with diuresis and")
          .replace(/\bin the setting of\b/gi, "with")
          .replace(/\bwith improvement in\b/gi, "improved")
      );
      nextStatus = "Draft tightened for ward-note style";
    }

    setOutput(tightened);
    setStatus(nextStatus);
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
          transcriptionLanguage={transcriptionLanguage}
          transcribing={transcribing}
          isRecording={isRecording}
          recordingSeconds={recordingSeconds}
          selectedFile={selectedFile}
          loading={loading}
          transcriptNeedsConfirmation={transcriptNeedsConfirmation}
          showTranscriptBanner={showTranscriptBanner}
          showEvidence={showEvidence}
          status={status}
          structuredDocumentType={structured.documentType}
          recordings={recordings}
          speakerLines={speakerLines}
          onEncounterChange={(next) => {
            setEncounterType(next);
            clearDraftState(next);
            setStatus("Idle");
            setReviewStatus(null);
          }}
          onLanguageChange={setTranscriptionLanguage}
          onRecordToggle={handleRecordToggle}
          onAudioChange={(file) => {
            setTranscriptConfirmed(false);
            setTranscriptFromAudio(false);
            if (file) {
              const uploaded: StoredRecording = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                encounterType,
                filename: file.name,
                mimeType: file.type || "audio/webm",
                status: "saved",
                interrupted: false,
                chunks: [file],
              };
              void saveStoredRecording(uploaded).then(refreshRecordings).then(() => transcribeStoredRecording(uploaded.id));
              return;
            }
            setCurrentRecordingId(null);
            setSelectedFile(null);
          }}
          onTranscriptChange={(next) => {
            setTranscript(next);
            setSpeakerLines([]);
            if (selectedFile) setTranscriptConfirmed(false);
          }}
          onConfirmTranscript={() => {
            setTranscriptConfirmed(true);
            setStatus("Transcript marked as clinician-reviewed");
          }}
          onResetTranscriptReview={() => {
            setTranscriptConfirmed(false);
            setStatus("Transcript review reset");
          }}
          onGenerate={generate}
          onResetDemo={resetDemoTranscript}
          onToggleEvidence={() => setShowEvidence((current) => !current)}
          onRetryRecording={(id) => {
            void transcribeStoredRecording(id);
          }}
          onLoadRecordingTranscript={(id) => {
            const found = recordings.find((item) => item.id === id);
            if (!found?.transcript) return;
            setCurrentRecordingId(id);
            setTranscript(found.transcript);
            setSpeakerLines((found.speakerLines || []).map((line) => ({ ...line, reviewed: line.reviewed ?? false })));
            setTranscriptConfirmed(false);
            setTranscriptFromAudio(true);
            setStatus(`Loaded saved transcript · ${found.filename}`);
          }}
          onDeleteRecording={(id) => {
            if (currentRecordingId === id) {
              setCurrentRecordingId(null);
              setSpeakerLines([]);
            }
            void deleteStoredRecording(id).then(refreshRecordings);
          }}
          onSpeakerLineChange={handleSpeakerLineChange}
          onSpeakerLineTextChange={handleSpeakerLineTextChange}
          onSpeakerLineReviewToggle={handleSpeakerLineReviewToggle}
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
          onTighten={handleTightenOutput}
        />

        <SidecarRail structured={structured} reviewStatus={reviewStatus} onFinalize={copyOutput} onResetDemo={resetDemoTranscript} />
      </main>
    </>
  );
}

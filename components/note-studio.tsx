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
  type StoredTranscriptionSegment,
} from "@/components/note-studio/recording-store";
import {
  buildSmartSessionName,
  createDefaultSession,
  mergeWorkspaceSessions,
  WORKSPACE_SESSIONS_KEY,
  type WorkspaceSession,
  type WorkspaceSessionStore,
} from "@/lib/workspace-session";

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

const MAX_UPLOAD_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_SEGMENT_AUDIO_BYTES = 12 * 1024 * 1024;
const MAX_PARTS_PER_SEGMENT = 30;
const MEDIA_RECORDER_TIMESLICE_MS = 4000;

function chunkRecordingParts(parts: Blob[]) {
  if (!parts.length) return [];

  const segments: Blob[][] = [];
  let currentSegment: Blob[] = [];
  let currentBytes = 0;

  for (const part of parts) {
    const wouldExceedBytes = currentSegment.length > 0 && currentBytes + part.size > MAX_SEGMENT_AUDIO_BYTES;
    const wouldExceedPartCount = currentSegment.length >= MAX_PARTS_PER_SEGMENT;

    if (wouldExceedBytes || wouldExceedPartCount) {
      segments.push(currentSegment);
      currentSegment = [];
      currentBytes = 0;
    }

    currentSegment.push(part);
    currentBytes += part.size;
  }

  if (currentSegment.length) {
    segments.push(currentSegment);
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
  const [transcribeProgress, setTranscribeProgress] = useState<{ current: number; total: number; failed?: boolean } | null>(null);
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("en");
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [encounterType, setEncounterType] = useState<EncounterType>("Ward round");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [transcriptFromAudio, setTranscriptFromAudio] = useState(false);
  const [speakerLines, setSpeakerLines] = useState<TranscriptSpeakerLine[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [showEvidence, setShowEvidence] = useState(true);
  const [editableOutput, setEditableOutput] = useState(false);
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const [workspaceSessions, setWorkspaceSessions] = useState<WorkspaceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false);
  const [sessionNameDraft, setSessionNameDraft] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingMimeTypeRef = useRef<string>("");
  const activeRecordingIdRef = useRef<string | null>(null);
  const sessionsHydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_SESSIONS_KEY);
      const parsed = raw ? (JSON.parse(raw) as WorkspaceSessionStore) : null;
      const sessions = parsed?.sessions?.length ? parsed.sessions : [createDefaultSession(crypto.randomUUID())];
      const selected = sessions.find((session) => session.id === parsed?.currentSessionId) || sessions[0];
      setWorkspaceSessions(sessions);
      setCurrentSessionId(selected.id);
      applySession(selected);
    } catch (error) {
      console.error(error);
      const fallback = createDefaultSession(crypto.randomUUID());
      setWorkspaceSessions([fallback]);
      setCurrentSessionId(fallback.id);
      applySession(fallback);
    } finally {
      sessionsHydratedRef.current = true;
    }

    void (async () => {
      try {
        const cloudSessions = await fetchCloudSessions();
        if (cloudSessions.length) {
          setWorkspaceSessions((current) => {
            const merged = mergeWorkspaceSessions(current, cloudSessions);
            const currentOrLatest = merged.find((session) => session.id === currentSessionId) || merged[0];
            if (currentOrLatest) {
              setCurrentSessionId(currentOrLatest.id);
              applySession(currentOrLatest);
            }
            window.localStorage.setItem(
              WORKSPACE_SESSIONS_KEY,
              JSON.stringify({ currentSessionId: currentOrLatest?.id || "", sessions: merged } satisfies WorkspaceSessionStore),
            );
            return merged;
          });
        }
      } catch (error) {
        console.error("Cloud session hydration failed", error);
      }

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
    if (!sessionsHydratedRef.current || !currentSessionId) return;

    const snapshot = buildSessionSnapshot(currentSessionId);
    const nextSessions = workspaceSessions.some((session) => session.id === currentSessionId)
      ? workspaceSessions.map((session) => (session.id === currentSessionId ? snapshot : session))
      : [...workspaceSessions, snapshot];

    setWorkspaceSessions(nextSessions);
    window.localStorage.setItem(
      WORKSPACE_SESSIONS_KEY,
      JSON.stringify({ currentSessionId, sessions: nextSessions } satisfies WorkspaceSessionStore),
    );
  }, [
    currentSessionId,
    encounterType,
    transcriptionLanguage,
    transcript,
    output,
    structured,
    transcriptConfirmed,
    transcriptFromAudio,
    speakerLines,
    reviewStatus,
    auditLog,
    showEvidence,
    editableOutput,
    status,
  ]);

  useEffect(() => {
    if (!sessionsHydratedRef.current || !currentSessionId) return;

    const snapshot = buildSessionSnapshot(currentSessionId);
    const timeout = window.setTimeout(() => {
      void saveCloudSession(snapshot).catch((error) => {
        console.error("Cloud session save failed", error);
      });
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [
    currentSessionId,
    encounterType,
    transcriptionLanguage,
    transcript,
    output,
    structured,
    transcriptConfirmed,
    transcriptFromAudio,
    speakerLines,
    reviewStatus,
    auditLog,
    showEvidence,
    editableOutput,
    status,
  ]);

  const currentSessionName = useMemo(
    () => workspaceSessions.find((session) => session.id === currentSessionId)?.name || "Current consultation",
    [workspaceSessions, currentSessionId],
  );

  useEffect(() => {
    setSessionNameDraft(currentSessionName);
  }, [currentSessionName]);

  useEffect(() => {
    if (!isRecording) {
      setRecordingSeconds(0);
      return;
    }

    if (isRecordingPaused) {
      return;
    }

    const interval = window.setInterval(() => {
      setRecordingSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRecording, isRecordingPaused]);

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

  const currentSessionRecordings = useMemo(
    () => recordings.filter((recording) => recording.sessionId === currentSessionId),
    [recordings, currentSessionId],
  );

  const currentConversationRecording = useMemo(
    () => [...currentSessionRecordings].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] || null,
    [currentSessionRecordings],
  );

  const currentPlaybackUrl = useMemo(() => {
    if (!currentConversationRecording?.chunks?.length) return null;
    return URL.createObjectURL(new Blob(currentConversationRecording.chunks, { type: currentConversationRecording.mimeType || "audio/webm" }));
  }, [currentConversationRecording]);

  useEffect(() => {
    return () => {
      if (currentPlaybackUrl) URL.revokeObjectURL(currentPlaybackUrl);
    };
  }, [currentPlaybackUrl]);

  const hasStructuredContent = output !== outputPlaceholder;
  const transcriptNeedsConfirmation = Boolean(selectedFile && !transcriptConfirmed);
  const showTranscriptBanner = Boolean(transcriptFromAudio && selectedFile && !transcriptConfirmed);

  function applySession(session: WorkspaceSession) {
    setEncounterType(session.encounterType);
    setTranscriptionLanguage(session.transcriptionLanguage);
    setTranscript(session.transcript);
    setOutput(session.output);
    setStructured(session.structured);
    setTranscriptConfirmed(session.transcriptConfirmed);
    setTranscriptFromAudio(session.transcriptFromAudio);
    setSpeakerLines(session.speakerLines);
    setReviewStatus(session.reviewStatus);
    setAuditLog(session.auditLog);
    setShowEvidence(session.showEvidence);
    setEditableOutput(session.editableOutput);
    setStatus(session.status);
    setSelectedFile(null);
    setCurrentRecordingId(null);
  }

  function buildSessionSnapshot(sessionId: string, fallbackName?: string): WorkspaceSession {
    const existing = workspaceSessions.find((session) => session.id === sessionId);
    return {
      id: sessionId,
      name: existing?.name || fallbackName || `Session ${workspaceSessions.length + 1}`,
      updatedAt: new Date().toISOString(),
      encounterType,
      transcriptionLanguage,
      transcript,
      output,
      structured,
      transcriptConfirmed,
      transcriptFromAudio,
      speakerLines,
      reviewStatus,
      auditLog,
      showEvidence,
      editableOutput,
      status,
    };
  }

  async function fetchCloudSessions() {
    const response = await fetch("/api/sessions", { cache: "no-store" });
    if (!response.ok) throw new Error(`Session fetch failed with status ${response.status}`);
    const data = (await response.json()) as { sessions: WorkspaceSession[] };
    return data.sessions || [];
  }

  async function saveCloudSession(session: WorkspaceSession) {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });

    if (!response.ok) throw new Error(`Session save failed with status ${response.status}`);
  }

  async function deleteCloudSession(sessionId: string) {
    const response = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error(`Session delete failed with status ${response.status}`);
  }

  function createWorkspaceSession() {
    const next = createDefaultSession(crypto.randomUUID(), {
      name: buildSmartSessionName(encounterType, transcript),
    });
    const nextSessions = [next, ...workspaceSessions];
    setWorkspaceSessions(nextSessions);
    setCurrentSessionId(next.id);
    applySession(next);
    setStatus(`Started ${next.name}`);
    window.localStorage.setItem(
      WORKSPACE_SESSIONS_KEY,
      JSON.stringify({ currentSessionId: next.id, sessions: nextSessions } satisfies WorkspaceSessionStore),
    );
  }

  function selectWorkspaceSession(sessionId: string) {
    const target = workspaceSessions.find((session) => session.id === sessionId);
    if (!target) return;

    if (currentSessionId) {
      const currentSnapshot = buildSessionSnapshot(currentSessionId);
      const updatedSessions = workspaceSessions.map((session) => (session.id === currentSessionId ? currentSnapshot : session));
      setWorkspaceSessions(updatedSessions);
      const refreshedTarget = updatedSessions.find((session) => session.id === sessionId) || target;
      setCurrentSessionId(sessionId);
      applySession(refreshedTarget);
      setStatus(`Loaded ${refreshedTarget.name}`);
      window.localStorage.setItem(
        WORKSPACE_SESSIONS_KEY,
        JSON.stringify({ currentSessionId: sessionId, sessions: updatedSessions } satisfies WorkspaceSessionStore),
      );
      return;
    }

    setCurrentSessionId(sessionId);
    applySession(target);
  }

  function renameWorkspaceSession(name: string) {
    const trimmed = name.trim();
    if (!currentSessionId || !trimmed) return;

    setWorkspaceSessions((current) =>
      current.map((session) =>
        session.id === currentSessionId ? { ...session, name: trimmed, updatedAt: new Date().toISOString() } : session,
      ),
    );
    setStatus(`Renamed session to ${trimmed}`);
  }

  function autoRenameCurrentSessionIfGeneric(nextTranscript?: string, nextEncounterType?: EncounterType) {
    const current = workspaceSessions.find((session) => session.id === currentSessionId);
    if (!current) return;

    const isGeneric = /^Session\s+\d+$/i.test(current.name) || /^(Ward round|Admission|Discharge|Handover|Chest pain|HF review|AF review|Syncope review|Consultant letter) · \d{2}/.test(current.name);
    if (!isGeneric) return;

    const nextName = buildSmartSessionName(nextEncounterType || encounterType, nextTranscript || transcript);
    setWorkspaceSessions((sessions) =>
      sessions.map((session) =>
        session.id === currentSessionId ? { ...session, name: nextName, updatedAt: new Date().toISOString() } : session,
      ),
    );
  }

  function archiveCurrentSession() {
    const current = workspaceSessions.find((session) => session.id === currentSessionId);
    if (!current) return;

    const archived = { ...current, archived: true, updatedAt: new Date().toISOString() };
    const nextSessions = workspaceSessions.map((session) => (session.id === currentSessionId ? archived : session));
    const nextActive = nextSessions.find((session) => !session.archived && session.id !== currentSessionId) || createDefaultSession(crypto.randomUUID(), {
      name: buildSmartSessionName(encounterType, transcript),
    });
    const normalizedSessions = nextSessions.some((session) => session.id === nextActive.id) ? nextSessions : [nextActive, ...nextSessions];

    setWorkspaceSessions(normalizedSessions);
    setCurrentSessionId(nextActive.id);
    applySession(nextActive);
    setStatus(`Archived ${current.name}`);
    void saveCloudSession(archived).catch((error) => console.error("Archive sync failed", error));
  }

  function deleteCurrentSession() {
    const current = workspaceSessions.find((session) => session.id === currentSessionId);
    if (!current) return;

    const remaining = workspaceSessions.filter((session) => session.id !== currentSessionId);
    const nextActive = remaining.find((session) => !session.archived) || createDefaultSession(crypto.randomUUID(), {
      name: buildSmartSessionName(encounterType, transcript),
    });
    const normalizedSessions = remaining.length ? remaining : [nextActive];

    setWorkspaceSessions(normalizedSessions);
    setCurrentSessionId(nextActive.id);
    applySession(nextActive);
    setStatus(`Deleted ${current.name}`);
    void deleteCloudSession(current.id).catch((error) => console.error("Delete sync failed", error));
  }

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
      autoRenameCurrentSessionIfGeneric(transcript, encounterType);
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
    const segments = chunkRecordingParts(stored.chunks);

    setCurrentRecordingId(recordingId);
    setSelectedFile(fullFile);
    setTranscribing(true);
    setTranscribeProgress(null);
    setStatus(`Transcribing ${stored.filename}...`);

    const canResumeFailedRun =
      stored.status === "failed" &&
      stored.transcriptionProgress?.failedSegment &&
      stored.transcriptionProgress.totalSegments === segments.length &&
      Array.isArray(stored.transcriptionSegments) &&
      stored.transcriptionSegments.length >= (stored.transcriptionProgress.completedSegments || 0);

    const initialSegmentResults: StoredTranscriptionSegment[] = canResumeFailedRun
      ? [...(stored.transcriptionSegments || [])].sort((left, right) => left.segmentIndex - right.segmentIndex)
      : [];
    const resumeFromIndex = canResumeFailedRun ? stored.transcriptionProgress!.completedSegments : 0;
    const initialTranscriptParts = initialSegmentResults.map((segment) => segment.transcript.trim()).filter(Boolean);
    const initialSpeakerLines = initialSegmentResults.flatMap((segment) => segment.speakerLines || []);

    await saveStoredRecording({
      ...stored,
      status: "transcribing",
      transcript: initialTranscriptParts.join("\n\n").trim() || stored.transcript,
      speakerLines: initialSpeakerLines.length ? initialSpeakerLines : stored.speakerLines,
      transcriptionSegments: initialSegmentResults,
      transcriptionProgress: { completedSegments: resumeFromIndex, totalSegments: segments.length },
      updatedAt: new Date().toISOString(),
      error: undefined,
    });
    await refreshRecordings();

    let activeSegmentIndex = 0;
    let transcriptParts: string[] = [...initialTranscriptParts];
    let aggregatedSpeakerLines: TranscriptSpeakerLine[] = [...initialSpeakerLines];
    let segmentResults: StoredTranscriptionSegment[] = [...initialSegmentResults];

    try {
      let mode = "provider";

      for (let index = resumeFromIndex; index < segments.length; index += 1) {
        activeSegmentIndex = index + 1;
        const segmentChunks = segments[index];
        const segmentBlob = new Blob(segmentChunks, { type: stored.mimeType || "audio/webm" });
        const segmentFile = new File(
          [segmentBlob],
          segments.length === 1
            ? stored.filename
            : stored.filename.replace(/\.(\w+)$/, `-part-${index + 1}.$1`),
          { type: segmentBlob.type || stored.mimeType || "audio/webm" },
        );

        setTranscribeProgress({ current: index + 1, total: segments.length });
        setStatus(
          segments.length === 1
            ? `Transcribing ${stored.filename}...`
            : `Transcribing segment ${index + 1} of ${segments.length}...`,
        );

        const data = await transcribeAudioSegment(segmentFile, transcriptionLanguage);
        mode = data.mode;
        const cleaned = data.transcript.trim();
        const normalizedSegmentLines = (data.speakerLines || []).map((line) => ({ ...line, reviewed: line.reviewed ?? false }));

        segmentResults = [
          ...segmentResults.filter((segment) => segment.segmentIndex !== index),
          { segmentIndex: index, transcript: cleaned, speakerLines: normalizedSegmentLines },
        ].sort((left, right) => left.segmentIndex - right.segmentIndex);

        transcriptParts = segmentResults.map((segment) => segment.transcript.trim()).filter(Boolean);
        aggregatedSpeakerLines = segmentResults.flatMap((segment) => segment.speakerLines || []);

        const partialTranscript = transcriptParts.join("\n\n").trim();
        await saveStoredRecording({
          ...stored,
          status: "transcribing",
          transcript: partialTranscript,
          speakerLines: aggregatedSpeakerLines,
          transcriptionSegments: segmentResults,
          transcriptionProgress: { completedSegments: index + 1, totalSegments: segments.length },
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
      setTranscribeProgress(null);
      setStatus(`Transcript ready · ${mode} mode${segments.length > 1 ? ` · ${segments.length} segments` : ""}`);

      await saveStoredRecording({
        ...stored,
        status: "transcribed",
        interrupted: false,
        transcript: combinedTranscript,
        speakerLines: normalizedSpeakerLines,
        transcriptionSegments: segmentResults,
        transcriptionProgress: { completedSegments: segments.length, totalSegments: segments.length },
        updatedAt: new Date().toISOString(),
        error: undefined,
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Transcription failed";
      const failedSegment = activeSegmentIndex > 0 ? activeSegmentIndex : 1;
      const hasMultipleSegments = segments.length > 1;
      setTranscribeProgress(hasMultipleSegments ? { current: failedSegment, total: segments.length, failed: true } : null);
      setStatus(hasMultipleSegments ? `Failed to transcribe segment ${failedSegment} of ${segments.length}` : "Failed to transcribe audio");
      await saveStoredRecording({
        ...stored,
        status: "failed",
        interrupted: false,
        transcript: transcriptParts.join("\n\n").trim() || stored.transcript,
        speakerLines: aggregatedSpeakerLines.length ? aggregatedSpeakerLines : stored.speakerLines,
        transcriptionSegments: segmentResults,
        transcriptionProgress: hasMultipleSegments
          ? { completedSegments: Math.max(0, failedSegment - 1), totalSegments: segments.length, failedSegment }
          : { completedSegments: 0, totalSegments: 1, failedSegment: 1 },
        updatedAt: new Date().toISOString(),
        error: hasMultipleSegments ? `Segment ${failedSegment}/${segments.length}: ${message}` : message,
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
      sessionId: existing?.sessionId || currentSessionId,
      encounterType,
      filename: existing?.filename || makeStoredFilename(fallbackMimeType),
      mimeType: existing?.mimeType || fallbackMimeType,
      status: statusValue,
      interrupted: statusValue === "recording" ? existing?.interrupted : false,
      chunks,
      transcript: existing?.transcript,
      transcriptionSegments: existing?.transcriptionSegments,
      transcriptionProgress: existing?.transcriptionProgress,
      error: existing?.error,
      ...extra,
    };

    await saveStoredRecording(next);
    await refreshRecordings();
  }

  async function handlePauseResumeRecording() {
    if (!mediaRecorderRef.current) return;

    if (isRecordingPaused) {
      mediaRecorderRef.current.resume();
      setIsRecordingPaused(false);
      setStatus("Recording resumed");
      if (activeRecordingIdRef.current) {
        await persistRecordingSnapshot(activeRecordingIdRef.current, "recording", [...recordedChunksRef.current], {
          mimeType: recordingMimeTypeRef.current,
        });
      }
      return;
    }

    mediaRecorderRef.current.pause();
    setIsRecordingPaused(true);
    setStatus("Recording paused");
    if (activeRecordingIdRef.current) {
      await persistRecordingSnapshot(activeRecordingIdRef.current, "paused", [...recordedChunksRef.current], {
        mimeType: recordingMimeTypeRef.current,
      });
    }
  }

  async function handleRecordToggle() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      setIsRecordingPaused(false);
      setStatus("Processing conversation recording...");
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
      const existingConversation = currentConversationRecording;
      const recordingId = existingConversation?.id || crypto.randomUUID();
      const filename = existingConversation?.filename || makeStoredFilename(recorder.mimeType || mimeType || "audio/webm");

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedChunksRef.current = existingConversation?.chunks ? [...existingConversation.chunks] : [];
      recordingMimeTypeRef.current = recorder.mimeType || mimeType || existingConversation?.mimeType || "audio/webm";
      activeRecordingIdRef.current = recordingId;
      setCurrentRecordingId(recordingId);

      await saveStoredRecording({
        id: recordingId,
        createdAt: existingConversation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sessionId: currentSessionId,
        encounterType,
        filename,
        mimeType: recordingMimeTypeRef.current,
        status: "recording",
        interrupted: false,
        chunks: recordedChunksRef.current,
        transcript: existingConversation?.transcript,
        speakerLines: existingConversation?.speakerLines,
        error: undefined,
      });
      await refreshRecordings();

      recorder.addEventListener("dataavailable", async (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          if (activeRecordingIdRef.current) {
            await persistRecordingSnapshot(activeRecordingIdRef.current, recorder.state === "paused" ? "paused" : "recording", [...recordedChunksRef.current], {
              filename,
              mimeType: recordingMimeTypeRef.current,
              sessionId: currentSessionId,
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
            sessionId: currentSessionId,
          });
          await transcribeStoredRecording(completedRecordingId);
        }
      }, { once: true });

      recorder.start(MEDIA_RECORDER_TIMESLICE_MS);
      setIsRecording(true);
      setIsRecordingPaused(false);
      if (!existingConversation?.chunks?.length) {
        setRecordingSeconds(0);
      }
      setStatus(existingConversation?.chunks?.length ? "Recording resumed for this patient conversation" : "Recording… tap stop to finish, or pause to hold");
    } catch (error) {
      console.error(error);
      setStatus("Microphone access failed");
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setIsRecordingPaused(false);
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
    else if (encounterType === "Discharge") setTranscript(dischargeDemoTranscript);
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
      const next = current.map((line, lineIndex) => (
        lineIndex === index
          ? { ...line, text, reviewed: false, suspicious: false, suspiciousReason: undefined }
          : line
      ));
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
          <div className="brandLockup">
            <span className="brand">AILSA</span>
            <span className="brandSubtitle">{currentSessionName}</span>
          </div>
          <nav className="topNav">
            <a href="#">Encounter</a>
            <a href="#">Clinical Draft</a>
            <a href="#">Workflow</a>
            <a href="#">Evidence</a>
          </nav>
        </div>
        <div className="topBarRight">
          <button className="iconButton" type="button" aria-label="Session management" onClick={() => setSessionManagerOpen((current) => !current)}>⋯</button>
        </div>
      </header>

      {sessionManagerOpen ? (
        <div className="sessionManagerOverlay" onClick={() => setSessionManagerOpen(false)}>
          <aside className="sessionManagerPanel" onClick={(event) => event.stopPropagation()}>
            <div className="sessionManagerHeader">
              <div>
                <h3>Consultation workspace</h3>
                <p>Manage saved consultations separately from the main recording flow.</p>
              </div>
              <button className="iconButton" type="button" onClick={() => setSessionManagerOpen(false)}>✕</button>
            </div>
            <button className="newEncounterButton" type="button" onClick={createWorkspaceSession}>New Session</button>
            <div className="fieldGroup">
              <label className="microLabel" htmlFor="workspaceSessionManager">Current Session</label>
              <select
                id="workspaceSessionManager"
                className="stitchSelect"
                value={currentSessionId}
                onChange={(e) => selectWorkspaceSession(e.target.value)}
              >
                {[...workspaceSessions]
                  .filter((session) => !session.archived)
                  .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
                  .map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="fieldGroup">
              <label className="microLabel" htmlFor="sessionNameManager">Session Name</label>
              <div className="sessionRenameRow">
                <input
                  id="sessionNameManager"
                  className="stitchInput"
                  value={sessionNameDraft}
                  onChange={(e) => setSessionNameDraft(e.target.value)}
                  onBlur={() => renameWorkspaceSession(sessionNameDraft)}
                />
                <button className="sessionRenameButton" type="button" onClick={() => renameWorkspaceSession(sessionNameDraft)}>
                  Save
                </button>
              </div>
            </div>
            <div className="sessionAdminRow">
              <button className="sessionAdminButton" type="button" onClick={archiveCurrentSession}>Archive</button>
              <button className="sessionAdminButton danger" type="button" onClick={deleteCurrentSession}>Delete</button>
            </div>
            <div className="fieldGroup">
              <label className="microLabel">Recent Sessions</label>
              <div className="recentSessionsList">
                {[...workspaceSessions]
                  .filter((session) => !session.archived)
                  .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
                  .slice(0, 8)
                  .map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={`recentSessionButton${session.id === currentSessionId ? " active" : ""}`}
                      onClick={() => selectWorkspaceSession(session.id)}
                    >
                      <strong>{session.name}</strong>
                      <span>{new Intl.DateTimeFormat("en-NZ", { hour: "2-digit", minute: "2-digit", month: "short", day: "2-digit" }).format(new Date(session.updatedAt))}</span>
                    </button>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="clinicalWorkspace">
        <IntakeRail
          encounterType={encounterType}
          transcript={transcript}
          transcriptStats={transcriptStats}
          transcriptionLanguage={transcriptionLanguage}
          transcribing={transcribing}
          transcribeProgress={transcribeProgress}
          isRecording={isRecording}
          isRecordingPaused={isRecordingPaused}
          recordingSeconds={recordingSeconds}
          currentPlaybackUrl={currentPlaybackUrl}
          selectedFile={selectedFile}
          loading={loading}
          transcriptNeedsConfirmation={transcriptNeedsConfirmation}
          showTranscriptBanner={showTranscriptBanner}
          showEvidence={showEvidence}
          status={status}
          structuredDocumentType={structured.documentType}
          recordings={currentSessionRecordings}
          speakerLines={speakerLines}
          onEncounterChange={(next) => {
            setEncounterType(next);
            autoRenameCurrentSessionIfGeneric(transcript, next);
            clearDraftState(next);
            setStatus("Idle");
            setReviewStatus(null);
          }}
          onLanguageChange={setTranscriptionLanguage}
          onRecordToggle={handleRecordToggle}
          onPauseResumeRecording={() => {
            void handlePauseResumeRecording();
          }}
          onAudioChange={(file) => {
            setTranscriptConfirmed(false);
            setTranscriptFromAudio(false);
            if (file) {
              if (file.size > MAX_UPLOAD_AUDIO_BYTES) {
                setCurrentRecordingId(null);
                setSelectedFile(null);
                setStatus("Audio file is too large for single-file provider upload (>25 MB). Use browser recording for segmented transcription, or upload a shorter clip.");
                return;
              }

              const uploaded: StoredRecording = {
                id: crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sessionId: currentSessionId,
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
            autoRenameCurrentSessionIfGeneric(next, encounterType);
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
            autoRenameCurrentSessionIfGeneric(found.transcript, encounterType);
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

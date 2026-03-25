import { useEffect, useMemo, useState } from "react";
import type { EncounterType, TranscriptSpeaker, TranscriptSpeakerLine } from "@/lib/types";
import { encounterOptions } from "@/components/note-studio/constants";
import type { StoredRecording } from "@/components/note-studio/recording-store";

type IntakeRailProps = {
  currentSessionId: string;
  currentSessionName: string;
  sessions: { id: string; name: string; updatedAt: string }[];
  encounterType: EncounterType;
  transcript: string;
  transcriptStats: { words: number; chars: number };
  transcriptionLanguage: string;
  transcribing: boolean;
  isRecording: boolean;
  isRecordingPaused: boolean;
  recordingSeconds: number;
  currentPlaybackUrl: string | null;
  selectedFile: File | null;
  loading: boolean;
  transcriptNeedsConfirmation: boolean;
  showTranscriptBanner: boolean;
  showEvidence: boolean;
  status: string;
  structuredDocumentType: string;
  recordings: StoredRecording[];
  speakerLines: TranscriptSpeakerLine[];
  onEncounterChange: (next: EncounterType) => void;
  onLanguageChange: (next: string) => void;
  onRecordToggle: () => void;
  onPauseResumeRecording: () => void;
  onAudioChange: (file: File | null) => void;
  onTranscriptChange: (next: string) => void;
  onConfirmTranscript: () => void;
  onResetTranscriptReview: () => void;
  onGenerate: () => void;
  onResetDemo: () => void;
  onToggleEvidence: () => void;
  onRetryRecording: (id: string) => void;
  onLoadRecordingTranscript: (id: string) => void;
  onDeleteRecording: (id: string) => void;
  onSpeakerLineChange: (index: number, speaker: TranscriptSpeakerLine["speaker"]) => void;
  onSpeakerLineTextChange: (index: number, text: string) => void;
  onSpeakerLineReviewToggle: (index: number) => void;
  onCreateSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onRenameSession: (name: string) => void;
  onArchiveSession: () => void;
  onDeleteSession: () => void;
};

function formatRecordingTime(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatRecordingSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getRecordingStatusLabel(recording: StoredRecording) {
  if (recording.interrupted && recording.status === "saved") return "interrupted · recoverable";
  if (recording.status === "paused") return "paused";
  if (recording.status === "saved") return "saved";
  if (recording.status === "transcribed") return "transcribed";
  if (recording.status === "transcribing") return "transcribing";
  if (recording.status === "failed") return "failed";
  return "recording";
}

function formatBytes(totalBytes: number) {
  if (totalBytes < 1024 * 1024) return `${Math.max(1, Math.round(totalBytes / 1024))} KB cached`;
  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB cached`;
}

function getRecordingStorageSummary(recording: StoredRecording) {
  const totalBytes = recording.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const chunkCount = recording.chunks.length;
  const chunkLabel = `${chunkCount} chunk${chunkCount === 1 ? "" : "s"}`;

  if (totalBytes === 0) return chunkLabel;
  return `${chunkLabel} · ${formatBytes(totalBytes)}`;
}

function getConversationLabel(recording: StoredRecording) {
  return `Conversation audio · ${formatRecordingTime(recording.createdAt)}`;
}

type SpeakerFilter = "All" | "Needs review" | "Unchecked" | TranscriptSpeaker;

const speakerFilterOrder: SpeakerFilter[] = [
  "All",
  "Needs review",
  "Unchecked",
  "Doctor",
  "Patient",
  "Nurse",
  "Family",
  "Unknown",
  "Speaker 1",
  "Speaker 2",
  "Speaker 3",
];

function needsReviewSpeaker(speaker: TranscriptSpeaker) {
  return speaker === "Unknown" || speaker.startsWith("Speaker ");
}

export function IntakeRail({
  currentSessionId,
  currentSessionName,
  sessions,
  encounterType,
  transcript,
  transcriptStats,
  transcriptionLanguage,
  transcribing,
  isRecording,
  isRecordingPaused,
  recordingSeconds,
  currentPlaybackUrl,
  selectedFile,
  loading,
  transcriptNeedsConfirmation,
  showTranscriptBanner,
  showEvidence,
  status,
  structuredDocumentType,
  recordings,
  speakerLines,
  onEncounterChange,
  onLanguageChange,
  onRecordToggle,
  onPauseResumeRecording,
  onAudioChange,
  onTranscriptChange,
  onConfirmTranscript,
  onResetTranscriptReview,
  onGenerate,
  onResetDemo,
  onToggleEvidence,
  onRetryRecording,
  onLoadRecordingTranscript,
  onDeleteRecording,
  onSpeakerLineChange,
  onSpeakerLineTextChange,
  onSpeakerLineReviewToggle,
  onCreateSession,
  onSelectSession,
  onRenameSession,
  onArchiveSession,
  onDeleteSession,
}: IntakeRailProps) {
  const recordingLabel = isRecording ? "Stop Recording" : transcribing ? "Transcribing…" : "Start Recording";
  const pauseLabel = isRecordingPaused ? "Resume" : "Pause";
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerFilter>("Needs review");
  const [sessionNameDraft, setSessionNameDraft] = useState(currentSessionName);

  const speakerFilterCounts = useMemo(() => {
    const counts = speakerLines.reduce<Record<string, number>>((accumulator, line) => {
      accumulator[line.speaker] = (accumulator[line.speaker] || 0) + 1;
      return accumulator;
    }, {});

    counts["Needs review"] = speakerLines.filter((line) => needsReviewSpeaker(line.speaker)).length;
    counts.Unchecked = speakerLines.filter((line) => !line.reviewed).length;

    return counts;
  }, [speakerLines]);

  const filteredSpeakerLines = useMemo(() => {
    return speakerLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => {
        if (speakerFilter === "All") return true;
        if (speakerFilter === "Needs review") return needsReviewSpeaker(line.speaker);
        if (speakerFilter === "Unchecked") return !line.reviewed;
        return line.speaker === speakerFilter;
      });
  }, [speakerFilter, speakerLines]);

  const availableSpeakerFilters = useMemo(
    () => speakerFilterOrder.filter((speaker) => speaker === "All" || speakerFilterCounts[speaker] > 0),
    [speakerFilterCounts],
  );

  useEffect(() => {
    if (!availableSpeakerFilters.includes(speakerFilter)) {
      setSpeakerFilter("All");
    }
  }, [availableSpeakerFilters, speakerFilter]);

  useEffect(() => {
    setSessionNameDraft(currentSessionName);
  }, [currentSessionName, currentSessionId]);

  return (
    <section className="intakeRail">
      <div className="intakeBlock">
        <div className="workspaceSessionHeader">
          <button className="newEncounterButton" type="button" onClick={onCreateSession}>New Session</button>
          <div className="fieldGroup">
            <label className="microLabel" htmlFor="workspaceSession">Session</label>
            <select
              id="workspaceSession"
              className="stitchSelect"
              value={currentSessionId}
              onChange={(e) => onSelectSession(e.target.value)}
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.name} · {formatRecordingTime(session.updatedAt)}
                </option>
              ))}
            </select>
          </div>
          <div className="fieldGroup">
            <label className="microLabel" htmlFor="sessionName">Session Name</label>
            <div className="sessionRenameRow">
              <input
                id="sessionName"
                className="stitchInput"
                value={sessionNameDraft}
                onChange={(e) => setSessionNameDraft(e.target.value)}
                onBlur={() => onRenameSession(sessionNameDraft)}
              />
              <button className="sessionRenameButton" type="button" onClick={() => onRenameSession(sessionNameDraft)}>
                Save
              </button>
            </div>
            <div className="sessionAdminRow">
              <button className="sessionAdminButton" type="button" onClick={onArchiveSession}>Archive</button>
              <button className="sessionAdminButton danger" type="button" onClick={onDeleteSession}>Delete</button>
            </div>
          </div>
          <div className="fieldGroup">
            <label className="microLabel">Recent Sessions</label>
            <div className="recentSessionsList">
              {sessions.slice(0, 4).map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={`recentSessionButton${session.id === currentSessionId ? " active" : ""}`}
                  onClick={() => onSelectSession(session.id)}
                >
                  <strong>{session.name}</strong>
                  <span>{formatRecordingTime(session.updatedAt)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <h3 className="microHeading">Context</h3>

        <div className="fieldGroup">
          <label className="microLabel" htmlFor="encounterType">Type</label>
          <select
            id="encounterType"
            className="stitchSelect"
            value={encounterType}
            onChange={(e) => onEncounterChange(e.target.value as EncounterType)}
          >
            {encounterOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="fieldGroup">
          <label className="microLabel" htmlFor="transcriptionLanguage">Spoken Language</label>
          <select
            id="transcriptionLanguage"
            className="stitchSelect"
            value={transcriptionLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="mi">Te Reo Māori</option>
            <option value="tl">Filipino</option>
            <option value="ko">한국어</option>
          </select>
        </div>

        <div className="fieldGroup">
          <label className="microLabel">Current Conversation</label>
          <div className="encounterSummaryCard">
            <strong>{recordings.length ? getConversationLabel(recordings[0]) : "No conversation audio yet"}</strong>
            <span>
              {recordings.length
                ? `${getRecordingStatusLabel(recordings[0])} · ${getRecordingStorageSummary(recordings[0])}`
                : "Start recording to capture this conversation. Pause, resume, and interruptions stay inside the same encounter."}
            </span>
          </div>
        </div>
        <button className={`recordingButton${isRecording ? " isRecording" : ""}${isRecordingPaused ? " isPaused" : ""}`} type="button" onClick={onRecordToggle} disabled={transcribing}>
          <div className="recordingIcon">●</div>
          <span>{recordings.length ? recordingLabel.replace("Start Recording", "Continue Conversation") : recordingLabel}</span>
          <span className="recordingMeta">{isRecording ? formatRecordingSeconds(recordingSeconds) : transcribing ? "processing audio" : recordings.length ? "continue this consultation conversation" : "tap to begin"}</span>
        </button>
        <div className="recordingControlRow">
          <button className="subtleButton" type="button" onClick={onPauseResumeRecording} disabled={!isRecording}>
            {pauseLabel}
          </button>
        </div>
        {currentPlaybackUrl ? (
          <div className="fieldGroup">
            <label className="microLabel">Conversation Playback</label>
            <audio className="conversationPlayback" controls src={currentPlaybackUrl} />
          </div>
        ) : null}

        <div className="fieldGroup">
          <label className="microLabel" htmlFor="audio">Audio file</label>
          <input
            id="audio"
            className="stitchInput"
            type="file"
            accept="audio/*"
            onChange={(e) => onAudioChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {recordings.length ? (
          <div className="fieldGroup">
            <label className="microLabel">Conversation Audio</label>
            <div className="recordingsList">
              {[...recordings]
                .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
                .slice(0, 6)
                .map((recording, index) => (
                <div key={recording.id} className="recordingItem">
                  <div className="recordingItemMeta">
                    <div className="recordingItemTitleRow">
                      <strong>{index === 0 ? getConversationLabel(recording) : `Audio snapshot ${index + 1}`}</strong>
                      {recording.interrupted ? <span className="recordingRecoveryBadge">Recovered</span> : null}
                    </div>
                    <span>{getRecordingStatusLabel(recording)} · {formatRecordingTime(recording.createdAt)}</span>
                    <span className="recordingStorageMeta">{getRecordingStorageSummary(recording)}</span>
                    {recording.error ? <em className="recordingItemHint">{recording.error}</em> : null}
                  </div>
                  <div className="recordingItemActions">
                    {recording.status === "recording" && recording.chunks.length > 0 ? (
                      <button type="button" className="recordingMiniButton recover" onClick={() => onRetryRecording(recording.id)}>
                        Recover now
                      </button>
                    ) : null}
                    {recording.status === "failed" || recording.status === "saved" ? (
                      <button type="button" className={`recordingMiniButton${recording.interrupted ? " recover" : ""}`} onClick={() => onRetryRecording(recording.id)}>
                        {recording.interrupted ? "Continue transcription" : recording.status === "saved" ? "Transcribe" : "Retry"}
                      </button>
                    ) : null}
                    {recording.transcript ? (
                      <button type="button" className="recordingMiniButton" onClick={() => onLoadRecordingTranscript(recording.id)}>
                        Load
                      </button>
                    ) : null}
                    <button type="button" className="recordingMiniButton danger" onClick={() => onDeleteRecording(recording.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="fieldGroup">
          <label className="microLabel" htmlFor="transcript">Manual Transcript</label>
          {showTranscriptBanner ? (
            <div className="transcriptConfirmBanner">
              <div>
                <strong>⚠ AI-generated transcript — please review before generating</strong>
              </div>
              <button className="transcriptConfirmButton" type="button" onClick={onConfirmTranscript}>
                Confirm transcript
              </button>
            </div>
          ) : null}
          <textarea
            id="transcript"
            className="stitchTextarea large"
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            rows={8}
          />
        </div>

        <div className="intakeStats">
          <span>{transcriptStats.words} words</span>
          <span>{transcriptStats.chars} chars</span>
          {speakerLines.length ? <span>{speakerLines.length} speaker lines</span> : null}
          {selectedFile ? (
            <span className={transcriptNeedsConfirmation ? "transcriptReviewFlag pending" : "transcriptReviewFlag confirmed"}>
              {transcriptNeedsConfirmation ? "Transcript review pending" : "Transcript reviewed"}
            </span>
          ) : null}
        </div>

        {speakerLines.length ? (
          <div className="fieldGroup">
            <div className="speakerReviewHeader">
              <label className="microLabel">Speaker-aware Transcript</label>
              <div className="speakerReviewActions">
                <button className="speakerReviewButton confirm" type="button" onClick={onConfirmTranscript}>
                  Mark transcript reviewed
                </button>
                <button className="speakerReviewButton reset" type="button" onClick={onResetTranscriptReview}>
                  Reset review
                </button>
              </div>
            </div>
            <div className="speakerFilterChips">
              {availableSpeakerFilters.map((speaker) => {
                const count = speaker === "All" ? speakerLines.length : speakerFilterCounts[speaker] || 0;
                return (
                  <button
                    key={speaker}
                    type="button"
                    className={`speakerFilterChip${speakerFilter === speaker ? " active" : ""}${speaker === "Needs review" ? " needsReview" : ""}`}
                    onClick={() => setSpeakerFilter(speaker)}
                  >
                    <span>{speaker}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
            <div className="speakerReviewSummary">
              <span>{speakerFilterCounts.Unchecked || 0} unchecked</span>
              <span>{speakerLines.filter((line) => line.reviewed).length} reviewed</span>
              {speakerFilterCounts["Needs review"] ? <span>{speakerFilterCounts["Needs review"]} uncertain</span> : null}
            </div>
            {speakerFilterCounts["Needs review"] ? (
              <div className="speakerReviewHint">
                Prioritise <strong>Unknown</strong> and <strong>Speaker n</strong> lines first — they are most likely to need clinician correction.
              </div>
            ) : null}
            <div className="speakerLinesList">
              {filteredSpeakerLines.length ? (
                filteredSpeakerLines.map(({ line, index }) => (
                  <div key={`${line.speaker}-${index}-${line.text.slice(0, 12)}`} className={`speakerLineCard speaker-${line.speaker.toLowerCase().replace(/\s+/g, "-")}${line.reviewed ? " reviewed" : ""}`}>
                    <div className="speakerLineHeader">
                      <select
                        className="speakerLabelSelect"
                        value={line.speaker}
                        onChange={(e) => onSpeakerLineChange(index, e.target.value as TranscriptSpeakerLine["speaker"])}
                      >
                        <option value="Doctor">Doctor</option>
                        <option value="Patient">Patient</option>
                        <option value="Nurse">Nurse</option>
                        <option value="Family">Family</option>
                        <option value="Unknown">Unknown</option>
                        <option value="Speaker 1">Speaker 1</option>
                        <option value="Speaker 2">Speaker 2</option>
                        <option value="Speaker 3">Speaker 3</option>
                      </select>
                      <button
                        type="button"
                        className={`speakerLineReviewToggle${line.reviewed ? " reviewed" : ""}`}
                        onClick={() => onSpeakerLineReviewToggle(index)}
                      >
                        {line.reviewed ? "Reviewed" : "Mark checked"}
                      </button>
                    </div>
                    <textarea
                      className="speakerLineTextEditor"
                      value={line.text}
                      onChange={(e) => onSpeakerLineTextChange(index, e.target.value)}
                      rows={3}
                    />
                  </div>
                ))
              ) : (
                <div className="speakerEmptyState">No transcript lines match this filter.</div>
              )}
            </div>
          </div>
        ) : null}

        <button className="primaryDarkButton" type="button" onClick={onGenerate} disabled={loading || transcriptNeedsConfirmation}>
          {loading
            ? "Generating…"
            : transcriptNeedsConfirmation
              ? "Confirm transcript first"
              : structuredDocumentType === "cardiology_consultant_letter"
                ? "Generate consultant letter"
                : structuredDocumentType === "cardiac_discharge_summary"
                  ? "Generate discharge summary"
                  : "Generate clinical draft"}
        </button>
        <button className="subtleButton" type="button" onClick={onResetDemo}>Reset demo</button>
      </div>

      <div className="intakeEvidenceToggle">
        <button type="button" className="intakeEvidenceButton" onClick={onToggleEvidence}>
          {showEvidence ? "Evidence Support ✓" : "Evidence Support"}
        </button>
      </div>

      <nav className="intakeFooterNav">
        <span>Status: {status}</span>
        {selectedFile ? <span>Audio: {selectedFile.name}</span> : null}
      </nav>
    </section>
  );
}

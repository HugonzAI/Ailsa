import { useEffect, useMemo, useState } from "react";
import type { EncounterType, TranscriptSpeaker, TranscriptSpeakerLine } from "@/lib/types";
import { encounterOptions } from "@/components/note-studio/constants";
import type { StoredRecording } from "@/components/note-studio/recording-store";

type IntakeRailProps = {
  encounterType: EncounterType;
  transcript: string;
  transcriptStats: { words: number; chars: number };
  transcriptionLanguage: string;
  transcribing: boolean;
  isRecording: boolean;
  recordingSeconds: number;
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

const speakerFilterOrder: ("All" | TranscriptSpeaker)[] = [
  "All",
  "Doctor",
  "Patient",
  "Nurse",
  "Family",
  "Unknown",
  "Speaker 1",
  "Speaker 2",
  "Speaker 3",
];

export function IntakeRail({
  encounterType,
  transcript,
  transcriptStats,
  transcriptionLanguage,
  transcribing,
  isRecording,
  recordingSeconds,
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
}: IntakeRailProps) {
  const recordingLabel = isRecording ? "Stop Recording" : transcribing ? "Transcribing…" : "Start Recording";
  const [speakerFilter, setSpeakerFilter] = useState<"All" | TranscriptSpeaker>("All");

  const speakerFilterCounts = useMemo(() => {
    return speakerLines.reduce<Record<string, number>>((accumulator, line) => {
      accumulator[line.speaker] = (accumulator[line.speaker] || 0) + 1;
      return accumulator;
    }, {});
  }, [speakerLines]);

  const filteredSpeakerLines = useMemo(() => {
    return speakerLines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => speakerFilter === "All" || line.speaker === speakerFilter);
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

  return (
    <section className="intakeRail">
      <div className="intakeBlock">
        <button className="newEncounterButton" type="button">New Encounter</button>
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
          </select>
        </div>

        <button className={`recordingButton${isRecording ? " isRecording" : ""}`} type="button" onClick={onRecordToggle} disabled={transcribing}>
          <div className="recordingIcon">●</div>
          <span>{recordingLabel}</span>
          <span className="recordingMeta">{isRecording ? formatRecordingSeconds(recordingSeconds) : transcribing ? "processing audio" : "tap to begin"}</span>
        </button>

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
            <label className="microLabel">Saved Recordings</label>
            <div className="recordingsList">
              {recordings.slice(0, 4).map((recording) => (
                <div key={recording.id} className="recordingItem">
                  <div className="recordingItemMeta">
                    <strong>{recording.filename}</strong>
                    <span>{recording.status} · {formatRecordingTime(recording.createdAt)}</span>
                  </div>
                  <div className="recordingItemActions">
                    {recording.status === "failed" || recording.status === "saved" ? (
                      <button type="button" className="recordingMiniButton" onClick={() => onRetryRecording(recording.id)}>
                        Retry
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
                    className={`speakerFilterChip${speakerFilter === speaker ? " active" : ""}`}
                    onClick={() => setSpeakerFilter(speaker)}
                  >
                    <span>{speaker}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>
            <div className="speakerLinesList">
              {filteredSpeakerLines.map(({ line, index }) => (
                <div key={`${line.speaker}-${index}-${line.text.slice(0, 12)}`} className={`speakerLineCard speaker-${line.speaker.toLowerCase().replace(/\s+/g, "-")}`}>
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
                  </div>
                  <textarea
                    className="speakerLineTextEditor"
                    value={line.text}
                    onChange={(e) => onSpeakerLineTextChange(index, e.target.value)}
                    rows={3}
                  />
                </div>
              ))}
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

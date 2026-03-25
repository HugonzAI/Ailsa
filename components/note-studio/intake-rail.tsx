import type { EncounterType } from "@/lib/types";
import { encounterOptions } from "@/components/note-studio/constants";

type IntakeRailProps = {
  encounterType: EncounterType;
  transcript: string;
  transcriptStats: { words: number; chars: number };
  transcribing: boolean;
  selectedFile: File | null;
  loading: boolean;
  transcriptNeedsConfirmation: boolean;
  showTranscriptBanner: boolean;
  showEvidence: boolean;
  status: string;
  structuredDocumentType: string;
  onEncounterChange: (next: EncounterType) => void;
  onTranscribeAudio: () => void;
  onAudioChange: (file: File | null) => void;
  onTranscriptChange: (next: string) => void;
  onConfirmTranscript: () => void;
  onGenerate: () => void;
  onResetDemo: () => void;
  onToggleEvidence: () => void;
};

export function IntakeRail({
  encounterType,
  transcript,
  transcriptStats,
  transcribing,
  selectedFile,
  loading,
  transcriptNeedsConfirmation,
  showTranscriptBanner,
  showEvidence,
  status,
  structuredDocumentType,
  onEncounterChange,
  onTranscribeAudio,
  onAudioChange,
  onTranscriptChange,
  onConfirmTranscript,
  onGenerate,
  onResetDemo,
  onToggleEvidence,
}: IntakeRailProps) {
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

        <button className="recordingButton" type="button" onClick={onTranscribeAudio} disabled={transcribing}>
          <div className="recordingIcon">●</div>
          <span>{transcribing ? "Transcribing…" : "Start Recording"}</span>
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
        </div>

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

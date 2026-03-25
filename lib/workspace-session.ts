import type { EncounterType, StructuredOutput, TranscriptSpeakerLine } from "@/lib/types";
import type { AuditEntry, ReviewStatus } from "@/components/note-studio/constants";
import { demoTranscript, emptyStructuredNote, outputPlaceholder } from "@/components/note-studio/constants";

export type WorkspaceSession = {
  id: string;
  name: string;
  updatedAt: string;
  archived?: boolean;
  encounterType: EncounterType;
  transcriptionLanguage: string;
  transcript: string;
  output: string;
  structured: StructuredOutput;
  transcriptConfirmed: boolean;
  transcriptFromAudio: boolean;
  speakerLines: TranscriptSpeakerLine[];
  reviewStatus: ReviewStatus | null;
  auditLog: AuditEntry[];
  showEvidence: boolean;
  editableOutput: boolean;
  status: string;
};

export type WorkspaceSessionStore = {
  currentSessionId: string;
  sessions: WorkspaceSession[];
};

export const WORKSPACE_SESSIONS_KEY = "ailsa-note-sessions-v1";

function formatSessionTime(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function buildSmartSessionName(encounterType: EncounterType, transcript?: string) {
  const now = new Date();
  const labelMap: Record<EncounterType, string> = {
    "Cardiac ward round": "Ward round",
    "Cardiac admission": "Admission",
    "Cardiac discharge": "Discharge",
    "Cardiac handover": "Handover",
    "Chest pain / ACS review": "Chest pain",
    "Decompensated heart failure": "HF review",
    "AF / arrhythmia review": "Arrhythmia",
    "Syncope / presyncope review": "Syncope",
    "Cardiology consultant letter": "Consult letter",
  };

  const prefix = labelMap[encounterType] || "Session";
  const hint = transcript
    ?.trim()
    ?.split(/\n|\./)[0]
    ?.replace(/^\[[^\]]+\]\s*/g, "")
    ?.replace(/^(Doctor|Patient|Nurse|Family|Unknown|Speaker \d+):\s*/i, "")
    ?.trim()
    ?.slice(0, 36);

  return hint ? `${prefix} · ${hint}` : `${prefix} · ${formatSessionTime(now)}`;
}

export function createDefaultSession(id: string, overrides: Partial<WorkspaceSession> = {}): WorkspaceSession {
  return {
    id,
    name: "Session 1",
    updatedAt: new Date().toISOString(),
    archived: false,
    encounterType: "Cardiac ward round",
    transcriptionLanguage: "en",
    transcript: demoTranscript,
    output: outputPlaceholder,
    structured: emptyStructuredNote,
    transcriptConfirmed: false,
    transcriptFromAudio: false,
    speakerLines: [],
    reviewStatus: null,
    auditLog: [],
    showEvidence: true,
    editableOutput: false,
    status: "Idle",
    ...overrides,
  };
}

export function mergeWorkspaceSessions(localSessions: WorkspaceSession[], remoteSessions: WorkspaceSession[]) {
  const merged = new Map<string, WorkspaceSession>();

  for (const session of [...localSessions, ...remoteSessions]) {
    const existing = merged.get(session.id);
    if (!existing || new Date(session.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      merged.set(session.id, session);
    }
  }

  return [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

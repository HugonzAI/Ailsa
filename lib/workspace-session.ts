import type { EncounterType, StructuredOutput, TranscriptSpeakerLine } from "@/lib/types";
import type { AuditEntry, ReviewStatus } from "@/components/note-studio/constants";
import { demoTranscript, emptyStructuredNote, outputPlaceholder } from "@/components/note-studio/constants";

export type WorkspaceSession = {
  id: string;
  name: string;
  updatedAt: string;
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

export function createDefaultSession(id: string, overrides: Partial<WorkspaceSession> = {}): WorkspaceSession {
  return {
    id,
    name: "Session 1",
    updatedAt: new Date().toISOString(),
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

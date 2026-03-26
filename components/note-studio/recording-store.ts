export type StoredRecordingStatus = "recording" | "paused" | "saved" | "transcribing" | "transcribed" | "failed";

import type { TranscriptSpeakerLine } from "@/lib/types";

export type StoredTranscriptionSegment = {
  segmentIndex: number;
  transcript: string;
  speakerLines?: TranscriptSpeakerLine[];
};

export type StoredRecording = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  encounterType: string;
  filename: string;
  mimeType: string;
  status: StoredRecordingStatus;
  interrupted?: boolean;
  chunks: Blob[];
  transcript?: string;
  speakerLines?: TranscriptSpeakerLine[];
  transcriptionSegments?: StoredTranscriptionSegment[];
  transcriptionProgress?: {
    completedSegments: number;
    totalSegments: number;
    failedSegment?: number;
  };
  error?: string;
};

const DB_NAME = "ailsa-recordings";
const STORE_NAME = "recordings";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, handler: (store: IDBObjectStore) => Promise<T> | T): Promise<T> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    Promise.resolve(handler(store))
      .then((value) => {
        transaction.oncomplete = () => {
          db.close();
          resolve(value);
        };
      })
      .catch((error) => {
        db.close();
        reject(error);
      });

    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    };
  });
}

export async function listStoredRecordings() {
  return withStore("readonly", (store) =>
    new Promise<StoredRecording[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as StoredRecording[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(results);
      };
      request.onerror = () => reject(request.error ?? new Error("Failed to list recordings"));
    }),
  );
}

export async function saveStoredRecording(recording: StoredRecording) {
  return withStore("readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const request = store.put(recording);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to save recording"));
    }),
  );
}

export async function getStoredRecording(id: string) {
  return withStore("readonly", (store) =>
    new Promise<StoredRecording | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as StoredRecording | undefined);
      request.onerror = () => reject(request.error ?? new Error("Failed to get recording"));
    }),
  );
}

export async function deleteStoredRecording(id: string) {
  return withStore("readwrite", (store) =>
    new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Failed to delete recording"));
    }),
  );
}

export async function recoverInterruptedRecordings() {
  const recordings = await listStoredRecordings();
  const interrupted = recordings.filter((recording) => recording.status === "recording");

  await Promise.all(
    interrupted.map((recording) =>
      saveStoredRecording({
        ...recording,
        status: recording.chunks.length > 0 ? "saved" : "failed",
        interrupted: recording.chunks.length > 0,
        updatedAt: new Date().toISOString(),
        error:
          recording.chunks.length > 0
            ? "Recording interrupted before stop — recover and transcribe when ready."
            : "Recording interrupted before any audio was saved.",
      }),
    ),
  );

  return interrupted.length;
}

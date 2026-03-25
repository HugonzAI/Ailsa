import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { WorkspaceSession } from "@/lib/workspace-session";

const TABLE_SQL = `
CREATE TABLE IF NOT EXISTS ailsa_sessions (
  session_key TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  encounter_type TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
)`;

function getOwnerKey(request: Request) {
  return request.headers.get("cf-access-authenticated-user-email") || "local-single-user";
}

function getDb() {
  const env = getCloudflareContext().env as { AILSA_DB?: any };
  return env.AILSA_DB;
}

async function ensureTable(db: any) {
  await db.exec(TABLE_SQL);
}

export async function GET(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ sessions: [], mode: "no-db" });
  }

  const ownerKey = getOwnerKey(request);
  await ensureTable(db);

  const result = await db
    .prepare(`SELECT payload FROM ailsa_sessions WHERE owner_key = ? ORDER BY updated_at DESC`)
    .bind(ownerKey)
    .all();

  const sessions = ((result.results || []) as Array<{ payload: string }>)
    .map((row: { payload: string }) => {
      try {
        return JSON.parse(row.payload) as WorkspaceSession;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return NextResponse.json({ sessions, mode: "d1" });
}

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ ok: true, mode: "no-db" });
  }

  const ownerKey = getOwnerKey(request);
  const session = (await request.json()) as WorkspaceSession;

  if (!session?.id || !session?.name) {
    return NextResponse.json({ error: "Session id and name are required." }, { status: 400 });
  }

  await ensureTable(db);

  const now = new Date().toISOString();
  const payload = JSON.stringify({ ...session, updatedAt: session.updatedAt || now });

  await db
    .prepare(`
      INSERT INTO ailsa_sessions (session_key, owner_key, session_id, name, encounter_type, updated_at, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(session_key) DO UPDATE SET
        name = excluded.name,
        encounter_type = excluded.encounter_type,
        updated_at = excluded.updated_at,
        payload = excluded.payload
    `)
    .bind(
      `${ownerKey}:${session.id}`,
      ownerKey,
      session.id,
      session.name,
      session.encounterType,
      session.updatedAt || now,
      payload,
      now,
    )
    .run();

  return NextResponse.json({ ok: true, mode: "d1" });
}

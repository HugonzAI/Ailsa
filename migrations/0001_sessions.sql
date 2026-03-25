CREATE TABLE IF NOT EXISTS ailsa_sessions (
  session_key TEXT PRIMARY KEY,
  owner_key TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL,
  encounter_type TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ailsa_sessions_owner_updated
  ON ailsa_sessions(owner_key, updated_at DESC);

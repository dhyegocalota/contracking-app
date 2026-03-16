CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracking_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  public_id TEXT UNIQUE NOT NULL,
  patient_name TEXT,
  gestational_week INTEGER,
  started_at TEXT NOT NULL,
  ended_at TEXT
);

CREATE TABLE IF NOT EXISTS contractions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  intensity TEXT,
  position TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES tracking_sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT,
  occurred_at TEXT NOT NULL
);

CREATE TABLE contractions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  intensity TEXT,
  position TEXT,
  notes TEXT
);

INSERT INTO contractions_new SELECT id, user_id, started_at, ended_at, intensity, position, notes FROM contractions;

DROP TABLE contractions;

ALTER TABLE contractions_new RENAME TO contractions;

CREATE TABLE events_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  type TEXT NOT NULL,
  value TEXT,
  occurred_at TEXT NOT NULL
);

INSERT INTO events_new SELECT id, user_id, type, value, occurred_at FROM events;

DROP TABLE events;

ALTER TABLE events_new RENAME TO events;

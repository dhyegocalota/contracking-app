CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  public_id TEXT,
  endpoint TEXT NOT NULL,
  key_p256dh TEXT NOT NULL,
  key_auth TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('owner', 'companion')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_public_id ON push_subscriptions(public_id);
CREATE UNIQUE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

CREATE TABLE push_notification_log (
  id TEXT PRIMARY KEY,
  contraction_id TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_push_notification_log_unique ON push_notification_log(contraction_id, notification_type);

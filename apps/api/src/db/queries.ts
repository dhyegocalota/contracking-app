export const SELECT_USER_BY_EMAIL = 'SELECT * FROM users WHERE email = ?';

export const SELECT_USER_BY_ID = 'SELECT * FROM users WHERE id = ?';

export const INSERT_USER = 'INSERT INTO users (id, email, name, created_at) VALUES (?, ?, ?, ?)';

export const INSERT_MAGIC_LINK_TOKEN =
  'INSERT INTO magic_link_tokens (id, user_id, token, otp, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)';

export const SELECT_MAGIC_LINK_TOKEN = 'SELECT * FROM magic_link_tokens WHERE token = ?';

export const SELECT_MAGIC_LINK_BY_OTP =
  'SELECT * FROM magic_link_tokens WHERE user_id = ? AND otp = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1';

export const MARK_TOKEN_USED = 'UPDATE magic_link_tokens SET used_at = ? WHERE id = ?';

export const COUNT_MAGIC_LINKS_IN_WINDOW =
  'SELECT COUNT(*) as count FROM magic_link_tokens WHERE user_id = ? AND created_at > ?';

export const INSERT_SESSION = 'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)';

export const SELECT_SESSION = 'SELECT * FROM sessions WHERE id = ?';

export const DELETE_SESSION = 'DELETE FROM sessions WHERE id = ?';

export const INSERT_TRACKING_SESSION =
  'INSERT INTO tracking_sessions (id, user_id, public_id, patient_name, gestational_week, started_at, timezone) VALUES (?, ?, ?, ?, ?, ?, ?)';

export const SELECT_TRACKING_SESSIONS_BY_USER =
  'SELECT * FROM tracking_sessions WHERE user_id = ? ORDER BY started_at DESC';

export const SELECT_TRACKING_SESSION = 'SELECT * FROM tracking_sessions WHERE id = ?';

export const SELECT_USER_TRACKING_SESSION =
  'SELECT * FROM tracking_sessions WHERE user_id = ? ORDER BY started_at DESC LIMIT 1';

export const SELECT_SESSION_BY_PUBLIC_ID = 'SELECT * FROM tracking_sessions WHERE public_id = ?';

export const UPDATE_TRACKING_SESSION =
  'UPDATE tracking_sessions SET patient_name = ?, gestational_week = ?, ended_at = ?, timezone = ? WHERE id = ?';

export const DELETE_TRACKING_SESSION = 'DELETE FROM tracking_sessions WHERE id = ?';

export const SELECT_CONTRACTION = 'SELECT * FROM contractions WHERE id = ?';

export const SELECT_CONTRACTIONS_BY_USER = 'SELECT * FROM contractions WHERE user_id = ? ORDER BY started_at ASC';

export const SELECT_CONTRACTIONS_AFTER_TIMESTAMP =
  'SELECT * FROM contractions WHERE user_id = ? AND started_at > ? ORDER BY started_at ASC';

export const INSERT_CONTRACTION = 'INSERT INTO contractions (id, user_id, started_at) VALUES (?, ?, ?)';

export const UPDATE_CONTRACTION =
  'UPDATE contractions SET started_at = ?, ended_at = ?, intensity = ?, position = ?, notes = ? WHERE id = ?';

export const DELETE_CONTRACTION = 'DELETE FROM contractions WHERE id = ?';

export const UPSERT_CONTRACTION =
  'INSERT INTO contractions (id, user_id, started_at, ended_at, intensity, position, notes) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, started_at = excluded.started_at, ended_at = excluded.ended_at, intensity = excluded.intensity, position = excluded.position, notes = excluded.notes';

export const SELECT_EVENT = 'SELECT * FROM events WHERE id = ?';

export const SELECT_EVENTS_BY_USER = 'SELECT * FROM events WHERE user_id = ? ORDER BY occurred_at ASC';

export const SELECT_EVENTS_AFTER_TIMESTAMP =
  'SELECT * FROM events WHERE user_id = ? AND occurred_at > ? ORDER BY occurred_at ASC';

export const INSERT_EVENT = 'INSERT INTO events (id, user_id, type, value, occurred_at) VALUES (?, ?, ?, ?, ?)';

export const DELETE_EVENT = 'DELETE FROM events WHERE id = ?';

export const UPSERT_EVENT =
  'INSERT INTO events (id, user_id, type, value, occurred_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET user_id = excluded.user_id, value = excluded.value, occurred_at = excluded.occurred_at';

export const UPSERT_PUSH_SUBSCRIPTION =
  'INSERT INTO push_subscriptions (id, user_id, public_id, endpoint, key_p256dh, key_auth, type) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET key_p256dh = excluded.key_p256dh, key_auth = excluded.key_auth, type = excluded.type, user_id = excluded.user_id, public_id = excluded.public_id';

export const DELETE_PUSH_SUBSCRIPTION_BY_ENDPOINT =
  'DELETE FROM push_subscriptions WHERE endpoint = ? AND key_auth = ?';

export const SELECT_PUSH_SUBSCRIPTIONS_BY_USER = 'SELECT * FROM push_subscriptions WHERE user_id = ?';

export const SELECT_PUSH_SUBSCRIPTIONS_BY_PUBLIC_ID = 'SELECT * FROM push_subscriptions WHERE public_id = ?';

export const DELETE_PUSH_SUBSCRIPTION = 'DELETE FROM push_subscriptions WHERE id = ?';

export const UPDATE_PUSH_SUBSCRIPTION_LAST_USED = 'UPDATE push_subscriptions SET last_used_at = ? WHERE id = ?';

export const SELECT_ACTIVE_CONTRACTIONS_PAST_THRESHOLD =
  'SELECT c.*, ts.public_id FROM contractions c JOIN tracking_sessions ts ON c.user_id = ts.user_id AND ts.ended_at IS NULL WHERE c.ended_at IS NULL AND c.started_at < ? GROUP BY c.id';

export const SELECT_PUSH_NOTIFICATION_LOG =
  'SELECT * FROM push_notification_log WHERE contraction_id = ? AND notification_type = ?';

export const INSERT_PUSH_NOTIFICATION_LOG =
  'INSERT INTO push_notification_log (id, contraction_id, notification_type) VALUES (?, ?, ?)';

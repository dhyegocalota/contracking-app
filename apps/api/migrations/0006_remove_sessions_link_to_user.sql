ALTER TABLE contractions ADD COLUMN user_id TEXT;
UPDATE contractions SET user_id = (SELECT user_id FROM tracking_sessions WHERE tracking_sessions.id = contractions.session_id);

ALTER TABLE events ADD COLUMN user_id TEXT;
UPDATE events SET user_id = (SELECT user_id FROM tracking_sessions WHERE tracking_sessions.id = events.session_id);

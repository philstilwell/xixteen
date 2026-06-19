ALTER TABLE score_submissions ADD COLUMN display_key TEXT;
ALTER TABLE score_submissions ADD COLUMN client_hash TEXT;
ALTER TABLE score_submissions ADD COLUMN answer_hash TEXT;
ALTER TABLE score_submissions ADD COLUMN flagged INTEGER NOT NULL DEFAULT 0 CHECK (flagged IN (0, 1));
ALTER TABLE score_submissions ADD COLUMN flag_reason TEXT;

DROP INDEX IF EXISTS idx_score_submissions_daily;

CREATE INDEX IF NOT EXISTS idx_score_submissions_daily
ON score_submissions(quiz_date, flagged, score DESC, duration_ms ASC, submitted_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_score_submissions_quiz_display_key
ON score_submissions(quiz_id, display_key)
WHERE display_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_score_submissions_quiz_client_hash
ON score_submissions(quiz_id, client_hash)
WHERE client_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_score_submissions_participant_date
ON score_submissions(participant_id, quiz_date DESC);

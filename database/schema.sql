PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  ordinal INTEGER NOT NULL UNIQUE,
  name TEXT NOT NULL,
  public_label TEXT NOT NULL,
  testable_task TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  prompt TEXT NOT NULL UNIQUE,
  explanation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_items_skill_difficulty
ON items(skill_id, difficulty);

CREATE TABLE IF NOT EXISTS choices (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  choice_key TEXT NOT NULL CHECK (choice_key IN ('A', 'B', 'C', 'D')),
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  UNIQUE (item_id, choice_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_choices_one_correct
ON choices(item_id)
WHERE is_correct = 1;

CREATE TABLE IF NOT EXISTS daily_quizzes (
  id TEXT PRIMARY KEY,
  quiz_date TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_quiz_items (
  quiz_id TEXT NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 16),
  PRIMARY KEY (quiz_id, item_id),
  UNIQUE (quiz_id, position)
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS score_submissions (
  id TEXT PRIMARY KEY,
  participant_id TEXT NOT NULL REFERENCES participants(id),
  quiz_id TEXT NOT NULL REFERENCES daily_quizzes(id),
  quiz_date TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 16),
  total_items INTEGER NOT NULL DEFAULT 16,
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (participant_id, quiz_id)
);

CREATE INDEX IF NOT EXISTS idx_score_submissions_daily
ON score_submissions(quiz_date, score DESC, duration_ms ASC, submitted_at ASC);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  participant_id TEXT REFERENCES participants(id),
  quiz_id TEXT REFERENCES daily_quizzes(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  selected_choice_id TEXT REFERENCES choices(id),
  correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
  response_ms INTEGER NOT NULL DEFAULT 0 CHECK (response_ms >= 0),
  context TEXT NOT NULL CHECK (context IN ('daily', 'practice')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attempts_participant_skill
ON attempts(participant_id, item_id, created_at);

CREATE TABLE IF NOT EXISTS user_skill_stats (
  participant_id TEXT NOT NULL REFERENCES participants(id),
  skill_id TEXT NOT NULL REFERENCES skills(id),
  attempts INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  recent_accuracy REAL NOT NULL DEFAULT 0,
  mastery_score REAL NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (participant_id, skill_id)
);

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return json({ error: "D1 database binding DB is not configured." }, 501);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const participantId = cleanId(body.participantId);
  const displayName = cleanDisplayName(body.displayName);
  const quizDate = cleanDate(body.quizDate);
  const durationMs = cleanDuration(body.durationMs, 60 * 60 * 1000);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;

  if (!participantId || !displayName || !quizDate || !answers) {
    return json({ error: "participantId, displayName, quizDate, and answers are required." }, 400);
  }

  const quiz = await env.DB
    .prepare("SELECT id FROM daily_quizzes WHERE quiz_date = ? AND status = 'published'")
    .bind(quizDate)
    .first();

  if (!quiz) {
    return json({ error: "No published quiz for that date." }, 404);
  }

  const correctRows = await env.DB
    .prepare(`
      SELECT i.id AS item_id, i.skill_id AS skill_id, c.choice_key AS correct_choice_key
      FROM daily_quiz_items dqi
      JOIN items i ON i.id = dqi.item_id
      JOIN choices c ON c.item_id = i.id AND c.is_correct = 1
      WHERE dqi.quiz_id = ?
      ORDER BY dqi.position ASC
    `)
    .bind(quiz.id)
    .all();

  const rows = correctRows.results || [];
  if (rows.length !== 16) {
    return json({ error: "Daily quiz is not fully seeded." }, 500);
  }

  const scored = rows.map((row) => {
    const answer = normalizeAnswer(answers[row.item_id]);
    const selectedKey = cleanChoiceKey(answer.choiceId);
    return {
      itemId: row.item_id,
      skillId: row.skill_id,
      selectedKey,
      responseMs: answer.responseMs,
      correct: selectedKey === row.correct_choice_key
    };
  });

  const score = scored.filter((row) => row.correct).length;
  const submissionId = crypto.randomUUID();

  await env.DB
    .prepare(`
      INSERT INTO participants (id, display_name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(participantId, displayName)
    .run();

  const submission = await env.DB
    .prepare(`
      INSERT OR IGNORE INTO score_submissions
        (id, participant_id, quiz_id, quiz_date, score, total_items, duration_ms)
      VALUES (?, ?, ?, ?, ?, 16, ?)
    `)
    .bind(submissionId, participantId, quiz.id, quizDate, score, durationMs)
    .run();

  const accepted = (submission.meta?.changes || 0) > 0;

  if (accepted) {
    const statements = [];
    for (const row of scored) {
      const selectedChoiceId = row.selectedKey ? `${row.itemId}-${row.selectedKey.toLowerCase()}` : null;
      statements.push(
        env.DB
          .prepare(`
            INSERT INTO attempts
              (id, participant_id, quiz_id, item_id, selected_choice_id, correct, response_ms, context)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'daily')
          `)
          .bind(crypto.randomUUID(), participantId, quiz.id, row.itemId, selectedChoiceId, row.correct ? 1 : 0, row.responseMs)
      );
      statements.push(
        env.DB
          .prepare(`
            INSERT INTO user_skill_stats
              (participant_id, skill_id, attempts, correct, recent_accuracy, mastery_score, last_seen_at)
            VALUES (?, ?, 1, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(participant_id, skill_id) DO UPDATE SET
              attempts = attempts + 1,
              correct = correct + excluded.correct,
              recent_accuracy = CAST(correct + excluded.correct AS REAL) / CAST(attempts + 1 AS REAL),
              mastery_score = CAST(correct + excluded.correct AS REAL) / CAST(attempts + 1 AS REAL),
              last_seen_at = CURRENT_TIMESTAMP
          `)
          .bind(participantId, row.skillId, row.correct ? 1 : 0, row.correct ? 1 : 0, row.correct ? 1 : 0)
      );
    }
    await env.DB.batch(statements);
  }

  const saved = await env.DB
    .prepare(`
      SELECT score, total_items AS totalItems, duration_ms AS durationMs, submitted_at AS submittedAt
      FROM score_submissions
      WHERE participant_id = ? AND quiz_id = ?
    `)
    .bind(participantId, quiz.id)
    .first();

  const rank = saved
    ? await dailyRank(env.DB, quiz.id, saved.score, saved.durationMs, saved.submittedAt)
    : null;

  return json({
    accepted,
    quizDate,
    score: saved?.score ?? score,
    totalItems: saved?.totalItems ?? 16,
    durationMs: saved?.durationMs ?? durationMs,
    submittedAt: saved?.submittedAt || null,
    rank
  });
}

async function dailyRank(db, quizId, score, durationMs, submittedAt) {
  const row = await db
    .prepare(`
      SELECT COUNT(*) + 1 AS rank
      FROM score_submissions
      WHERE quiz_id = ?
        AND (
          score > ?
          OR (score = ? AND duration_ms < ?)
          OR (score = ? AND duration_ms = ? AND submitted_at < ?)
        )
    `)
    .bind(quizId, score, score, durationMs, score, durationMs, submittedAt)
    .first();
  return row?.rank || 1;
}

function normalizeAnswer(value) {
  if (value && typeof value === "object") {
    return {
      choiceId: value.choiceId,
      responseMs: cleanDuration(value.responseMs, 10 * 60 * 1000)
    };
  }
  return {
    choiceId: value,
    responseMs: 0
  };
}

function cleanId(value) {
  const text = String(value || "").trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(text) ? text : null;
}

function cleanDisplayName(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim().slice(0, 28);
  return text || null;
}

function cleanDate(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function cleanChoiceKey(value) {
  const text = String(value || "").trim().toUpperCase();
  return /^[ABCD]$/.test(text) ? text : null;
}

function cleanDuration(value, max) {
  const parsed = Number.parseInt(value || "0", 10);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(parsed, max));
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

const TOTAL_DAILY_ITEMS = 16;
const MAX_DAILY_DURATION_MS = 60 * 60 * 1000;
const MAX_ITEM_RESPONSE_MS = 10 * 60 * 1000;
const MIN_PUBLIC_DURATION_MS = 8000;
const MIN_PERFECT_DURATION_MS = 15000;

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
  const displayKey = displayName ? displayNameKey(displayName) : null;
  const quizDate = cleanDate(body.quizDate);
  const durationMs = cleanDuration(body.durationMs, MAX_DAILY_DURATION_MS);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : null;

  if (!participantId || !displayName || !displayKey || !quizDate || !answers) {
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
  if (rows.length !== TOTAL_DAILY_ITEMS) {
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
  const answeredCount = scored.filter((row) => row.selectedKey).length;
  const flags = publicFlagReasons({ answeredCount, durationMs, score });
  const flagged = flags.length > 0;
  const flagReason = flags.join("; ") || null;
  const clientHash = await requestClientHash(request, participantId, env.SCORE_SALT);
  const answerHash = await stableHash(JSON.stringify(scored.map((row) => [row.itemId, row.selectedKey || ""])));
  const submissionId = crypto.randomUUID();

  await env.DB
    .prepare(`
      INSERT INTO participants (id, display_name, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO NOTHING
    `)
    .bind(participantId, displayName)
    .run();

  const submission = await env.DB
    .prepare(`
      INSERT OR IGNORE INTO score_submissions
        (id, participant_id, quiz_id, quiz_date, display_key, client_hash, answer_hash, score, total_items, duration_ms, flagged, flag_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      submissionId,
      participantId,
      quiz.id,
      quizDate,
      displayKey,
      clientHash,
      answerHash,
      score,
      TOTAL_DAILY_ITEMS,
      durationMs,
      flagged ? 1 : 0,
      flagReason
    )
    .run();

  const accepted = (submission.meta?.changes || 0) > 0;

  if (accepted) {
    await env.DB
      .prepare(`
        UPDATE participants
        SET display_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(displayName, participantId)
      .run();

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
      SELECT score, total_items AS totalItems, duration_ms AS durationMs, flagged, flag_reason AS flagReason, submitted_at AS submittedAt
      FROM score_submissions
      WHERE participant_id = ? AND quiz_id = ?
    `)
    .bind(participantId, quiz.id)
    .first();

  if (!saved) {
    const conflict = await env.DB
      .prepare(`
        SELECT p.display_name AS displayName, s.submitted_at AS submittedAt
        FROM score_submissions s
        JOIN participants p ON p.id = s.participant_id
        WHERE s.quiz_id = ?
          AND (s.display_key = ? OR s.client_hash = ?)
        LIMIT 1
      `)
      .bind(quiz.id, displayKey, clientHash)
      .first();
    return json({
      accepted: false,
      quizDate,
      score,
      totalItems: TOTAL_DAILY_ITEMS,
      durationMs,
      submittedAt: null,
      includedInLeaderboard: false,
      rank: null,
      conflict: conflict ? "A public score is already recorded for this name or device today." : "Today's public score was already recorded."
    });
  }

  const includedInLeaderboard = saved.flagged !== 1;
  const rank = saved && includedInLeaderboard
    ? await dailyRank(env.DB, quiz.id, saved.score, saved.durationMs, saved.submittedAt)
    : null;

  return json({
    accepted,
    quizDate,
    score: saved.score,
    totalItems: saved.totalItems,
    durationMs: saved.durationMs,
    submittedAt: saved.submittedAt || null,
    includedInLeaderboard,
    flagReason: saved.flagReason || null,
    rank
  });
}

async function dailyRank(db, quizId, score, durationMs, submittedAt) {
  const row = await db
    .prepare(`
      SELECT COUNT(*) + 1 AS rank
      FROM score_submissions
      WHERE quiz_id = ?
        AND flagged = 0
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
      responseMs: cleanDuration(value.responseMs, MAX_ITEM_RESPONSE_MS)
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

function displayNameKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || null;
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

function publicFlagReasons({ answeredCount, durationMs, score }) {
  const reasons = [];
  if (answeredCount !== TOTAL_DAILY_ITEMS) {
    reasons.push("incomplete answers");
  }
  if (durationMs < MIN_PUBLIC_DURATION_MS) {
    reasons.push("unusually fast completion");
  }
  if (score === TOTAL_DAILY_ITEMS && durationMs < MIN_PERFECT_DURATION_MS) {
    reasons.push("perfect score completed unusually fast");
  }
  return reasons;
}

async function requestClientHash(request, participantId, salt = "xixteen-score-v1") {
  const headers = request.headers;
  const userAgent = headers.get("user-agent") || "unknown-agent";
  const ip = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || "unknown-ip";
  return stableHash([salt, participantId, userAgent, ip].join("|"));
}

async function stableHash(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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

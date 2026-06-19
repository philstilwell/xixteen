export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({ error: "D1 database binding DB is not configured." }, 501);
  }

  const url = new URL(request.url);
  const participantId = cleanId(url.searchParams.get("participantId"));
  if (!participantId) {
    return json({ error: "participantId is required." }, 400);
  }

  const participant = await env.DB
    .prepare(`
      SELECT id, display_name AS displayName, created_at AS createdAt, updated_at AS updatedAt
      FROM participants
      WHERE id = ?
    `)
    .bind(participantId)
    .first();

  if (!participant) {
    return json({
      participant: null,
      skillStats: {},
      dailyScores: {},
      weakestSkills: []
    });
  }

  const [skillRows, scoreRows] = await Promise.all([
    env.DB
      .prepare(`
        SELECT
          skill_id AS skillId,
          attempts,
          correct,
          recent_accuracy AS recentAccuracy,
          mastery_score AS masteryScore,
          last_seen_at AS lastSeenAt
        FROM user_skill_stats
        WHERE participant_id = ?
        ORDER BY mastery_score ASC, attempts DESC
      `)
      .bind(participantId)
      .all(),
    env.DB
      .prepare(`
        SELECT
          quiz_date AS quizDate,
          score,
          total_items AS totalItems,
          duration_ms AS durationMs,
          flagged,
          flag_reason AS flagReason,
          submitted_at AS submittedAt
        FROM score_submissions
        WHERE participant_id = ?
        ORDER BY quiz_date DESC
        LIMIT 60
      `)
      .bind(participantId)
      .all()
  ]);

  const skillStats = {};
  for (const row of skillRows.results || []) {
    skillStats[row.skillId] = {
      attempts: row.attempts,
      correct: row.correct,
      recentAccuracy: row.recentAccuracy,
      masteryScore: row.masteryScore,
      lastSeenAt: row.lastSeenAt
    };
  }

  const dailyScores = {};
  for (const row of scoreRows.results || []) {
    dailyScores[row.quizDate] = {
      score: row.score,
      total: row.totalItems,
      durationMs: row.durationMs,
      submittedAt: row.submittedAt,
      includedInLeaderboard: row.flagged !== 1,
      flagReason: row.flagReason || null
    };
  }

  const weakestSkills = (skillRows.results || [])
    .filter((row) => row.attempts > 0)
    .slice(0, 5)
    .map((row) => ({
      skillId: row.skillId,
      attempts: row.attempts,
      correct: row.correct,
      masteryScore: row.masteryScore
    }));

  return json({
    participant,
    skillStats,
    dailyScores,
    weakestSkills
  });
}

function cleanId(value) {
  const text = String(value || "").trim();
  return /^[A-Za-z0-9_-]{8,80}$/.test(text) ? text : null;
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

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return json({ error: "Public scores are temporarily unavailable." }, 501);
  }

  const url = new URL(request.url);
  const requestedDate = url.searchParams.get("date");
  const date = requestedDate === null ? todayIso() : cleanDate(requestedDate);
  if (!date) return json({ error: "Use a valid calendar date in YYYY-MM-DD format." }, 400);
  const range = url.searchParams.get("range") === "weekly" ? "weekly" : "daily";

  if (range === "weekly") {
    const start = startOfWeek(date);
    const end = addDays(start, 6);
    const rows = await env.DB
      .prepare(`
        SELECT
          p.display_name AS displayName,
          SUM(s.score) AS score,
          SUM(s.total_items) AS totalItems,
          SUM(s.duration_ms) AS durationMs,
          MIN(s.submitted_at) AS submittedAt
        FROM score_submissions s
        JOIN participants p ON p.id = s.participant_id
        WHERE s.quiz_date BETWEEN ? AND ?
          AND s.flagged = 0
        GROUP BY s.participant_id
        ORDER BY score DESC, durationMs ASC, submittedAt ASC
        LIMIT 20
      `)
      .bind(start, end)
      .all();
    return json({ range, start, end, entries: rows.results || [] });
  }

  const rows = await env.DB
    .prepare(`
      SELECT
        p.display_name AS displayName,
        s.score AS score,
        s.total_items AS totalItems,
        s.duration_ms AS durationMs,
        s.submitted_at AS submittedAt
      FROM score_submissions s
      JOIN participants p ON p.id = s.participant_id
      WHERE s.quiz_date = ?
        AND s.flagged = 0
      ORDER BY s.score DESC, s.duration_ms ASC, s.submitted_at ASC
      LIMIT 20
    `)
    .bind(date)
    .all();

  return json({ range, date, entries: rows.results || [] });
}

function cleanDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

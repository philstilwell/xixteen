import { mkdir, readFile, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const DATABASE_DIR = new URL("../database/", import.meta.url);

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const quizzes = JSON.parse(await readFile(new URL("daily-quizzes.json", DATA_DIR), "utf8"));

const lines = [
  "-- Refresh generated daily quiz placements before inserting the current schedule.",
  "-- User scores, attempts, participants, and skill stats are intentionally left intact.",
  "DELETE FROM daily_quiz_items;"
];

for (const skill of skills) {
  lines.push(`INSERT INTO skills (id, code, ordinal, name, public_label, testable_task, description) VALUES (${sql(skill.id)}, ${sql(skill.code)}, ${skill.ordinal}, ${sql(skill.name)}, ${sql(skill.publicLabel)}, ${sql(skill.testableTask)}, ${sql(skill.description)}) ON CONFLICT(id) DO UPDATE SET code = excluded.code, ordinal = excluded.ordinal, name = excluded.name, public_label = excluded.public_label, testable_task = excluded.testable_task, description = excluded.description;`);
}

for (const item of items) {
  lines.push(`INSERT INTO items (id, skill_id, difficulty, prompt, explanation, status, tags) VALUES (${sql(item.id)}, ${sql(item.skill)}, ${item.difficulty}, ${sql(item.prompt)}, ${sql(item.explanation)}, 'active', ${sql(JSON.stringify(item.tags || []))}) ON CONFLICT(id) DO UPDATE SET skill_id = excluded.skill_id, difficulty = excluded.difficulty, prompt = excluded.prompt, explanation = excluded.explanation, status = excluded.status, tags = excluded.tags;`);
  lines.push(`UPDATE choices SET is_correct = 0 WHERE item_id = ${sql(item.id)};`);
  for (const choice of item.choices) {
    const choiceId = `${item.id}-${choice.id.toLowerCase()}`;
    lines.push(`INSERT INTO choices (id, item_id, choice_key, choice_text, choice_feedback, is_correct) VALUES (${sql(choiceId)}, ${sql(item.id)}, ${sql(choice.id)}, ${sql(choice.text)}, ${sql(item.feedback?.[choice.id] || "")}, ${choice.id === item.answer ? 1 : 0}) ON CONFLICT(id) DO UPDATE SET item_id = excluded.item_id, choice_key = excluded.choice_key, choice_text = excluded.choice_text, choice_feedback = excluded.choice_feedback, is_correct = excluded.is_correct;`);
  }
}

for (const quiz of quizzes) {
  lines.push(`INSERT INTO daily_quizzes (id, quiz_date, status) VALUES (${sql(quiz.id)}, ${sql(quiz.date)}, 'published') ON CONFLICT(id) DO UPDATE SET quiz_date = excluded.quiz_date, status = excluded.status;`);
  for (const entry of quiz.items) {
    lines.push(`INSERT INTO daily_quiz_items (quiz_id, item_id, position) VALUES (${sql(quiz.id)}, ${sql(entry.itemId)}, ${entry.position}) ON CONFLICT(quiz_id, item_id) DO UPDATE SET position = excluded.position;`);
  }
}

await mkdir(DATABASE_DIR, { recursive: true });
await writeFile(new URL("seed.sql", DATABASE_DIR), `${lines.join("\n")}\n`);
console.log(`Wrote database/seed.sql with ${items.length} items and ${quizzes.length} daily quizzes.`);

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

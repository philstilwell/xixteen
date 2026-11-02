// Only restore known questions, valid choices, and the exact published daily board.
export function readQuizSession(saved, { itemById, dailyQuizzes, today, articleSlugs = new Set() }) {
  if (!saved || saved.version !== 1 || !['daily', 'practice'].includes(saved.mode)) return null;
  if (!Array.isArray(saved.itemIds) || saved.itemIds.length < 1 || saved.itemIds.length > 24 || new Set(saved.itemIds).size !== saved.itemIds.length) return null;
  const items = saved.itemIds.map(id => itemById.get(id));
  if (items.some(item => !item)) return null;
  if (saved.mode === 'daily') {
    const daily = dailyQuizzes.find(quiz => quiz.date === today);
    if (saved.date !== today || !daily || daily.items.length !== items.length || daily.items.some((entry, index) => entry.itemId !== items[index].id)) return null;
  }
  if (!Number.isInteger(saved.currentIndex) || saved.currentIndex < 0 || saved.currentIndex >= items.length) return null;
  if (!Array.isArray(saved.answers) || saved.answers.length > items.length) return null;
  const answers = new Map();
  for (const entry of saved.answers) {
    if (!Array.isArray(entry) || entry.length !== 2) return null;
    const [id, answer] = entry;
    const item = items.find(item => item.id === id);
    if (!item || answers.has(id) || !answer || !item.choices.some(choice => choice.id === answer.choiceId) || !validTime(answer.responseMs)) return null;
    answers.set(id, { choiceId: answer.choiceId, responseMs: answer.responseMs });
  }
  if (items.some((item, index) => index < saved.currentIndex ? !answers.has(item.id) : index > saved.currentIndex && answers.has(item.id))) return null;
  if (saved.completed && (answers.size !== items.length || saved.currentIndex !== items.length - 1)) return null;
  if (!validTime(saved.elapsedMs) || !validTime(saved.itemElapsedMs)) return null;
  const title = saved.mode === 'daily' ? "Today's XiXteen" : String(saved.title || 'Practice').slice(0, 120);
  return {
    quiz: { mode: saved.mode, title, date: saved.mode === 'daily' ? today : 'Practice', items, completed: saved.completed === true,
      articleSlug: articleSlugs.has(saved.articleSlug) ? saved.articleSlug : null },
    answers, currentIndex: saved.currentIndex, elapsedMs: saved.elapsedMs, itemElapsedMs: saved.itemElapsedMs
  };
}

function validTime(value) { return Number.isFinite(value) && value >= 0 && value <= 365 * 24 * 60 * 60 * 1000; }

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { onRequestPost as score } from '../functions/api/score.js';
import { onRequestGet as leaderboard } from '../functions/api/leaderboard.js';

// Exercise the actual browser functions without starting the page or its network requests.
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('../src/main.js');
const withoutBoot = source.slice(0, source.indexOf('init().catch')) + source.slice(source.indexOf('async function init()'));
const storageStatus = { hidden: true };
const fixedTime = 1793588400000;
class FixedDate extends Date { static now() { return fixedTime; } }
const harness = runInNewContext(`${withoutBoot.replaceAll('import.meta.url', JSON.stringify(new URL('../src/main.js', import.meta.url).href))}
  setMode = () => {};
  startQuiz = quiz => { state.quiz = quiz; };
  ({ state, startDaily, startSkillPractice, buildAdaptivePracticeItems, choosePracticeItem, saveProfile, localSaveMessage });
`, {
  document: { querySelector: () => storageStatus },
  Date: FixedDate,
  localStorage: { setItem() { throw new Error('Storage denied'); } }
});
const { state, startDaily, startSkillPractice, buildAdaptivePracticeItems, choosePracticeItem, saveProfile, localSaveMessage } = harness;
state.skills = JSON.parse(read('../data/skills.json'));
state.items = JSON.parse(read('../data/question-bank.json'));
state.skillById = new Map(state.skills.map(skill => [skill.id, skill]));
state.itemsBySkill = new Map(state.skills.map(skill => [skill.id, state.items.filter(item => item.skill === skill.id)]));
state.profile = { skillStats: {}, seenItems: [] };
let sets = 0;
for (const skill of state.skills) {
  for (const difficulty of [null, 1, 2, 3, 4, 5]) {
    for (const count of [8, 16, 24]) {
      startSkillPractice(skill.id, { count, difficultyOverride: difficulty });
      const items = state.quiz.items;
      assert.equal(items.length, count, `${skill.id}: incomplete set`);
      assert.equal(new Set(items.map(item => item.id)).size, count, `${skill.id}: repeated question`);
      assert(items.every(item => item.skill === skill.id));
      if (difficulty) assert(items.every(item => item.difficulty === difficulty));
      sets++;
    }
  }
}
for (const difficulty of [null, 1, 2, 3, 4, 5]) {
  const items = buildAdaptivePracticeItems(24, difficulty);
  assert.equal(items.length, 24);
  assert.equal(new Set(items.map(item => item.id)).size, 24);
  sets++;
}
const skill = state.skills[0].id;
const pool = state.itemsBySkill.get(skill).filter(item => item.difficulty === 1);
state.profile.seenItems = pool.slice(0, 31).map(item => item.id);
const usedIds = new Set();
const first = choosePracticeItem(skill, 0, { difficultyOverride: 1, usedIds });
assert.equal(first.id, pool[31].id, 'Prefer unseen questions');
const second = choosePracticeItem(skill, 1, { difficultyOverride: 1, usedIds });
assert(second && second.id !== first.id, 'Reuse older questions only after fresh choices run out');
saveProfile();
assert.equal(storageStatus.hidden, false, 'Show the storage warning');
assert.equal(state.storageAvailable, false);
assert(!localSaveMessage().startsWith('Saved'), 'Do not claim unsaved results were saved');
state.dailyQuizzes = [{ date: '2000-01-01', items: [{itemId: state.items[0].id}] }];
startDaily();
assert.equal(state.quiz.title, 'Daily board unavailable');
assert.equal(state.quiz.items.length, 0, 'Do not substitute an old board for today');

const untouchedDB = { prepare() { throw new Error('Invalid request reached the database'); } };
const post = body => new Request('https://xixteen.test/api/score', { method: 'POST', body: JSON.stringify(body) });
for (const body of [null, [], 4, 'text', {}, {
  participantId: 'audit-test', displayName: 'Audit', quizDate: '2026-02-30', answers: {}
}, {
  participantId: 'audit-test', displayName: 'Audit', quizDate: '2026-11-01', answers: []
}]) assert.equal((await score({ request: post(body), env: { DB: untouchedDB } })).status, 400);
const get = date => new Request(`https://xixteen.test/api/leaderboard?range=weekly&date=${date}`);
for (const date of ['', '2026-99-99', '2026-02-29', '2026-04-31', 'not-a-date']) {
  assert.equal((await leaderboard({ request: get(date), env: { DB: untouchedDB } })).status, 400);
}
let bounds;
const db = { prepare() { return { bind(...args) { bounds = args; return this; }, async all() { return { results: [] }; } }; } };
assert.equal((await leaderboard({ request: get('2028-02-29'), env: { DB: db } })).status, 200);
assert.deepEqual(bounds, ['2028-02-28', '2028-03-05']);
assert.equal((await leaderboard({ request: get('2026-11-01'), env: {} })).status, 501);
console.log(`Checked ${sets} unique practice sets, exhausted fresh questions, blocked storage, missing daily schedules, and invalid API inputs.`);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readQuizSession } from '../src/quiz-session.js';
import { runInNewContext } from 'node:vm';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const items = read('../data/question-bank.json');
const dailyQuizzes = read('../data/daily-quizzes.json');
const daily = dailyQuizzes[0];
const itemById = new Map(items.map(item => [item.id, item]));
const context = { itemById, dailyQuizzes, today: daily.date, articleSlugs: new Set(['ai-advice-and-your-judgment']) };
const snapshot = {
  version: 1, mode: 'daily', date: daily.date, title: 'Daily', itemIds: daily.items.map(entry => entry.itemId),
  answers: daily.items.slice(0, 2).map(entry => [entry.itemId, { choiceId: 'A', responseMs: 1200 }]),
  currentIndex: 1, elapsedMs: 8000, itemElapsedMs: 3000, completed: false
};
const restored = readQuizSession(JSON.parse(JSON.stringify(snapshot)), context);
assert.equal(restored.answers.size, 2);
assert.equal(restored.currentIndex, 1, 'Return to the selected answer and its feedback');
assert.equal(restored.elapsedMs, 8000, 'Restoring does not add time spent away');
assert.equal(restored.quiz.items[1].id, daily.items[1].itemId);
const complete = { ...snapshot, currentIndex: 15, completed: true, answers: daily.items.map(entry => [entry.itemId, { choiceId: 'A', responseMs: 1200 }]) };
assert.equal(readQuizSession(complete, context).quiz.completed, true, 'Completed sessions restore as completed');
const invalid = [null, {}, {...snapshot,version:2}, {...snapshot,date:'2000-01-01'}, {...snapshot,itemIds:[]}, {...snapshot,itemIds:['missing']}, {...snapshot,itemIds:daily.items.map(()=>daily.items[0].itemId)}, {...snapshot,currentIndex:3}, {...snapshot,currentIndex:-1}, {...snapshot,elapsedMs:NaN}, {...snapshot,elapsedMs:-1}, {...snapshot,completed:true}, {...snapshot,answers:[[daily.items[0].itemId,{choiceId:'Z',responseMs:0}]]}];
for(const value of invalid) assert.equal(readQuizSession(value, context), null, 'Reject an invalid or stale snapshot');
assert.equal(readQuizSession(snapshot,{...context,today:'2026-06-19'}),null,'Daily sessions expire when the day changes');
assert.equal(readQuizSession(snapshot,{...context,dailyQuizzes:[{...daily,items:[...daily.items].reverse()}]}),null,'Daily questions must still match the published schedule');
const practice = { ...snapshot, mode:'practice', date:'Practice', articleSlug:'ai-advice-and-your-judgment' };
assert.equal(readQuizSession(practice,{...context,today:'2027-01-01'}).quiz.articleSlug,practice.articleSlug,'Practice and article returns survive date changes');
assert.equal(readQuizSession({...practice,articleSlug:'https://untrusted.invalid'},context).quiz.articleSlug,null);
console.log('Checked saved answers, completion, elapsed time, date changes, changed questions, article returns, and corrupt session data.');

// Run the page's real session lifecycle with a controllable clock and browser storage.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*quiz-session.*;\n/m,'');
const withoutBoot=source.slice(0,source.indexOf('init().catch'))+source.slice(source.indexOf('async function init()'));
const storage=new Map();
let now=0;
class SessionDate extends Date { constructor(...args) { super(...(args.length?args:['2026-11-02T12:00:00Z'])); } }
function pageHarness() {
  const harness=runInNewContext(`${withoutBoot.replaceAll('import.meta.url',JSON.stringify(new URL('../src/main.js',import.meta.url).href))}
    setMode=renderGallery=renderQuiz=renderResults=renderProfile=scrollToWorkbench=focusQuizContent=updateArticleReturn=renderSessionStatus=()=>{};
    renderLeaderboard=syncServerProfile=async()=>{};
    ({state,loadProfile,startDaily,startSkillPractice,chooseAnswer,goNext,finishQuiz,resumeSession,pauseQuizClock,persistSession,restartSession,saveProfile});
  `, { readQuizSession, Date:SessionDate, crypto, performance:{now:()=>now},
    document:{hidden:false,querySelector:()=>({hidden:true})},
    window:{location:{hostname:'localhost',port:'8765'},confirm:()=>true},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)} });
  const skills=read('../data/skills.json');
  Object.assign(harness.state,{skills,items,dailyQuizzes,itemById,
    skillById:new Map(skills.map(skill=>[skill.id,skill])),
    itemsBySkill:new Map(skills.map(skill=>[skill.id,items.filter(item=>item.skill===skill.id)])),
    profile:harness.loadProfile()});
  return harness;
}
const page=pageHarness();
page.startDaily({scroll:false});
now=1000;page.chooseAnswer('A');
now=2000;page.goNext();
now=3000;page.pauseQuizClock();page.persistSession();
now+=3600000;page.resumeSession('daily',{scroll:false});
assert.equal(page.state.elapsedMs,3000,'An hour away does not inflate active time');
assert.equal(page.state.currentIndex,1);
page.chooseAnswer('B');
page.startSkillPractice('define_terms',{count:8,scroll:false});
page.chooseAnswer('C');page.goNext();
const practiceIds=page.state.quiz.items.map(item=>item.id).join(',');
page.resumeSession('daily',{scroll:false});
assert.equal(page.state.answers.size,2);
assert.equal(page.state.currentIndex,1);
page.resumeSession('practice',{scroll:false});
assert.equal(page.state.quiz.items.map(item=>item.id).join(','),practiceIds);
assert.equal(page.state.answers.size,1);
assert.equal(page.state.currentIndex,1);
const reloaded=pageHarness();
assert(reloaded.resumeSession('practice',{scroll:false}));
assert.equal(reloaded.state.quiz.items.map(item=>item.id).join(','),practiceIds);
assert.equal(reloaded.state.currentIndex,1);
for(let index=1;index<8;index++) {now+=1000;reloaded.chooseAnswer('A');reloaded.goNext();}
await Promise.resolve();
assert.equal(reloaded.state.profile.skillStats.define_terms.attempts,8);
assert.equal(reloaded.state.profile.sessions.practice.completed,true);
const reviewed=pageHarness();
reviewed.resumeSession('practice',{scroll:false});
assert.equal(reviewed.state.profile.skillStats.define_terms.attempts,8,'Reviewing completed results does not record them again');
reviewed.restartSession();
assert.equal(reviewed.state.answers.size,0);
assert.equal(reviewed.state.profile.sessions.daily.answers.length,2,'Restarting practice preserves the daily board');
assert.equal(reviewed.state.profile.skillStats.define_terms.attempts,8,'Restarting does not erase accumulated progress');
const otherTab=pageHarness();
reviewed.chooseAnswer('A');
const latest=storage.get('xixteen-profile-v1');
otherTab.saveProfile();
assert.equal(otherTab.state.storageConflict,true,'A stale tab must not overwrite newer saved progress');
assert.equal(storage.get('xixteen-profile-v1'),latest);
console.log('Checked real save/resume/reload, separate modes, paused timing, completion without double counting, restart, and conflicting tabs.');

import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export function planScheduleSync(quizzes, rows) {
  const existing=new Map();
  for(const row of rows) {
    const entry=existing.get(row.date)||{id:row.id,status:row.status,items:[]};
    if(row.itemId) entry.items.push({itemId:row.itemId,position:row.position});
    existing.set(row.date,entry);
  }
  return quizzes.filter(quiz=>{
    const old=existing.get(quiz.date);
    if(!old) return true;
    const items=[...old.items].sort((a,b)=>a.position-b.position);
    if(old.id!==quiz.id || old.status!=='published' || items.length!==quiz.items.length || items.some((item,index)=>item.itemId!==quiz.items[index].itemId || item.position!==quiz.items[index].position)) throw new Error(`Published database board differs on ${quiz.date}; refusing to overwrite it.`);
    return false;
  });
}

export function scheduleSQL(quizzes) {
  const quote=value=>`'${String(value).replaceAll("'","''")}'`;
  return quizzes.flatMap(quiz=>[
    `INSERT INTO daily_quizzes (id,quiz_date,status) VALUES (${quote(quiz.id)},${quote(quiz.date)},'published') ON CONFLICT DO NOTHING;`,
    ...quiz.items.map(item=>`INSERT INTO daily_quiz_items (quiz_id,item_id,position) VALUES (${quote(quiz.id)},${quote(item.itemId)},${item.position}) ON CONFLICT DO NOTHING;`)
  ]).join('\n')+'\n';
}

function wrangler(args) {
  const script=process.env.XIXTEEN_WRANGLER_BIN;
  const result=spawnSync(script?process.execPath:'wrangler',script?[script,...args]:args,{encoding:'utf8',maxBuffer:32*1024*1024});
  if(result.error) throw new Error('Wrangler is not available. Run this command with your authenticated Wrangler installation on PATH.');
  if(result.status!==0) throw new Error(`Database command failed: ${result.stderr.slice(-3000)} ${result.stdout.slice(-1000)}`);
  return result.stdout;
}
function query(sql) {
  const payload=JSON.parse(wrangler(['d1','execute','xixteen','--remote','--json','--command',sql]));
  if(!Array.isArray(payload)||payload.some(result=>result.success===false)) throw new Error('Database query was not successful.');
  return payload.flatMap(result=>result.results||[]);
}

export function syncDailySchedule(root) {
  const quizzes=JSON.parse(readFileSync(join(root,'data/daily-quizzes.json'),'utf8'));
  const items=JSON.parse(readFileSync(join(root,'data/question-bank.json'),'utf8'));
  const keys=query('SELECT i.id,i.skill_id AS skill,i.difficulty,c.choice_key AS answer FROM items i JOIN choices c ON c.item_id=i.id WHERE c.is_correct=1');
  const keyById=new Map(keys.map(item=>[item.id,item]));
  for(const item of items) {
    const key=keyById.get(item.id);
    if(!key || key.answer!==item.answer || key.skill!==item.skill || key.difficulty!==item.difficulty) throw new Error(`Scoring keys differ for ${item.id}; synchronize the question bank before publishing.`);
  }
  const select='SELECT q.id,q.quiz_date AS date,q.status,d.item_id AS itemId,d.position FROM daily_quizzes q LEFT JOIN daily_quiz_items d ON d.quiz_id=q.id ORDER BY q.quiz_date,d.position';
  const additions=planScheduleSync(quizzes,query(select));
  if(additions.length) {
    const temporary=mkdtempSync(join(tmpdir(),'xixteen-schedule-'));
    try {
      const file=join(temporary,'schedule.sql');
      writeFileSync(file,scheduleSQL(additions));
      wrangler(['d1','execute','xixteen','--remote','--file',file,'--yes','--json']);
    } finally { rmSync(temporary,{recursive:true,force:true}); }
    if(planScheduleSync(quizzes,query(select)).length) throw new Error('Daily schedule synchronization was incomplete.');
  }
  console.log(`Verified scoring keys and ${quizzes.length} database boards; added ${additions.length} dates without changing existing scores or boards.`);
}

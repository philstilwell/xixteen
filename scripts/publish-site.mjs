import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { syncDailySchedule } from './sync-daily-schedule.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
function run(command,args,{capture=false}={}) {
  const result=spawnSync(command,args,{encoding:'utf8',stdio:capture?'pipe':'inherit'});
  if(result.error || result.status!==0) throw new Error(`${command} ${args.join(' ')} failed. Publication stopped.`);
  return result.stdout?.trim();
}
run('npm',['run','check']);
if(run('git',['status','--porcelain'],{capture:true})) throw new Error('Commit the checked changes and remove temporary files before publishing.');
run('git',['fetch','origin']);
const commit=run('git',['rev-parse','HEAD'],{capture:true});
if(commit!==run('git',['rev-parse','origin/main'],{capture:true})) throw new Error('Push the checked commit to origin/main before publishing.');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const dataFiles=['data/question-bank.json','data/daily-quizzes.json'];
const unchangedData=await Promise.all(dataFiles.map(async file=>{
  const response=await fetch(`https://xixteen.com/${file}?release-check=${commit}`,{signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok) throw new Error(`Cannot verify the live ${file}; publication stopped.`);
  return hash(Buffer.from(await response.arrayBuffer()))===hash(readFileSync(new URL('../'+file,import.meta.url)));
}));
if(unchangedData.every(Boolean)) console.log('Question bank and schedule match the live site; no database changes are needed.');
else syncDailySchedule(root);
const script=process.env.XIXTEEN_WRANGLER_BIN;
const args=['pages','deploy','.','--project-name','xixteen','--branch','main','--commit-hash',commit];
run(script?process.execPath:'wrangler',script?[script,...args]:args);
const files=['learners/index.html','src/main.js','src/quiz-session.js','src/styles.css','src/site-navigation.css','about/index.html','classroom-use/index.html','privacy/index.html','pilot/index.html','data/daily-quizzes.json','sitemap.xml'];
let verified=false;
for(let attempt=0;attempt<15;attempt++) {
  try {
    const checks=await Promise.all(files.map(async file=>{
      const path=file.replace(/index\.html$/,'');
      const response=await fetch(`https://xixteen.com/${path}?release=${commit}`,{signal:AbortSignal.timeout(10000),cache:'no-store'});
      return response.ok && hash(Buffer.from(await response.arrayBuffer()))===hash(readFileSync(new URL('../'+file,import.meta.url)));
    }));
    const missing=await fetch(`https://xixteen.com/release-check-missing-${commit}`,{signal:AbortSignal.timeout(10000)});
    if(checks.every(Boolean) && missing.status===404) {verified=true;break;}
  } catch { /* Allow the custom domain a short propagation window. */ }
  await new Promise(resolve=>setTimeout(resolve,1000));
}
if(!verified) throw new Error('The deployment finished, but the custom domain did not yet match the checked files. Verify xixteen.com before announcing publication.');
console.log(`Published and verified https://xixteen.com from ${commit}.`);

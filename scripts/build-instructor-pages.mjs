import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { renderNavigation } from './site-navigation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const { packs } = JSON.parse(readFileSync(join(root, 'data/teaching-packs.json'), 'utf8'));
const resources = JSON.parse(readFileSync(join(root, 'data/teacher-resources.json'), 'utf8'));
const skills = JSON.parse(readFileSync(join(root, 'data/skills.json'), 'utf8'));
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const list = items => `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`;
const lessonHref = pack => `/instructors/lessons/${pack.slug}/`;
const studentHref = pack => `${lessonHref(pack)}student/`;
const output = new Map();
const areas = [
  { id: 'claims', label: 'Claims & arguments', lastSkill: 4 },
  { id: 'evidence', label: 'Evidence & logic', lastSkill: 9 },
  { id: 'numbers', label: 'Numbers & explanations', lastSkill: 13 },
  { id: 'judgment', label: 'Judgment & decisions', lastSkill: 16 }
];
const packArea = pack => areas.find(area => Number(pack.skillCode) <= area.lastSkill).id;
if (packs.length !== skills.length || new Set(packs.map(pack => pack.skillId)).size !== skills.length || new Set(packs.map(pack => pack.slug)).size !== packs.length) {
  throw new Error('Provide one complete, uniquely named teaching pack for each of the 16 skills.');
}
packs.sort((a, b) => Number(a.skillCode) - Number(b.skillCode));

function page(title, description, path, content, { student = false, pack, scripts = [] } = {}) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | XiXteen</title><meta name="description" content="${esc(description)}"><meta name="theme-color" content="#f7f3ea"><link rel="canonical" href="https://xixteen.com${path}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/src/education.css?v=2"><link rel="stylesheet" href="/src/site-navigation.css?v=1"><script src="/src/site-navigation.js?v=1" type="module"></script>${scripts.map(src => `<script src="${src}" type="module"></script>`).join('')}</head>
<body${student ? ' class="student-view"' : ''}>
<a class="skip-link" href="#main-content">Skip to ${student ? 'activities' : 'content'}</a>
${renderNavigation(student ? 'student' : 'instructors', { pack, resources })}
${content}
<footer class="edu-footer"><p>XiXteen · Sixteen skills for clearer thinking.</p><a href="/">Choose your path</a>${student ? '' : '<a href="/articles/">Lessons &amp; case studies</a>'}</footer>
</body></html>
`;
}

function activity(activity, id, { student = false, step = '' } = {}) {
  return `<section id="${id}" class="activity-block" aria-labelledby="${id}-heading"><p class="eyebrow">${step}</p><h2 id="${id}-heading">${esc(activity.title)}</h2>
<p class="activity-scenario" id="${id}-scenario">${esc(activity.scenario)}</p>
<p id="${id}-output"><strong>Your task:</strong> ${esc(activity.output)}</p>
<ol id="${id}-steps">${activity.steps.map(text => `<li>${esc(text)}</li>`).join('')}</ol>
<p class="activity-check"><strong>Before you finish:</strong> ${esc(activity.check)}</p>
${student ? `<label class="student-response" for="${id}-response">Your response<textarea id="${id}-response" aria-describedby="${id}-scenario ${id}-output ${id}-steps ${id}-privacy"></textarea><small id="${id}-privacy">Your writing stays on this page. It is not submitted or saved; copy it before leaving.</small></label>` : `<details class="model-answer"><summary>Model answer &amp; explanation</summary><p>${esc(activity.modelAnswer)}</p><p><strong>Why this works:</strong> ${esc(activity.whyAdequate)}</p></details>`}
</section>`;
}

function lesson(pack) {
  return page(pack.title, pack.subtitle, lessonHref(pack), `<main id="main-content" class="lesson-main">
<p class="breadcrumb"><a href="/instructors/#teaching-packs">← All teaching packs</a></p>
<section class="lesson-hero"><p class="eyebrow">${esc(pack.skillCode)} · ${esc(pack.skillLabel)}</p><h1>${esc(pack.title)}</h1><p class="lede">${esc(pack.subtitle)}</p><div class="lesson-facts"><span>${pack.durationMinutes} min suggested</span><span>${pack.prepMinutes} min preparation</span><span>${esc(pack.level)}</span><span>${esc(pack.audience)}</span></div></section>
<div class="lesson-layout"><div class="lesson-content">
<section id="overview"><h2>What students will learn</h2>${list(pack.objectives)}<p><strong>Prerequisites:</strong> ${esc(pack.prerequisites)}</p><p><strong>Format:</strong> ${esc(pack.format)}</p><p class="source-note">The scenarios are invented for reasoning practice. Suggested timings can be adjusted to your class.</p><h3>Materials</h3>${list(pack.materials)}<h3>Before class</h3>${list(pack.preparation)}<h3>Useful words</h3>${list(pack.vocabulary.map(v => `${v.term}: ${v.definition}`))}</section>
<section id="teaching-plan"><h2>Your teaching plan</h2><ol class="timeline">${pack.timeline.map(t => `<li><span class="minutes">${t.minutes} min</span><div><strong>${esc(t.title)}</strong><p>${esc(t.instructions)}</p></div></li>`).join('')}</ol></section>
${activity(pack.warmup, 'warm-up', {step: '01 / Warm-up'})}
${activity(pack.activity, 'main-activity', {step: '02 / Main activity'})}
<section id="discussion"><h2>Guide the discussion</h2><ul class="guidance-list">${pack.discussion.map(d => `<li><strong>${esc(d.prompt)}</strong>${esc(d.guidance)}</li>`).join('')}</ul><h3>Common confusions</h3><ul class="guidance-list">${pack.misconceptions.map(m => `<li><strong>${esc(m.misconception)}</strong>${esc(m.response)}</li>`).join('')}</ul></section>
${activity(pack.exitTicket, 'exit-ticket', {step: '03 / Check understanding'})}
<section id="assessment"><h2>Look for these signs of understanding</h2>${list(pack.assessmentCriteria)}<h3>Adapt to your class</h3><ul class="guidance-list">${pack.adaptations.map(a => `<li><strong>${esc(a.label)}</strong>${esc(a.instructions)}</li>`).join('')}</ul></section>
<section id="next-steps"><h2>Keep the skill growing</h2><p><a href="${esc(pack.practiceHref)}">Open eight practice questions for this skill →</a></p>${pack.articleLinks.map(a => `<p><a href="${esc(a.href)}">${esc(a.title)} →</a></p>`).join('')}<p class="source-note">The main activity is adapted from XiXteen's existing ${esc(pack.skillLabel)} classroom exercise. The starter and exit ticket extend the same reasoning move.</p><p class="lesson-template-link"><a href="/docs/lesson-template.md" download>Download the reusable lesson template (Markdown)</a></p></section>
</div><aside class="lesson-sidebar"><h2>Ready to teach</h2><p>Separate student materials, full instructor guidance, and editable text files.</p><a class="button primary" href="${esc(pack.downloads.zip)}" download>Download complete pack ↓</a><a class="button" href="${esc(pack.downloads.studentPdf)}" download>Student handout · PDF</a><a class="button" href="${esc(pack.downloads.instructorPdf)}" download>Instructor guide · PDF</a><p><a href="${esc(pack.downloads.studentMarkdown)}" download>Editable student text</a> · <a href="${esc(pack.downloads.instructorMarkdown)}" download>Editable guide</a></p><a class="button" id="student-view-link" href="${studentHref(pack)}">Open student view ↗</a><button class="button" type="button" data-copy-student-link>Copy student link</button><p id="share-status" role="status" aria-live="polite">The student view contains activities without model answers.</p><nav aria-label="On this page"><a href="#overview">Learning goals &amp; prep</a><a href="#teaching-plan">Teaching plan</a><a href="#warm-up">Warm-up</a><a href="#main-activity">Main activity</a><a href="#discussion">Discussion</a><a href="#exit-ticket">Exit ticket</a><a href="#assessment">Assessment &amp; adaptations</a></nav></aside></div>
</main>`, { pack, scripts: ['/src/lesson.js'] });
}

function student(pack) {
  return page(`${pack.title} — Student activity`, pack.subtitle, studentHref(pack), `<main id="main-content" class="lesson-main"><section class="lesson-hero"><p class="eyebrow">Student activity · ${esc(pack.skillCode)} ${esc(pack.skillLabel)}</p><h1>${esc(pack.title)}</h1><p class="lede">${esc(pack.subtitle)}</p><p class="student-only-note">All scenarios are invented for reasoning practice. Work through each task using only the supplied facts. You can write on paper or use the response boxes. Responses are not saved or submitted.</p><div class="action-row"><a class="button" href="${esc(pack.downloads.studentPdf)}" download>Download handout · PDF</a><button class="button print-button" type="button" data-print>Print this page</button></div></section><div class="lesson-layout"><div class="lesson-content"><section><h2>Words to use</h2>${list(pack.vocabulary.map(v => `${v.term}: ${v.definition}`))}</section>${activity(pack.warmup, 'warm-up', {student: true, step: '01 / Warm-up'})}${activity(pack.activity, 'main-activity', {student: true, step: '02 / Main activity'})}${activity(pack.exitTicket, 'exit-ticket', {student: true, step: '03 / Check your understanding'})}<section><h2>Before you finish</h2>${list(pack.assessmentCriteria)}<p>Follow your instructor's directions for sharing your answers.</p></section></div></div></main>`, {student: true, pack, scripts: ['/src/lesson.js']});
}

function card(pack) {
  return `<article class="pack-card" data-pack="${pack.slug}" data-minutes="${pack.durationMinutes}" data-area="${packArea(pack)}" data-search="${esc([`Skill ${pack.skillCode}`, pack.title, pack.subtitle, pack.skillLabel, skills.find(skill => skill.id === pack.skillId)?.name, ...pack.objectives, pack.level, pack.audience].join(' '))}"><div class="pack-visual"><img src="/assets/skills/${pack.skillId}.webp" alt="" width="72" height="72" loading="lazy"><span class="pack-code">SKILL ${pack.skillCode}<br>${esc(pack.skillLabel)}</span></div><div class="pack-body"><h3><a href="${lessonHref(pack)}">${esc(pack.title)}</a></h3><p>${esc(pack.subtitle)}</p><div class="pack-meta"><span>${pack.durationMinutes} min suggested</span><span>${pack.prepMinutes} min prep</span><span>${esc(pack.level)}</span></div><a class="pack-link" href="${lessonHref(pack)}">Explore the teaching pack →</a><p class="pack-contents">Student handout · Instructor guide · Editable files</p></div></article>`;
}

const home = `<main id="main-content" class="edu-main"><section class="instructor-hero"><div><p class="eyebrow">Critical thinking, ready to teach</p><h1>Less prep.<br>More thoughtful<br>classrooms.</h1><p class="lede">Give your students the tools to question a claim, weigh the evidence, and explain their thinking. Start with a complete teaching pack.</p><div class="action-row"><a class="button primary" href="#teaching-packs">Find your next lesson ↓</a><a class="button" href="#skills">Explore the 16 skills</a></div></div><figure class="instructor-art"><img src="/assets/gateway/instructors-v2.webp" width="1536" height="1024" alt="An instructor and students examining a clear argument map in a contemporary classroom."><figcaption><strong>A clear plan. Room for good questions.</strong>Student activities, model answers, and practical teaching guidance.</figcaption></figure></section>
<section class="teaching-library" id="teaching-packs" aria-labelledby="packs-title"><div class="section-heading"><div><p class="eyebrow">Your next class, sorted</p><h2 id="packs-title">A complete pack for every skill</h2></div><p>Choose a lesson, preview the activities, and take the materials into class. Each pack stands on its own.</p></div><div class="action-row"><a class="button primary" href="/output/teaching-packs/xixteen-all-16-teaching-packs.zip" download aria-describedby="collection-description">Download all 16 teaching packs <span aria-hidden="true">↓</span></a><span class="source-note" id="collection-description">One ZIP · 32 PDFs + editable files · Organized by skill</span></div><div class="library-filters" hidden><label>Search skills and topics<input id="lesson-search" type="search" placeholder="Search all 16 thinking skills"></label><label>Skill area<select id="lesson-area"><option value="all">All skill areas</option>${areas.map(area => `<option value="${area.id}">${esc(area.label)}</option>`).join('')}</select></label><label>Available class time<select id="lesson-duration"><option value="all">Any duration</option>${[...new Set(packs.map(pack => pack.durationMinutes))].sort((a,b)=>a-b).map(minutes => `<option value="${minutes}">Up to ${minutes} minutes</option>`).join('')}</select></label></div><p class="resource-count" id="resource-count" role="status" aria-live="polite">${packs.length} teaching packs</p><div class="pack-grid">${packs.map(card).join('')}</div><div id="library-empty" hidden><p>No packs match those choices.</p><button class="button" type="button" id="reset-filters">Show all teaching packs</button></div></section>
<section class="start-strip" aria-label="How to use a teaching pack"><div><span>01 / CHOOSE</span><h3>Start with the thinking skill</h3><p>Check the learning goals, suggested time, and class format.</p></div><div><span>02 / PREPARE</span><h3>Open the instructor guide</h3><p>Read the short teaching sequence and model answers. Print or share the student activity.</p></div><div><span>03 / TEACH</span><h3>Let the reasoning do the work</h3><p>Use the warm-up, guided task, and exit ticket to see how students' explanations develop.</p></div></section>
<section id="skills" class="skill-resources" aria-labelledby="skills-title"><div class="section-heading"><div><p class="eyebrow">The wider collection</p><h2 id="skills-title">Sixteen skills. Many ways in.</h2></div><p>Each reference packet includes a guided exercise, model answer, and 160 questions with feedback. These reference PDFs contain answers.</p></div><div class="skill-grid">${resources.skills.map(skill => `<article class="skill-resource"><span class="skill-number">${skill.code} / THINKING SKILL</span><h3>${esc(skill.publicLabel)}</h3><a href="/${skill.href}">Reference PDF ↓</a><a href="/learners/?practice=${skill.id}#workbench">Practice ↗</a>${packs.some(p=>p.skillId===skill.id)?`<a href="${lessonHref(packs.find(p=>p.skillId===skill.id))}">Teaching pack →</a>`:''}</article>`).join('')}</div></section>
<section id="resources" class="resource-downloads" aria-labelledby="resources-title"><div class="section-heading"><div><p class="eyebrow">Plan further ahead</p><h2 id="resources-title">The full picture</h2></div></div><div class="download-grid"><article class="download-resource"><h3>The complete curriculum</h3><p>All 16 skill introductions, guided exercises, and 2,560 questions with answer feedback in one instructor reference.</p><a href="/${resources.master.href}">Download curriculum PDF ↓</a></article><article class="download-resource"><h3>How the skills fit together</h3><p>A concise synthesis of the 16 skills as a connected approach to critical thinking.</p><a href="/${resources.synthesis.href}">Download synthesis PDF ↓</a></article></div><p class="lesson-template-link" style="margin-top:20px"><a href="/docs/lesson-template.md" download>Use the consistent lesson template (Markdown) ↓</a> · <a href="/articles/">Explore longer lessons &amp; case studies →</a></p></section></main>`;

output.set('instructors/index.html', page('For Instructors', 'Ready-to-teach critical thinking lessons with student handouts, instructor guides, model answers, and editable teaching packs.', '/instructors/', home, {scripts:['/src/instructor-library.js?v=2']}));
for (const pack of packs) {
  if (!/^[a-z0-9-]+$/.test(pack.slug) || !skills.some(s => s.id === pack.skillId && s.code === pack.skillCode && s.publicLabel === pack.skillLabel)) throw new Error('Invalid teaching pack identity');
  if (pack.timeline.reduce((sum, step) => sum + step.minutes, 0) !== pack.durationMinutes) throw new Error(`${pack.slug}: timing does not add up`);
  for (const task of [pack.warmup, pack.activity, pack.exitTicket]) for (const key of ['scenario','output','steps','check','modelAnswer','whyAdequate']) if (!task[key]?.length) throw new Error(`${pack.slug}: missing ${key}`);
  output.set(`instructors/lessons/${pack.slug}/index.html`, lesson(pack));
  output.set(`instructors/lessons/${pack.slug}/student/index.html`, student(pack));
}
// The learner page remains hand-authored except for its shared navigation.
const learnerSource = readFileSync(join(root, 'learners/index.html'), 'utf8');
const navigationSlot = /<!-- site-navigation:start -->[\s\S]*?<!-- site-navigation:end -->/;
if (!navigationSlot.test(learnerSource)) throw new Error('Learner navigation slot is missing');
output.set('learners/index.html', learnerSource.replace(navigationSlot, `<!-- site-navigation:start -->\n    ${renderNavigation('learners')}\n    <!-- site-navigation:end -->`));
for (const [path, content] of output) {
  const target = join(root, path);
  if (check) {
    if (!existsSync(target) || readFileSync(target, 'utf8') !== content) throw new Error(`${path} is stale; run npm run instructors:build`);
  } else {
    mkdirSync(dirname(target), {recursive:true});
    writeFileSync(target, content);
  }
}
console.log(`${check?'Checked':'Built'} instructor homepage and ${packs.length} teaching packs with separate student pages.`);

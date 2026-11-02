import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderNavigation, renderFooter } from './site-navigation.mjs';
import { socialMetadata } from './site-meta.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const check = process.argv.includes('--check');
const contact = 'https://github.com/philstilwell/xixteen/issues/new?template=site-feedback.yml';
const pages = [
  ['about', 'About & contact', 'Meet XiXteen: sixteen reasoning skills, daily practice, and adaptable classroom lessons by Phil Stilwell.', `
<p class="lede">XiXteen helps people practise sixteen reasoning skills: clarifying claims, evaluating evidence, handling uncertainty, and explaining a judgment.</p>
<section><h2>Who makes XiXteen?</h2><p>XiXteen is created and maintained by Phil Stilwell. The site brings together short multiple-choice practice, longer lessons and case studies, and teaching packs with separate student and instructor materials.</p><p>Illustrations created with ImageGen are identified on the site. Invented teaching scenarios are labelled as such; they are examples for reasoning practice, not research findings.</p></section>
<section><h2>Choose your starting point</h2><ul><li><a href="/learners/">For learners:</a> one daily question per skill, focused practice, explanatory feedback, and progress saved on your device.</li><li><a href="/instructors/">For instructors:</a> teaching plans, student activities, model answers, PDFs, and editable text.</li><li><a href="/articles/">Lessons and case studies:</a> work through an idea in more depth.</li></ul></section>
<section><h2>What progress labels mean</h2><p>The skill map describes your answers on this site. It is not a standardized assessment of intelligence or critical-thinking ability. Difficulty levels and suggested lesson times are provisional. A handful of questions is not enough to establish mastery.</p><p><a href="/pilot/">Help test a lesson</a> by reporting confusing questions, timing, and how well students can apply the reasoning to another example.</p></section>
<section id="contact"><h2>Contact and feedback</h2><p><a href="${contact}">Send a question, correction, or classroom-use request</a> through XiXteen's GitHub feedback form. A GitHub account is required. Reports are public, so please do not include student names, private work, contact details, or device identifiers.</p><p>Include the page address or question ID and explain what needs attention. Please use the same route for requests beyond the <a href="/classroom-use/">classroom-use permission</a>.</p></section>`],
  ['classroom-use', 'Classroom use & adaptation', 'Use and adapt XiXteen teaching materials free of charge with credit. Commercial resale is not permitted.', `
<p class="lede">You may use XiXteen's original teaching materials in your classroom and adapt them for your students, free of charge, with credit. Commercial resale is not permitted.</p>
<section><h2>You may</h2><ul><li>Download and print student handouts, instructor guides, and reference materials for your classes.</li><li>Share the materials with your students, including through your class learning platform.</li><li>Adapt the wording, examples, level, format, or timing for your teaching.</li></ul></section>
<section><h2>Please give credit</h2><p>Keep a credit to Phil Stilwell and XiXteen, with a link to <a href="https://xixteen.com/">xixteen.com</a>. If you change a resource, identify it as an adaptation.</p><p class="notice">Suggested credit: “Adapted from XiXteen by Phil Stilwell — xixteen.com. Changes made by [your name].” For an unchanged resource, omit “Adapted from” and the changes note.</p></section>
<section><h2>Limits</h2><p>Do not sell or resell XiXteen materials or adaptations. This permission concerns XiXteen's original educational materials; it does not grant rights to third-party sources, quotations, or linked content. Those remain subject to their own terms.</p><p>For another use, <a href="/about/#contact">request permission</a>. These classroom terms do not provide a separate software licence for the site's code.</p></section>`],
  ['privacy', 'Privacy & saved progress', 'Understand what XiXteen saves on your device, what public score sharing sends, and what Reset clears.', `
<p class="lede">You can practise without an account or email address. Public score sharing is optional and is off for a new profile.</p>
<section><h2>Saved in this browser</h2><p>The learner page saves your display name, a randomly generated participant identifier, completed practice statistics, and separate daily and practice sessions. A saved session includes its questions, answers, your place, elapsed active time, and any return link to an article.</p><p>This information uses browser storage on this device. It does not follow you to another browser or device. Clearing site data removes it; private browsing or blocked storage can prevent saving. The page shows a notice if saving fails.</p><p>Sessions resume automatically when you return. The daily session applies to its original date; practice can be resumed on a later day. Time spent away from the page or in another mode is paused.</p></section>
<section><h2>Optional public scores</h2><p>If you turn on “Share daily scores” before finishing a daily board, XiXteen sends your participant identifier, display name, quiz date, selected answers, and response times to its scoring service. The service checks the answers, stores the result and skill statistics, and may show your name, score, and completion time on public daily and weekly boards.</p><p>The scoring service also derives a hashed duplicate-check signal from the participant identifier and connection information. The site is hosted by Cloudflare, which processes network information such as IP addresses to serve requests. Loading public boards and checking previously shared results also contacts the scoring service.</p><p>Turning sharing off prevents new submissions. It does not withdraw a score already shared. Practice sessions are not submitted to the public scoreboard.</p></section>
<section><h2>Reset and shared devices</h2><p>“Reset” clears this site's saved profile, sessions, and progress in the current browser, and creates a new local profile. It does not delete scores already sent to the public service. You can also clear this site's data in your browser settings.</p><p>On a shared device, another person using the same browser can see saved progress. Use Reset when you want to clear it. For questions about a public score, use the <a href="/about/#contact">contact route</a> without posting private details.</p></section>
<section><h2>Articles and student response boxes</h2><p>Written responses and quizzes on article and student activity pages stay on the open page. They are not saved or submitted by XiXteen. Copy written work before leaving. This differs from the automatically saved learner quiz sessions.</p></section>
<section><h2>Links and feedback</h2><p>XiXteen does not add advertising or analytics trackers. External reading links and GitHub feedback have their own privacy practices. GitHub feedback is public; do not include identifiable student information.</p><p>Updated November 2, 2026.</p></section>`],
  ['pilot', 'Help test a lesson', 'A practical classroom pilot guide for checking clarity, suggested timing, feedback, and transfer to a new example.', `
<p class="lede">Try one teaching pack and help us learn what works. The materials have automated checks, but their difficulty levels and teaching times have not yet been validated in classrooms.</p>
<p class="notice">This is a guide for collecting feedback, not a claim that a classroom study has been completed.</p>
<section><h2>1. Choose one skill</h2><p>Pick a <a href="/instructors/#teaching-packs">teaching pack</a> appropriate to your group. Record the skill number, a broad learner age band, group size, and whether learners have encountered the topic before. Do not record student names.</p></section>
<section><h2>2. Try the planned sequence</h2><p>Use the warm-up, main activity, discussion, and exit ticket. Record actual time for each part and any extra explanation you needed to give. Note which words or instructions caused hesitation before showing a model answer.</p></section>
<section><h2>3. Check the reasoning</h2><p>Use the pack's visible success checks. Count how many responses explain the relevant reasoning, how many give only an answer, and how many suggest a recurring misunderstanding. Record counts and brief anonymous patterns, not identifiable student work.</p></section>
<section><h2>4. Try a different example</h2><p>Use a fresh scenario for the same skill, or a focused practice question that was not shown in the lesson. Ask learners to explain why their answer follows. Record whether they can use the reasoning without copying the original model. One small group cannot establish a general improvement effect.</p></section>
<section><h2>5. Share what to improve</h2><p><a href="${contact}">Send classroom feedback</a>: the skill or question ID, broad learner group, actual timings, the confusing instruction, and your suggested change. If a question has more than one defensible answer, explain both interpretations.</p><p><a href="/docs/classroom-pilot.md" download>Download the editable observation sheet</a>. You can also print this page using your browser.</p></section>`]
];
const output = new Map();
for (const [slug,title,description,body] of pages) {
  const path=`/${slug}/`;
  output.set(`${slug}/index.html`, `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | XiXteen</title><meta name="description" content="${description}"><link rel="canonical" href="https://xixteen.com${path}"><link rel="icon" type="image/svg+xml" href="/assets/favicon.svg"><link rel="stylesheet" href="/src/education.css?v=2"><link rel="stylesheet" href="/src/site-navigation.css?v=2"><script src="/src/site-navigation.js?v=1" type="module"></script>${socialMetadata(`${title} | XiXteen`,description,path)}</head><body><a class="skip-link" href="#main-content">Skip to content</a>${renderNavigation('general')}<main class="info-main" id="main-content"><p class="eyebrow">XiXteen</p><h1>${title}</h1>${body}</main>${renderFooter()}</body></html>\n`);
}
const handAuthored = ['index.html','learners/index.html','articles/index.html',...JSON.parse(readFileSync(join(root,'data/articles.json'),'utf8')).map(article=>`articles/${article.slug}/index.html`)];
for (const path of handAuthored) {
  let html=readFileSync(join(root,path),'utf8');
  if(path.startsWith('articles/')) {
    const nav=`<!-- site-navigation:start -->\n${renderNavigation('articles')}\n<!-- site-navigation:end -->`;
    html=html.includes('<!-- site-navigation:start -->') ? html.replace(/<!-- site-navigation:start -->[\s\S]*?<!-- site-navigation:end -->/,nav) : html.replace(/<header class="topbar">[\s\S]*?<\/header>/,nav);
    html=html.replace(/articles\.css(?:\?[^" ]*)?/g,'articles.css?v=20261101-nav2');
  }
  if(!html.includes('/src/site-navigation.css')) html=html.replace('</head>','<link rel="stylesheet" href="/src/site-navigation.css?v=2">\n</head>');
  html=html.replace('/src/site-navigation.css?v=1','/src/site-navigation.css?v=2');
  if(path.startsWith('articles/') && !html.includes('/src/site-navigation.js')) html=html.replace('</head>','<script src="/src/site-navigation.js?v=1" type="module"></script>\n</head>');
  html=html.replace(/<footer class="((?:gateway|articles)-footer)">([\s\S]*?)<\/footer>/g, '<div class="$1">$2</div>');
  const footer=`<!-- site-footer:start -->\n${renderFooter()}\n<!-- site-footer:end -->`;
  if(html.includes('<!-- site-footer:start -->')) html=html.replace(/<!-- site-footer:start -->[\s\S]*?<!-- site-footer:end -->/,footer);
  else html=html.replace('</body>',`${footer}\n</body>`);
  const title=html.match(/<title>(.*?)<\/title>/s)[1].replaceAll('&amp;','&');
  const description=html.match(/name="description" content="([^"]*)"/)[1].replaceAll('&amp;','&');
  const canonical=html.match(/rel="canonical" href="https:\/\/xixteen.com([^"]*)"/)[1];
  const meta=socialMetadata(title,description,canonical);
  html=html.includes('<!-- social-meta:start -->') ? html.replace(/<!-- social-meta:start -->[\s\S]*?<!-- social-meta:end -->/,meta) : html.replace('</head>',`${meta}\n</head>`);
  output.set(path,html);
}
function walk(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>['.git','node_modules','.wrangler','tmp','.playwright-cli'].includes(entry.name)?[]:entry.isDirectory()?walk(join(dir,entry.name)):entry.name==='index.html'?[join(dir,entry.name).slice(root.length)]:[]); }
const paths=[...new Set([...walk(root),...output.keys()])].filter(path=>!path.startsWith('tech/') && !path.startsWith('teachers/')).sort();
const urls=paths.map(path=>'https://xixteen.com/'+path.replace(/index\.html$/,''));
output.set('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
for(const [path,content] of output) {
  const target=join(root,path);
  if(check) { if(!existsSync(target)||readFileSync(target,'utf8')!==content) throw new Error(`${path} is stale; run npm run site:build`); }
  else { mkdirSync(dirname(target),{recursive:true}); writeFileSync(target,content); }
}
console.log(`${check?'Checked':'Built'} site information pages, shared article navigation, social previews, and ${urls.length} sitemap URLs.`);

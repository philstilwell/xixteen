import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const ignored = new Set(['.git', 'node_modules', '.wrangler', 'tmp']);
function htmlFiles(dir) {
  return readdirSync(dir, {withFileTypes:true}).flatMap(entry => ignored.has(entry.name) ? [] : entry.isDirectory() ? htmlFiles(join(dir,entry.name)) : entry.name.endsWith('.html') ? [join(dir,entry.name)] : []);
}
const errors = [];
const pages = htmlFiles(root);
let links = 0;
for (const file of pages) {
  const html = readFileSync(file,'utf8');
  const path = relative(root,file);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  if (new Set(ids).size !== ids.length) errors.push(`${path}: duplicate element IDs`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const raw = match[1].replaceAll('&amp;','&');
    if (/^(https?:|data:|mailto:|tel:|\/\/)/.test(raw)) continue;
    const url = new URL(raw, `https://local.test/${path}`);
    let target = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    if (target !== resolve(root) && !target.startsWith(root)) { errors.push(`${path}: reference leaves site`); continue; }
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target,'index.html');
    if (!existsSync(target)) { errors.push(`${path}: missing ${raw}`); continue; }
    if (url.hash && target.endsWith('.html')) {
      const targetHtml = readFileSync(target,'utf8');
      const id = decodeURIComponent(url.hash.slice(1));
      if (!targetHtml.includes(`id="${id}"`)) errors.push(`${path}: missing anchor ${raw}`);
    }
    links++;
  }
}

// Saved practice URLs must keep their exact skill, article return, and section.
const gateway = readFileSync(join(root,'src/gateway.js'),'utf8');
for (const [href,expected] of [
  ['https://xixteen.com/',null],
  ['https://xixteen.com/?practice=define_terms&article=ai-advice-and-your-judgment#workbench','https://xixteen.com/learners/?practice=define_terms&article=ai-advice-and-your-judgment#workbench'],
  ['https://xixteen.com/#skill-gallery','https://xixteen.com/learners/#skill-gallery'],
  ['https://xixteen.com/#teachers','https://xixteen.com/instructors/']
]) {
  let destination = null;
  runInNewContext(gateway,{URL,Set,window:{location:{href,replace:url=>{destination=url;}}}});
  assert.equal(destination, expected, `Legacy link changed: ${href}`);
}
const {packs} = JSON.parse(readFileSync(join(root,'data/teaching-packs.json'),'utf8'));
for (const pack of packs) {
  const html = readFileSync(join(root,`instructors/lessons/${pack.slug}/student/index.html`),'utf8');
  const studentMain = html.match(/<main\b[\s\S]*?<\/main>/)?.[0];
  assert(studentMain && !studentMain.includes('<details'),`${pack.slug}: student activity contains answer reveal`);
  assert(!html.includes('instructor.pdf'),`${pack.slug}: student page links to instructor answers`);
  assert.equal((html.match(/<textarea /g)||[]).length,3,`${pack.slug}: missing response fields`);
  for (const href of Object.values(pack.downloads)) assert(existsSync(join(root,href)),`Missing download: ${href}`);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Checked ${pages.length} HTML pages and ${links} local references, legacy links, and separate student views.`);

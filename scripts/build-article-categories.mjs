import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const checkOnly = process.argv.includes("--check");
const skills = JSON.parse(readFileSync(join(root, "data/skills.json"), "utf8"));
const articles = JSON.parse(readFileSync(join(root, "data/articles.json"), "utf8"));
const skillById = new Map(skills.map((skill) => [skill.id, skill]));
const slugs = new Set();
const pages = new Map();
const indexPath = join(root, "articles/index.html");
pages.set(indexPath, readFileSync(indexPath, "utf8"));

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function practiceLink(skill, homePath) {
  return `<a class="article-category-link" data-skill="${skill.id}" href="${homePath}?practice=${encodeURIComponent(skill.id)}#workbench" aria-label="Practice ${skill.code}: ${escapeHtml(skill.publicLabel)}"><span class="category-code">${skill.code}</span> <span>${escapeHtml(skill.publicLabel)}</span></a>`;
}

function categoryMarkup(article, homePath) {
  const primary = skillById.get(article.primarySkill);
  const related = article.relatedSkills.map((id) => skillById.get(id)).sort((a, b) => a.ordinal - b.ordinal);
  const lines = [
    '<div class="article-category-map" role="group" aria-label="Categories from the 4×4 grid">',
    '  <p class="article-category-heading">Categories from the 4×4 grid</p>',
    '  <p class="article-category-instruction">Select a category to practise that skill.</p>',
    '  <p class="article-category-primary"><span class="category-role">Primary focus</span>',
    `    ${practiceLink(primary, homePath)}</p>`,
  ];
  if (related.length) {
    lines.push('  <p class="article-category-related">Also addresses</p>', '  <ul class="article-category-list" aria-label="Additional grid categories">');
    for (const skill of related) {
      lines.push(`    <li>${practiceLink(skill, homePath)}</li>`);
    }
    lines.push("  </ul>");
  }
  lines.push(`  <a class="article-grid-link" href="${homePath}#skill-gallery">View the 4×4 grid →</a>`, "</div>");
  return lines.join("\n");
}

function replaceCategoryBlock(html, article, homePath, path) {
  const start = `<!-- article-categories:${article.slug} -->`;
  const end = `<!-- /article-categories:${article.slug} -->`;
  if (html.split(start).length !== 2 || html.split(end).length !== 2) {
    throw new Error(`${path}: add exactly one pair of category markers for ${article.slug}.`);
  }
  const first = html.indexOf(start);
  const last = html.indexOf(end, first);
  if (last < first) throw new Error(`${path}: category markers are out of order.`);
  const indent = html.slice(html.lastIndexOf("\n", first) + 1, first);
  const content = categoryMarkup(article, homePath).split("\n").map((line) => indent + line).join("\n");
  return html.slice(0, first) + start + "\n" + content + "\n" + indent + html.slice(last);
}

for (const article of articles) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) || slugs.has(article.slug)) {
    throw new Error("Each article must have a unique, lowercase, hyphen-separated slug.");
  }
  slugs.add(article.slug);
  if (!Array.isArray(article.relatedSkills)) throw new Error(`${article.slug}: relatedSkills must be an array.`);
  const ids = [article.primarySkill, ...article.relatedSkills];
  if (ids.some((id) => !skillById.has(id)) || new Set(ids).size !== ids.length) {
    throw new Error(`${article.slug}: use unique IDs from data/skills.json, with exactly one primary category.`);
  }
  const path = join(root, "articles", article.slug, "index.html");
  const html = readFileSync(path, "utf8");
  if (!html.includes("src/article-navigation.js")) throw new Error(`${article.slug}: include the shared article navigation script.`);
  pages.set(path, replaceCategoryBlock(html, article, "../../", path));
  pages.set(indexPath, replaceCategoryBlock(pages.get(indexPath), article, "../", indexPath));
}

for (const entry of readdirSync(join(root, "articles"), { withFileTypes: true })) {
  if (entry.isDirectory() && existsSync(join(root, "articles", entry.name, "index.html")) && !slugs.has(entry.name)) {
    throw new Error(`${entry.name}: every article needs a category entry in data/articles.json.`);
  }
}

const stale = [...pages].filter(([path, content]) => readFileSync(path, "utf8") !== content);
if (checkOnly && stale.length) {
  throw new Error("Article categories are out of date. Run npm run articles:build and commit the updated pages.");
}
if (!checkOnly) for (const [path, content] of stale) writeFileSync(path, content);
console.log(`Validated categories for ${articles.length} article(s); ${checkOnly ? "all pages match" : `${stale.length} page(s) updated`}.`);

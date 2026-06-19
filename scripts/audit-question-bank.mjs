import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const MIN_PROMPT_CHARS = 120;
const MAX_PROMPT_CHARS = 520;
const MAX_CHOICE_CHARS = 190;
const MAX_AVG_SENTENCE_WORDS = 34;
const MAX_LONGEST_SENTENCE_WORDS = 58;
const CLUNKY_PROMPT_PATTERNS = [
  ["Scene label", /Scene:/],
  ["raw argument label", /Argument:\s*"/],
  ["anonymous someone", /\bsomeone\b/i],
  ["anonymous speaker", /\ba speaker\b/i],
  ["anonymous supporter argues", /\bA supporter argues\b/i],
  ["anonymous supporter says", /\bA supporter says\b/i],
  ["old main-claim wording", /\bWhat is the main claim\?/i],
  ["generic situation wrapper", /\bsituation\b/i],
  ["result-being-watched wrapper", /result being watched/i],
  ["supposed-to-help wrapper", /The change is supposed to help/i],
  ["outside-knowledge warning", /outside knowledge/i],
  ["use-only-facts warning", /Use only the facts/i],
  ["bureaucratic considering phrase", /is considering whether to/i],
  ["raw grammar artifact", /\b(whether|for|supports) (require|extend|send|test|add|waive|show|use|offer|reserve|launch|move|give|place|make|board)\b/i],
  ["bad result verb", /(complaints|reports|incidents|claims|fees|orders|requests|rates) will reduce/i],
  ["double helper phrasing", /helps by helping/i],
  ["old result phrasing", /improve results for/i]
];
const RUBRIC_BY_SKILL = {
  clarify_claim: {
    prompt: [/Which claim is [A-Z][A-Za-z]+ asking people to accept\?/],
    explanation: [/main claim/i, /recommendation/i, /test result/i]
  },
  define_terms: {
    prompt: [/word or phrase/i, /clearer meaning/i],
    explanation: [/vague/i, /means/i]
  },
  find_argument: {
    prompt: [/conclusion/i],
    explanation: [/conclusion/i, /support/i]
  },
  hidden_assumptions: {
    prompt: [/hidden assumption/i],
    explanation: [/small test/i, /bigger decision/i]
  },
  relevance: {
    prompt: [/matters most/i, /checking that claim/i],
    explanation: [/relevant evidence/i, /directly/i]
  },
  evidence_quality: {
    prompt: [/evidence/i, /strongest/i],
    explanation: [/measures/i, /fair/i]
  },
  source_reliability: {
    prompt: [/trust the report less|less trustworthy/i],
    explanation: [/source/i, /trustworthy/i, /profit/i]
  },
  logical_gaps: {
    prompt: [/logical gap/i],
    explanation: [/logical gap|does not|doesn't|not prove|does not prove/i]
  },
  fallacies: {
    prompt: [/fallacy/i],
    explanation: [/straw man|false dilemma|ad hominem|slippery slope|appeal to popularity|circular reasoning|hasty generalization|red herring|appeal to tradition|post hoc/i]
  },
  probability: {
    prompt: [/chance|signal/i],
    explanation: [/probability/i, /chance/i, /uncertainty/i, /guarantees/i]
  },
  statistical_sense: {
    prompt: [/higher rate|clearest way to describe/i],
    explanation: [/group size/i, /percentage points/i, /percent increase/i]
  },
  causation: {
    prompt: [/does not prove|not prove|not proved/i],
    explanation: [/cause/i, /rule out/i, /compare/i]
  },
  alternative_explanations: {
    prompt: [/other explanation/i],
    explanation: [/alternative explanation/i, /fits/i]
  },
  cognitive_biases: {
    prompt: [/bias/i],
    explanation: [/evidence|example|costs|current|desired|crowd|certainty|judgment/i]
  },
  tradeoffs: {
    prompt: [/tradeoff/i],
    explanation: [/gain/i, /give up/i, /risk/i]
  },
  belief_update: {
    prompt: [/confidence/i],
    explanation: [/confidence/i, /evidence/i]
  }
};

const skills = JSON.parse(await readFile(new URL("skills.json", DATA_DIR), "utf8"));
const items = JSON.parse(await readFile(new URL("question-bank.json", DATA_DIR), "utf8"));
const skillById = new Map(skills.map((skill) => [skill.id, skill]));
const bySkill = new Map();
const itemAudits = [];

for (const item of items) {
  const skill = skillById.get(item.skill);
  const audit = auditItem(item, skill);
  itemAudits.push(audit);
  const list = bySkill.get(item.skill) || [];
  list.push(audit);
  bySkill.set(item.skill, list);
}

const failingAudits = itemAudits.filter((audit) => audit.issues.length > 0);

if (failingAudits.length > 0) {
  console.error(`${failingAudits.length} of ${itemAudits.length} items failed the item audit. Showing the first 80:`);
  for (const audit of failingAudits.slice(0, 80)) {
    console.error(`${audit.itemId} failed item audit:`);
    for (const issue of audit.issues) {
      console.error(`  - [${issue.category}] ${issue.message}`);
    }
  }
  if (failingAudits.length > 80) {
    console.error(`...and ${failingAudits.length - 80} more item failures.`);
  }
  process.exit(1);
}

console.log("Question bank item audit:");
for (const skill of skills) {
  const skillAudits = bySkill.get(skill.id) || [];
  const lengths = skillAudits.map((audit) => audit.promptChars).sort((a, b) => a - b);
  const summary = {
    min: lengths[0],
    p25: percentile(lengths, 0.25),
    median: percentile(lengths, 0.5),
    p75: percentile(lengths, 0.75),
    max: lengths.at(-1)
  };
  const passes = countPasses(skillAudits);
  console.log(
    `${skill.code} ${skill.publicLabel}: ${skillAudits.length} items; ` +
    `clarity ${passes.clarity}/${skillAudits.length}, ` +
    `coherence ${passes.coherence}/${skillAudits.length}, ` +
    `pedagogy ${passes.pedagogy}/${skillAudits.length}; ` +
    `prompt chars min/p25/median/p75/max = ${summary.min}/${summary.p25}/${summary.median}/${summary.p75}/${summary.max}`
  );
}

console.log(`Audited ${itemAudits.length} items individually across ${skills.length} skills.`);

function auditItem(item, skill) {
  const issues = [];
  const choiceTexts = item.choices?.map((choice) => choice.text) || [];
  const answer = item.choices?.find((choice) => choice.id === item.answer);
  const sentenceWordCounts = item.prompt
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map(wordCount);
  const longestSentenceWords = Math.max(...sentenceWordCounts, 0);
  const avgSentenceWords = sentenceWordCounts.length
    ? sentenceWordCounts.reduce((sum, count) => sum + count, 0) / sentenceWordCounts.length
    : 0;

  checkClarity(item, issues, { avgSentenceWords, longestSentenceWords });
  checkCoherence(item, skill, issues, choiceTexts, answer);
  checkPedagogy(item, skill, issues);

  return {
    itemId: item.id,
    skillId: item.skill,
    promptChars: item.prompt.length,
    checks: {
      clarity: !issues.some((issue) => issue.category === "clarity"),
      coherence: !issues.some((issue) => issue.category === "coherence"),
      pedagogy: !issues.some((issue) => issue.category === "pedagogy")
    },
    issues
  };
}

function checkClarity(item, issues, sentenceStats) {
  if (item.prompt.length < MIN_PROMPT_CHARS) {
    addIssue(issues, "clarity", `prompt below ${MIN_PROMPT_CHARS} chars`);
  }
  if (item.prompt.length > MAX_PROMPT_CHARS) {
    addIssue(issues, "clarity", `prompt above ${MAX_PROMPT_CHARS} chars`);
  }
  if (!item.prompt.includes("?")) {
    addIssue(issues, "clarity", "prompt does not ask a direct question");
  }
  if ((item.prompt.match(/[.!?]/g) || []).length < 2) {
    addIssue(issues, "clarity", "prompt has too few sentence breaks");
  }
  if (sentenceStats.avgSentenceWords > MAX_AVG_SENTENCE_WORDS) {
    addIssue(issues, "clarity", `average sentence is too long: ${sentenceStats.avgSentenceWords.toFixed(1)} words`);
  }
  if (sentenceStats.longestSentenceWords > MAX_LONGEST_SENTENCE_WORDS) {
    addIssue(issues, "clarity", `longest sentence is too long: ${sentenceStats.longestSentenceWords} words`);
  }
  for (const [label, pattern] of CLUNKY_PROMPT_PATTERNS) {
    if (pattern.test(item.prompt)) {
      addIssue(issues, "clarity", `prompt still uses clunky boilerplate: ${label}`);
    }
  }
  if (/\b(\w+)\s+\1\b/i.test(item.prompt)) {
    addIssue(issues, "clarity", "prompt repeats the same word twice in a row");
  }
}

function checkCoherence(item, skill, issues, choiceTexts, answer) {
  if (!skill) {
    addIssue(issues, "coherence", `unknown skill ${item.skill}`);
  }
  if (!Array.isArray(item.choices) || item.choices.length !== 4) {
    addIssue(issues, "coherence", "item must have exactly four choices");
    return;
  }
  if (!answer) {
    addIssue(issues, "coherence", `answer ${item.answer} does not match a choice`);
  }
  if (new Set(choiceTexts).size !== choiceTexts.length) {
    addIssue(issues, "coherence", "choice texts must be unique");
  }
  for (const choice of item.choices) {
    if (!choice.text || choice.text.trim().length === 0) {
      addIssue(issues, "coherence", `choice ${choice.id} is blank`);
    }
    if (choice.text.length > MAX_CHOICE_CHARS) {
      addIssue(issues, "coherence", `choice ${choice.id} is too long`);
    }
    if (/undefined|\bNaN\b/.test(choice.text)) {
      addIssue(issues, "coherence", `choice ${choice.id} contains a generated artifact`);
    }
  }
  if (/undefined|\bNaN\b/.test(item.prompt + item.explanation)) {
    addIssue(issues, "coherence", "prompt or explanation contains a generated artifact");
  }
}

function checkPedagogy(item, skill, issues) {
  const rubric = RUBRIC_BY_SKILL[item.skill];
  if (!rubric) {
    addIssue(issues, "pedagogy", `missing pedagogy rubric for ${item.skill}`);
    return;
  }
  if (!rubric.prompt.some((pattern) => pattern.test(item.prompt))) {
    addIssue(issues, "pedagogy", "prompt does not clearly cue the target skill");
  }
  if (!rubric.explanation.some((pattern) => pattern.test(item.explanation))) {
    addIssue(issues, "pedagogy", "explanation does not name the thinking move");
  }
  if (!item.explanation || item.explanation.length < 35) {
    addIssue(issues, "pedagogy", "explanation is too thin");
  }
  if (!item.tags?.includes(`d${item.difficulty}`)) {
    addIssue(issues, "pedagogy", "tags do not include difficulty marker");
  }
  if (skill && !item.tags?.some((tag) => tag === skill.id || skill.name.toLowerCase().includes(tag) || skill.description.toLowerCase().includes(tag))) {
    addIssue(issues, "pedagogy", "tags do not connect to the target skill");
  }
}

function addIssue(issues, category, message) {
  issues.push({ category, message });
}

function countPasses(audits) {
  return audits.reduce((counts, audit) => {
    counts.clarity += audit.checks.clarity ? 1 : 0;
    counts.coherence += audit.checks.coherence ? 1 : 0;
    counts.pedagogy += audit.checks.pedagogy ? 1 : 0;
    return counts;
  }, { clarity: 0, coherence: 0, pedagogy: 0 });
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  return sorted[Math.floor((sorted.length - 1) * p)];
}

function wordCount(text) {
  return (text.match(/[A-Za-z0-9%'-]+/g) || []).length;
}

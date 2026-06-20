import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const MIN_PROMPT_CHARS = 120;
const MAX_PROMPT_CHARS = 520;
const MAX_CHOICE_CHARS = 190;
const MIN_CHOICE_FEEDBACK_CHARS = 70;
const MAX_CHOICE_FEEDBACK_CHARS = 520;
const MAX_AVG_SENTENCE_WORDS = 34;
const MAX_LONGEST_SENTENCE_WORDS = 58;
const LONGEST_CHOICE_TELL_MARGIN = 6;
const SHORTEST_CHOICE_TELL_MARGIN = 8;
const SHORTEST_CHOICE_TELL_RATE = 0.55;
const SHORTEST_CHOICE_TELL_MIN_COUNT = 10;
const TAG_ANSWER_SKEW_MIN_ITEMS = 16;
const TAG_ANSWER_SKEW_MAX_SHARE = 0.6;
const CORRECT_START_TELL_MIN_COUNT = 16;
const TAG_ANSWER_SKEW_IGNORED_TAGS = new Set([
  "source",
  "claim",
  "argument-map",
  "vagueness",
  "relevance",
  "evidence",
  "assumption",
  "probability",
  "statistics",
  "fallacy",
  "bias",
  "tradeoff",
  "causation",
  "alternatives",
  "belief-update",
  "confounder",
  "logic"
]);
const CORRECT_START_TELL_PATTERNS = [
  ["confidence-update opening", /^(increase confidence|let confidence|move confidence)\b/i],
  ["logic-treats opening", /^it treats\b/i],
  ["logic-jump opening", /^it (assumes|moves|jumps)\b/i],
  ["study opening", /^the study\b/i],
  ["evidence opening", /^the evidence\b/i],
  ["average opening", /^an average\b/i],
  ["signal-proof opening", /^treat the signal\b/i]
];
const CLUNKY_PROMPT_PATTERNS = [
  ["distracting quick-check frame", /^Quick check:/i],
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
  ["old result phrasing", /improve results for/i],
  ["underspecified leak-alert topic", /\babout leak alerts\b/i],
  ["underspecified household leak alerts", /\bsend household leak alerts\b/i],
  ["underspecified quiet-hours texts", /\bquiet-hours texts\b/i],
  ["bare hotel guests wording", /\bquiet-hours text reminders? to guests\b/i],
  ["generic same-action wording", /\bsame action\b/i],
  ["double p.m. punctuation", /\bp\.m\.\./i]
];
const CLUNKY_CHOICE_PATTERNS = [
  ["underspecified household leak alerts", /\bsend household leak alerts\b/i],
  ["underspecified quiet-hours texts", /\bquiet-hours texts\b/i],
  ["generic same-action wording", /\bsame action\b/i],
  ["double p.m. punctuation", /\bp\.m\.\./i],
  ["overused money-motive tell", /\bwould make money\b/i],
  ["overused profit-motive tell", /\bwould profit\b/i]
];
const PERCENT_CHANGE_PATTERN = /\b(rose|fell|increased|decreased|dropped|reduced|improved|cut|lowered|raised)\s+by\s+\d+%/i;
const PERCENT_COMPARISON_CUE_PATTERN = /\b(compared with|compared to|before|after|starting number|percentage points|from\s+\d+%\s+to\s+\d+%|out of 100|chance)\b/i;
const ANSWER_DIVERSITY_RULES = {
  hidden_assumptions: { minStems: 4, maxShare: 0.45 },
  relevance: { minStems: 4, maxShare: 0.45 },
  evidence_quality: { minStems: 4, maxShare: 0.45 },
  source_reliability: { minStems: 15, maxShare: 0.25 },
  logical_gaps: { minStems: 8, maxShare: 0.15 },
  probability: { minStems: 4, maxShare: 0.45 },
  statistical_sense: { minStems: 4, maxShare: 0.45 },
  tradeoffs: { minStems: 4, maxShare: 0.45 },
  belief_update: { minStems: 5, maxShare: 0.35 }
};
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
    explanation: [/hidden assumption|assumption/i]
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
    explanation: [/source|trustworthy|method|expertise|sample|evidence|profit/i]
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
    explanation: [/group size/i, /percentage points/i, /percent change/i]
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
const patternIssues = [
  ...auditAnswerPatternTells(items),
  ...auditChoiceLengthTells(items),
  ...auditTagAnswerSkew(items),
  ...auditRecurringCorrectStarts(items)
];

if (failingAudits.length > 0 || patternIssues.length > 0) {
  if (patternIssues.length > 0) {
    console.error(`${patternIssues.length} answer-pattern audit issue(s):`);
    for (const issue of patternIssues) {
      console.error(`  - ${issue}`);
    }
  }
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
  if (hasBarePercentChange(item.prompt)) {
    addIssue(issues, "clarity", "prompt gives a percentage change without a clear comparison or reference point");
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
    for (const [label, pattern] of CLUNKY_CHOICE_PATTERNS) {
      if (pattern.test(choice.text)) {
        addIssue(issues, "coherence", `choice ${choice.id} uses unclear wording: ${label}`);
      }
    }
    if (hasBarePercentChange(choice.text, `${item.prompt} ${choice.text}`)) {
      addIssue(issues, "coherence", `choice ${choice.id} gives a percentage change without enough comparison context`);
    }
  }
  if (!item.feedback || typeof item.feedback !== "object" || Array.isArray(item.feedback)) {
    addIssue(issues, "coherence", "item is missing choice-level feedback");
  } else {
    for (const choice of item.choices) {
      const feedback = item.feedback[choice.id];
      if (typeof feedback !== "string") {
        addIssue(issues, "coherence", `choice ${choice.id} is missing feedback`);
        continue;
      }
      if (feedback.length < MIN_CHOICE_FEEDBACK_CHARS) {
        addIssue(issues, "pedagogy", `choice ${choice.id} feedback is too thin`);
      }
      if (feedback.length > MAX_CHOICE_FEEDBACK_CHARS) {
        addIssue(issues, "clarity", `choice ${choice.id} feedback is too long`);
      }
      if (choice.id === item.answer && !/^Correct\./.test(feedback)) {
        addIssue(issues, "pedagogy", `choice ${choice.id} feedback does not clearly mark the correct answer`);
      }
      if (choice.id !== item.answer && !/^Not quite\./.test(feedback)) {
        addIssue(issues, "pedagogy", `choice ${choice.id} feedback does not clearly mark the distractor`);
      }
    }
  }
  if (/undefined|\bNaN\b/.test(item.prompt + item.explanation + Object.values(item.feedback || {}).join(" "))) {
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

function hasBarePercentChange(text, context = text) {
  return PERCENT_CHANGE_PATTERN.test(text) && !PERCENT_COMPARISON_CUE_PATTERN.test(context);
}

function auditAnswerPatternTells(allItems) {
  const issues = [];
  for (const [skillId, rule] of Object.entries(ANSWER_DIVERSITY_RULES)) {
    const skillItems = allItems.filter((item) => item.skill === skillId);
    if (skillItems.length === 0) {
      continue;
    }
    const stemCounts = new Map();
    for (const item of skillItems) {
      const answerText = getAnswerText(item);
      const stem = answerStem(answerText);
      stemCounts.set(stem, (stemCounts.get(stem) || 0) + 1);
    }
    const maxCount = Math.max(...stemCounts.values());
    if (stemCounts.size < rule.minStems) {
      issues.push(`${skillId} has only ${stemCounts.size} recurring correct-answer stem(s); expected at least ${rule.minStems}.`);
    }
    if (maxCount / skillItems.length > rule.maxShare) {
      issues.push(`${skillId} has one correct-answer stem in ${maxCount}/${skillItems.length} items.`);
    }
  }

  const rateItems = allItems.filter((item) => item.skill === "statistical_sense" && /higher rate/i.test(item.prompt));
  const rateAnswerCounts = rateItems.reduce((counts, item) => {
    const answerText = getAnswerText(item);
    if (/^Group A\b/.test(answerText)) {
      counts.a += 1;
    }
    if (/^Group B\b/.test(answerText)) {
      counts.b += 1;
    }
    return counts;
  }, { a: 0, b: 0 });
  if (rateItems.length > 0 && (rateAnswerCounts.a === 0 || rateAnswerCounts.b === 0)) {
    issues.push(`statistical_sense higher-rate items are one-sided: Group A ${rateAnswerCounts.a}, Group B ${rateAnswerCounts.b}.`);
  }

  return issues;
}

function auditChoiceLengthTells(allItems) {
  const longestExamples = [];
  const shortestExamples = [];

  for (const item of allItems) {
    if (!Array.isArray(item.choices) || item.choices.length !== 4) {
      continue;
    }

    const lengths = item.choices.map((choice) => ({ id: choice.id, len: choice.text.length }));
    const answer = lengths.find((choice) => choice.id === item.answer);
    if (!answer) {
      continue;
    }

    const sorted = [...lengths].sort((a, b) => b.len - a.len);
    const isUniquelyLongest = sorted[0].id === item.answer && sorted[0].len > sorted[1].len;
    const margin = sorted[0].len - sorted[1].len;
    if (isUniquelyLongest && margin >= LONGEST_CHOICE_TELL_MARGIN) {
      longestExamples.push(`${item.id} answer ${item.answer} is longest by ${margin} chars`);
    }
  }

  const skillIds = new Set(allItems.map((item) => item.skill));
  for (const skillId of skillIds) {
    const skillItems = allItems.filter((item) => item.skill === skillId);
    let uniqueShortestCount = 0;
    let shortestCorrectCount = 0;
    let largeMarginCount = 0;
    for (const item of skillItems) {
      if (!Array.isArray(item.choices) || item.choices.length !== 4) {
        continue;
      }

      const lengths = item.choices.map((choice) => ({ id: choice.id, len: choice.text.length }));
      const sorted = [...lengths].sort((a, b) => a.len - b.len);
      if (sorted[0].len === sorted[1].len) {
        continue;
      }

      uniqueShortestCount += 1;
      if (sorted[0].id === item.answer) {
        shortestCorrectCount += 1;
        if (sorted[1].len - sorted[0].len >= SHORTEST_CHOICE_TELL_MARGIN) {
          largeMarginCount += 1;
        }
      }
    }

    const shortestCorrectRate = uniqueShortestCount > 0 ? shortestCorrectCount / uniqueShortestCount : 0;
    if (
      uniqueShortestCount >= 80 &&
      shortestCorrectRate > SHORTEST_CHOICE_TELL_RATE &&
      largeMarginCount >= SHORTEST_CHOICE_TELL_MIN_COUNT
    ) {
      shortestExamples.push(
        `${skillId} has shortest-correct pattern ${shortestCorrectCount}/${uniqueShortestCount} with ${largeMarginCount} large-margin item(s)`
      );
    }
  }

  return [
    ...(longestExamples.length > 0
      ? [`correct answer is visibly longest in ${longestExamples.length} item(s): ${longestExamples.slice(0, 12).join("; ")}`]
      : []),
    ...(shortestExamples.length > 0
      ? [`correct answer has a shortest-choice tell: ${shortestExamples.join("; ")}`]
      : [])
  ];
}

function auditTagAnswerSkew(allItems) {
  const issues = [];
  const skillIds = new Set(allItems.map((item) => item.skill));

  for (const skillId of skillIds) {
    const skillItems = allItems.filter((item) => item.skill === skillId);
    const itemsByTag = new Map();
    for (const item of skillItems) {
      for (const tag of item.tags || []) {
        if (shouldIgnoreTag(tag, skillIds)) {
          continue;
        }
        const tagItems = itemsByTag.get(tag) || [];
        tagItems.push(item);
        itemsByTag.set(tag, tagItems);
      }
    }

    for (const [tag, tagItems] of itemsByTag) {
      if (tagItems.length < TAG_ANSWER_SKEW_MIN_ITEMS) {
        continue;
      }
      const counts = { A: 0, B: 0, C: 0, D: 0 };
      for (const item of tagItems) {
        counts[item.answer] += 1;
      }
      const maxCount = Math.max(...Object.values(counts));
      if (maxCount / tagItems.length >= TAG_ANSWER_SKEW_MAX_SHARE) {
        issues.push(
          `${skillId} tag "${tag}" has answer-position skew ${JSON.stringify(counts)} across ${tagItems.length} items`
        );
      }
    }
  }

  return issues;
}

function auditRecurringCorrectStarts(allItems) {
  const issues = [];
  for (const [label, pattern] of CORRECT_START_TELL_PATTERNS) {
    const matches = allItems
      .map((item) => ({ item, answerText: getAnswerText(item) }))
      .filter(({ answerText }) => pattern.test(answerText));
    if (matches.length >= CORRECT_START_TELL_MIN_COUNT) {
      const examples = matches
        .slice(0, 8)
        .map(({ item }) => item.id)
        .join(", ");
      issues.push(`${label} appears in ${matches.length} correct answer(s): ${examples}`);
    }
  }
  return issues;
}

function shouldIgnoreTag(tag, skillIds) {
  return (
    skillIds.has(tag) ||
    TAG_ANSWER_SKEW_IGNORED_TAGS.has(tag) ||
    /^d\d$/.test(tag) ||
    /^variant-/.test(tag)
  );
}

function getAnswerText(item) {
  return item.choices.find((choice) => choice.id === item.answer)?.text || "";
}

function answerStem(text) {
  return (text.match(/[A-Za-z0-9%'-]+/g) || [])
    .slice(0, 7)
    .map((word) => word.replace(/^\d+%?$/, "#").toLowerCase())
    .join(" ");
}

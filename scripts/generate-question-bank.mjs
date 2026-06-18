import { mkdir, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const ITEMS_PER_SKILL = 160;
const ITEMS_PER_DIFFICULTY = 32;
const LABELS = ["A", "B", "C", "D"];
const difficultyFrames = [
  "Quick check:",
  "Try this:",
  "Think it through:",
  "Careful version:",
  "Challenge version:"
];

const skills = [
  {
    id: "clarify_claim",
    code: "01",
    ordinal: 1,
    name: "Clarify the Claim",
    publicLabel: "What's the Claim?",
    testableTask: "Find the exact claim being made.",
    description: "Tell the main point apart from background, examples, and claims that go too far."
  },
  {
    id: "define_terms",
    code: "02",
    ordinal: 2,
    name: "Define Key Terms",
    publicLabel: "What Do the Words Mean?",
    testableTask: "Find the word or phrase that needs a clearer meaning.",
    description: "Spot vague or slippery words before they blur the argument."
  },
  {
    id: "find_argument",
    code: "03",
    ordinal: 3,
    name: "Find the Argument",
    publicLabel: "What's the Argument?",
    testableTask: "Find the conclusion, reason, evidence, example, or side comment.",
    description: "Name the parts of an argument so you can test how they fit."
  },
  {
    id: "hidden_assumptions",
    code: "04",
    ordinal: 4,
    name: "Spot Hidden Assumptions",
    publicLabel: "What's Assumed?",
    testableTask: "Find the unstated idea the argument needs.",
    description: "Spot the missing bridge between the reason and the conclusion."
  },
  {
    id: "relevance",
    code: "05",
    ordinal: 5,
    name: "Test Relevance",
    publicLabel: "Does That Matter?",
    testableTask: "Decide whether a fact actually matters for the claim.",
    description: "Tell useful evidence apart from details that only sound related."
  },
  {
    id: "evidence_quality",
    code: "06",
    ordinal: 6,
    name: "Evaluate Evidence Quality",
    publicLabel: "How Good Is the Evidence?",
    testableTask: "Pick the strongest evidence from the details given.",
    description: "Compare stories, surveys, tests, measurements, and expert claims."
  },
  {
    id: "source_reliability",
    code: "07",
    ordinal: 7,
    name: "Check Source Reliability",
    publicLabel: "Can We Trust the Source?",
    testableTask: "Judge a source using expertise, motives, method, and openness.",
    description: "Notice what makes a source more or less trustworthy."
  },
  {
    id: "logical_gaps",
    code: "08",
    ordinal: 8,
    name: "Detect Logical Gaps",
    publicLabel: "Does the Logic Follow?",
    testableTask: "Find the step that does not follow.",
    description: "Catch jumps, missing comparisons, circular thinking, and overclaims."
  },
  {
    id: "fallacies",
    code: "09",
    ordinal: 9,
    name: "Recognize Common Fallacies",
    publicLabel: "What's the Fallacy?",
    testableTask: "Match a bad argument to its mistake.",
    description: "Recognize common moves like straw man, false choice, and personal attack."
  },
  {
    id: "probability",
    code: "10",
    ordinal: 10,
    name: "Think Probabilistically",
    publicLabel: "How Likely Is It?",
    testableTask: "Choose the answer that handles chance and uncertainty well.",
    description: "Think in likely, unlikely, and not-yet-sure instead of all-or-nothing."
  },
  {
    id: "statistical_sense",
    code: "11",
    ordinal: 11,
    name: "Use Statistical Sense",
    publicLabel: "What Do the Numbers Say?",
    testableTask: "Read numbers with the right context.",
    description: "Watch percentages, group sizes, averages, rates, and cherry-picked data."
  },
  {
    id: "causation",
    code: "12",
    ordinal: 12,
    name: "Separate Correlation and Causation",
    publicLabel: "Cause or Coincidence?",
    testableTask: "Explain why a cause claim is not proven yet.",
    description: "Look for other causes, backwards cause, and missing comparison groups."
  },
  {
    id: "alternative_explanations",
    code: "13",
    ordinal: 13,
    name: "Consider Alternative Explanations",
    publicLabel: "What Else Could Explain It?",
    testableTask: "Pick another explanation that also fits the facts.",
    description: "Try more than one possible answer before settling."
  },
  {
    id: "cognitive_biases",
    code: "14",
    ordinal: 14,
    name: "Recognize Cognitive Biases",
    publicLabel: "What Bias Is Showing?",
    testableTask: "Name the thinking bias shown in a choice.",
    description: "Notice mental shortcuts that can pull judgment off course."
  },
  {
    id: "tradeoffs",
    code: "15",
    ordinal: 15,
    name: "Weigh Tradeoffs and Consequences",
    publicLabel: "What Are the Tradeoffs?",
    testableTask: "Find the clearest cost, benefit, risk, or second effect.",
    description: "See what a choice gains and what it gives up."
  },
  {
    id: "belief_update",
    code: "16",
    ordinal: 16,
    name: "Update Beliefs Responsibly",
    publicLabel: "How Should Belief Change?",
    testableTask: "Change confidence by the right amount.",
    description: "Do not ignore new evidence, and do not overreact to it."
  }
];

const topics = [
  topic("city transit", "the city council", "extend evening bus service", "late-shift commute complaints", "fell by 22%", "a large employer started a shuttle the same month", "the buses were repainted blue", "late-shift workers", "transportation"),
  topic("school phones", "the school board", "require phone lockers during class", "classroom disruption reports", "fell by 31%", "a new hall monitor schedule began at the same time", "the lockers are installed near the gym", "ninth-grade teachers", "education"),
  topic("medication reminders", "the hospital", "send medication reminder texts", "missed-dose reports", "fell by 18%", "pharmacists also began follow-up calls", "the text messages use a green icon", "patients over 60", "health"),
  topic("four-day pilot", "the company", "test a four-day workweek", "voluntary turnover", "fell by 15%", "the company also raised salaries that quarter", "the pilot calendar starts on a Monday", "software engineers", "workplace"),
  topic("unit pricing", "the grocery chain", "add larger unit-price labels", "shopper overpayment complaints", "fell by 27%", "a local consumer group ran a price-literacy campaign", "the labels use bold numbers", "weekly shoppers", "retail"),
  topic("library fines", "the library", "waive late fines for children's books", "library card renewals", "rose by 19%", "the library also opened on Sundays", "the checkout desk moved six feet", "families with children", "public services"),
  topic("login security", "the platform", "require two-factor login for admins", "account takeover incidents", "fell by 44%", "some high-risk accounts were removed earlier", "the login button changed color", "site administrators", "technology"),
  topic("street lighting", "the neighborhood association", "add brighter streetlights", "reported thefts", "fell by 12%", "police patrols increased during the same period", "the poles are made of aluminum", "residents on Maple Street", "public safety"),
  topic("peer tutoring", "the university", "expand peer tutoring in statistics", "course pass rates", "rose by 11%", "the final exam was also shortened", "the tutoring room has new chairs", "first-year students", "education"),
  topic("menu labels", "the restaurant group", "show calorie labels on menus", "dessert orders", "fell by 16%", "dessert prices increased at the same time", "the menus are printed on thicker paper", "lunch customers", "nutrition"),
  topic("overdraft warnings", "the bank", "send overdraft warning texts", "overdraft fees", "fell by 24%", "the bank also changed its fee grace period", "the texts arrive from a short code", "checking-account customers", "finance"),
  topic("park entry", "the park service", "use timed-entry passes", "trail crowding complaints", "fell by 33%", "a nearby trail reopened that month", "the passes include a small map", "weekend hikers", "environment"),
  topic("museum access", "the museum", "offer free admission on Fridays", "family visits", "rose by 29%", "a new children's exhibit opened the same week", "the tickets are scanned at the east door", "local families", "culture"),
  topic("concussion checks", "the sports league", "add mandatory concussion checks", "repeat head injuries", "fell by 21%", "the league also shortened the season", "the checklist is printed on yellow paper", "youth soccer players", "sports"),
  topic("donor receipts", "the nonprofit", "send donation receipts within one day", "donor retention", "rose by 14%", "the nonprofit also launched a matching campaign", "the receipt subject line changed", "first-time donors", "nonprofit"),
  topic("ergonomic training", "the warehouse", "offer monthly ergonomic training", "back-injury claims", "fell by 20%", "new lifting equipment arrived that quarter", "the training room has a projector", "warehouse staff", "workplace safety"),
  topic("compost bins", "the city sanitation office", "place compost bins in apartment lobbies", "landfill waste from participating buildings", "fell by 17%", "trash pickup schedules also changed", "the bins have foot pedals", "apartment residents", "environment"),
  topic("privacy defaults", "the app maker", "make profiles private by default", "public profile exposure", "fell by 48%", "the app also deleted inactive accounts", "the privacy screen uses a shield icon", "new users", "technology"),
  topic("same-day appointments", "the clinic", "reserve same-day appointment slots", "patient no-show rates", "fell by 13%", "the clinic also began reminder calls", "the appointment cards are white", "primary-care patients", "health"),
  topic("boarding zones", "the airline", "board passengers by seat zone", "average boarding time", "fell by 9%", "the airline also reduced carry-on size limits", "the gate signs are backlit", "domestic passengers", "travel"),
  topic("repair portal", "the landlord", "launch an online repair portal", "unresolved repair requests", "fell by 26%", "the landlord hired two additional technicians", "the portal uses a house logo", "tenants", "housing"),
  topic("cafeteria layout", "the cafeteria", "move fruit to the front of the line", "fruit purchases", "rose by 23%", "a fruit discount started that week", "the fruit bowls are ceramic", "middle-school students", "food"),
  topic("call coaching", "the call center", "give agents weekly script coaching", "customer complaint rates", "fell by 18%", "the call queue was also shortened", "the coaching slides use blue headers", "support agents", "customer support"),
  topic("leak alerts", "the water utility", "send household leak alerts", "average household water use", "fell by 10%", "a rainy season began during the study", "the alerts include a droplet icon", "homeowners", "utilities"),
  topic("camera reminders", "the police department", "send body-camera activation reminders", "missing-camera-footage reports", "fell by 35%", "the department also updated supervisor reviews", "the reminder tone is two beeps", "patrol officers", "governance"),
  topic("ballot tracking", "the election office", "offer mail-ballot tracking", "voter status calls", "fell by 42%", "the office also expanded its phone staff", "the tracking page uses county colors", "mail voters", "election administration"),
  topic("spaced review", "the tutoring app", "send spaced-review prompts", "quiz retention scores", "rose by 12%", "the app also changed the quiz format", "the prompts use a bell icon", "language learners", "learning"),
  topic("gym orientation", "the gym", "offer a beginner orientation", "new-member cancellations", "fell by 19%", "the gym also discounted annual plans", "the orientation mats are black", "new gym members", "fitness"),
  topic("driving feedback", "the insurer", "send safe-driving feedback", "minor crash claims", "fell by 8%", "fuel prices changed driving patterns that month", "the feedback dashboard uses stars", "policyholders", "insurance"),
  topic("correction box", "the newsroom", "place corrections at the top of articles", "reader trust ratings", "rose by 7%", "the newsroom also hired a public editor", "the correction box has a gray border", "newsletter readers", "media"),
  topic("price signs", "the farmers market", "require clearer price signs", "price disputes", "fell by 28%", "the market also added a help desk", "the signs are laminated", "weekend shoppers", "local commerce"),
  topic("quiet-hours texts", "the hotel", "send quiet-hours texts to guests", "noise complaints", "fell by 30%", "the hotel also changed room assignments", "the texts are sent at 8 p.m.", "hotel guests", "hospitality")
];

const vagueTerms = [
  "safe", "reasonable", "fair", "affordable", "significant", "experienced", "soon", "local",
  "high-quality", "enough", "reliable", "harmful", "transparent", "successful", "at-risk", "frequent",
  "serious", "accessible", "normal", "excessive", "moderate", "qualified", "substantial", "clean",
  "secure", "balanced", "urgent", "independent", "diverse", "efficient", "appropriate", "meaningful"
];

const fallacyTypes = [
  {
    name: "Straw man",
    tag: "straw-man",
    line: (t) => `Someone asks for a small test before ${t.actor} decides whether to ${t.action}. A supporter replies, "They want to block every improvement forever."`,
    explanation: "The reply attacks an exaggerated version of the other person's view."
  },
  {
    name: "False dilemma",
    tag: "false-dilemma",
    line: (t) => `A speaker says, "Either ${t.actor} must ${t.action} right now, or it does not care about ${t.group} at all."`,
    explanation: "The argument acts like there are only two choices when there may be more."
  },
  {
    name: "Ad hominem",
    tag: "ad-hominem",
    line: (t) => `Someone rejects the idea of ${t.actionGerund} because the presenter once made a budgeting mistake.`,
    explanation: "The response attacks the person instead of the argument."
  },
  {
    name: "Slippery slope",
    tag: "slippery-slope",
    line: (t) => `A speaker says, "If ${t.actor} agrees to ${t.action}, soon every rule in ${t.domain} will fall apart."`,
    explanation: "The argument predicts an extreme chain reaction without support."
  },
  {
    name: "Appeal to popularity",
    tag: "appeal-to-popularity",
    line: (t) => `A presenter says ${t.actor} should ${t.action} because the idea received the most likes in an online poll.`,
    explanation: "Popularity is treated as proof that the idea is correct."
  },
  {
    name: "Circular reasoning",
    tag: "circular-reasoning",
    line: (t) => `A note says ${t.actor} should ${t.action} because it is the right move, and it is the right move because it should be done.`,
    explanation: "The conclusion is used as its own support."
  },
  {
    name: "Hasty generalization",
    tag: "hasty-generalization",
    line: (t) => `After one ${t.domain} group reports success, a speaker says the same result will happen everywhere.`,
    explanation: "A broad conclusion is drawn from too little evidence."
  },
  {
    name: "Red herring",
    tag: "red-herring",
    line: (t) => `Asked whether ${t.actionGerund} would affect ${t.metric}, a speaker talks instead about the building's new paint color.`,
    explanation: "The response shifts attention to an irrelevant issue."
  },
  {
    name: "Appeal to tradition",
    tag: "appeal-to-tradition",
    line: (t) => `A manager says ${t.actor} should not ${t.action} because the old way has been used for many years.`,
    explanation: "The argument treats age or tradition as enough proof."
  },
  {
    name: "Post hoc",
    tag: "post-hoc",
    line: (t) => `${t.metric} ${t.outcome} after ${t.actor} began the new policy, so a speaker concludes the policy must have caused the change.`,
    explanation: "The argument assumes that because one event came after another, the first caused the second."
  }
];

const biasTypes = [
  {
    name: "Confirmation bias",
    tag: "confirmation-bias",
    line: (t) => `A manager reads only comments praising the plan to ${t.action} and ignores equally detailed criticism.`,
    explanation: "The person favors evidence that supports an existing view."
  },
  {
    name: "Availability bias",
    tag: "availability-bias",
    line: (t) => `After hearing one vivid story about ${t.domain}, someone assumes the same problem is common everywhere.`,
    explanation: "A memorable example is treated as more common than it may be."
  },
  {
    name: "Anchoring",
    tag: "anchoring",
    line: (t) => `The first guess for the ${t.domain} plan says it will cost $900,000, so later reviewers treat $850,000 as cheap without checking what it should cost.`,
    explanation: "Judgment is pulled toward the first number encountered."
  },
  {
    name: "Sunk cost bias",
    tag: "sunk-cost",
    line: (t) => `A team keeps funding a failing ${t.domain} project because it already spent a year on it.`,
    explanation: "Past unrecoverable costs are allowed to drive the current decision."
  },
  {
    name: "Overconfidence bias",
    tag: "overconfidence",
    line: (t) => `A director predicts exact results from ${t.actionGerund} even though no similar test has been run.`,
    explanation: "The person shows more certainty than the evidence supports."
  },
  {
    name: "Status quo bias",
    tag: "status-quo",
    line: (t) => `A group rejects every change to ${t.domain} mainly because the current system feels familiar.`,
    explanation: "The current option is favored because it is already in place."
  },
  {
    name: "Motivated reasoning",
    tag: "motivated-reasoning",
    line: (t) => `A sponsor praises weak evidence supporting ${t.actionGerund} because the result would help its preferred plan.`,
    explanation: "The evaluation is shaped by the desired conclusion."
  },
  {
    name: "Bandwagon effect",
    tag: "bandwagon",
    line: (t) => `A reviewer supports ${t.actionGerund} after seeing that most classmates or coworkers support it, without checking the evidence.`,
    explanation: "The person follows the crowd rather than the reasons."
  }
];

function topic(domain, actor, action, metric, outcome, alternative, irrelevant, group, field) {
  return {
    domain,
    actor,
    action,
    actionGerund: gerundize(action),
    metric,
    outcome,
    outcomeAmount: outcome.replace(/^(fell|rose) by /, ""),
    alternative,
    irrelevant,
    group,
    field,
    evidence: `${metric} ${outcome} in a small test`,
    interestedParty: `a company that would make money if ${actor} chose to ${action}`,
    expert: `a ${field} expert who has studied similar programs`
  };
}

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function phrase(text) {
  if (/[ap]\.m\.$/.test(text)) {
    return text;
  }
  return text.replace(/[.!?]+$/, "");
}

function gerundize(action) {
  const [verb, ...rest] = action.split(" ");
  const exceptions = {
    give: "giving",
    waive: "waiving",
    make: "making",
    use: "using",
    reserve: "reserving",
    place: "placing"
  };
  let gerund = exceptions[verb];
  if (!gerund) {
    gerund = verb.endsWith("e") ? `${verb.slice(0, -1)}ing` : `${verb}ing`;
  }
  return [gerund, ...rest].join(" ");
}

function hashString(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableShuffle(values, seed) {
  return values
    .map((value) => ({ value, rank: hashString(`${seed}:${value}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map((entry) => entry.value);
}

function uniqueTexts(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      output.push(normalized);
    }
  }
  return output;
}

function makeItem(skillId, index, difficulty, prompt, correct, distractors, explanation, tags) {
  const id = `${skillId}-${String(index).padStart(3, "0")}`;
  const choices = uniqueTexts([correct, ...distractors]);
  if (choices.length < 4) {
    throw new Error(`${id} has fewer than four unique choices`);
  }
  const shuffled = stableShuffle(choices.slice(0, 4), id);
  const answerIndex = shuffled.indexOf(correct);
  if (answerIndex === -1) {
    throw new Error(`${id} lost its correct answer while shuffling`);
  }
  return {
    id,
    skill: skillId,
    difficulty,
    prompt: prompt.replace(/\s+/g, " ").trim(),
    choices: shuffled.map((text, choiceIndex) => ({
      id: LABELS[choiceIndex],
      text
    })),
    answer: LABELS[answerIndex],
    explanation,
    tags
  };
}

function withFrame(difficulty, prompt) {
  return `${difficultyFrames[difficulty - 1]} ${prompt}`;
}

function decisionSetup(t) {
  return `${cap(t.actor)} is deciding whether to ${t.action} to help ${t.group}.`;
}

function trialResult(t) {
  return `In a small test, ${t.metric} ${t.outcome}.`;
}

function resultAction(t) {
  return t.outcome.startsWith("fell") ? "reduce" : "increase";
}

function resultFuture(t) {
  return t.outcome.startsWith("fell") ? "fall" : "rise";
}

function resultGoal(t) {
  return `${resultAction(t)} ${t.metric}`;
}

function resultGerund(t) {
  return t.outcome.startsWith("fell") ? "reducing" : "increasing";
}

function buildSkill(skillId, builder) {
  const items = [];
  for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
    for (let offset = 0; offset < ITEMS_PER_DIFFICULTY; offset += 1) {
      const index = (difficulty - 1) * ITEMS_PER_DIFFICULTY + offset + 1;
      items.push(builder(topics[offset], difficulty, offset, index));
    }
  }
  if (items.length !== ITEMS_PER_SKILL) {
    throw new Error(`${skillId} generated ${items.length} items`);
  }
  return items;
}

function claimItems() {
  return buildSkill("clarify_claim", (t, difficulty, offset, index) => {
    const prompt = `${decisionSetup(t)} ${trialResult(t)} A supporter argues, "That result shows this plan should go forward." What is the main claim?`;
    return makeItem(
      "clarify_claim",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `${cap(t.actor)} should ${t.action}.`,
      [
        `${cap(t.evidence)}.`,
        `${cap(t.actor)} has proven the idea will always work.`,
        `${cap(t.irrelevant)}.`,
        `${cap(t.group)} are the only people affected.`
      ],
      "The main claim is the point the argument wants you to accept.",
      ["claim", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function termItems() {
  return buildSkill("define_terms", (t, difficulty, offset, index) => {
    const term = vagueTerms[offset];
    const prompt = `${decisionSetup(t)} The plan will move ahead only if it is "${term}". Which word most needs a clearer meaning?`;
    return makeItem(
      "define_terms",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `"${term}"`,
      [
        `"${t.actor.replace(/^the /, "")}"`,
        `"${t.group}"`,
        `"rule"`,
        `"applied"`
      ],
      `The word "${term}" is vague, so we need to know exactly what it means.`,
      ["vagueness", t.field, `d${difficulty}`, term]
    );
  });
}

function argumentItems() {
  return buildSkill("find_argument", (t, difficulty, offset, index) => {
    const conclusionText = `${t.actor} should ${t.action}.`;
    const conclusion = cap(conclusionText);
    const premise = `${cap(t.evidence)}.`;
    const background = `${cap(t.irrelevant)}.`;
    const extra = `${cap(t.group)} were included in the report.`;
    const prompt = `At a meeting about whether ${t.actor} should ${t.action}, someone says: "${background} ${premise} So ${conclusionText} ${extra}" Which sentence is the conclusion?`;
    return makeItem(
      "find_argument",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      conclusion,
      [premise, background, extra, `${cap(t.metric)} was mentioned as context.`],
      "The conclusion is the point the other sentences are trying to support.",
      ["argument-map", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function assumptionItems() {
  return buildSkill("hidden_assumptions", (t, difficulty, offset, index) => {
    const prompt = `${trialResult(t)} On that evidence alone, ${t.actor} argues it should ${t.action} everywhere it can. Which hidden assumption does the argument need?`;
    return makeItem(
      "hidden_assumptions",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `The small test is likely to work the same way when the idea is used more widely.`,
      [
        `${cap(phrase(t.irrelevant))}, so that detail is the most important fact about the idea.`,
        `${cap(t.metric)} can never be measured reliably.`,
        `${cap(t.actor)} should reject every alternative to the idea.`,
        `${cap(t.group)} caused the test result by themselves.`
      ],
      "The argument needs the small test to be a good guide for the bigger decision.",
      ["assumption", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function relevanceItems() {
  return buildSkill("relevance", (t, difficulty, offset, index) => {
    const prompt = `${cap(t.actor)} claims that ${t.actionGerund} will ${resultGoal(t)} among ${t.group}. Which fact matters most for checking that claim?`;
    return makeItem(
      "relevance",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `A similar group tried the same action, and results for ${t.metric} improved in similar conditions.`,
      [
        `${cap(t.irrelevant)}.`,
        `The idea was discussed on a Tuesday afternoon.`,
        `The report includes a photograph of ${t.group}.`,
        `The office uses a newer font in this year's documents.`
      ],
      "Relevant evidence directly helps check whether the action affects the result.",
      ["relevance", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function evidenceItems() {
  return buildSkill("evidence_quality", (t, difficulty, offset, index) => {
    const strongest =
      difficulty <= 2
        ? `A large, fair survey of ${t.group} measured ${t.metric} before and after the change.`
        : `A random test compared similar groups with and without the change, then measured ${t.metric}.`;
    const prompt = `${cap(t.actor)} wants to know whether ${t.actionGerund} actually helps ${t.group} by ${resultGerund(t)} ${t.metric}. Which evidence would be strongest?`;
    return makeItem(
      "evidence_quality",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      strongest,
      [
        `One supporter says the idea feels promising.`,
        `A brochure says ${t.actionGerund} is new and exciting but gives no data.`,
        `Three people on social media praised the idea.`,
        `A note repeats that the idea is useful without explaining how anyone checked it.`
      ],
      "The strongest option measures the result in a fair way, often with a comparison group.",
      ["evidence", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function sourceItems() {
  return buildSkill("source_reliability", (t, difficulty, offset, index) => {
    const prompt = `A report recommends that ${t.actor} ${t.action}. It also claims the plan would ${resultGoal(t)}. Which detail makes the report less trustworthy?`;
    return makeItem(
      "source_reliability",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `The report was produced by ${t.interestedParty}.`,
      [
        `The report lists where its data came from.`,
        `The author is ${t.expert}.`,
        `The report explains how it measured ${t.metric}.`,
        `The report includes results that conflict with the author's preference.`
      ],
      "A source is less trustworthy when it may profit from the answer it gives.",
      ["source", "conflict-of-interest", t.field, `d${difficulty}`]
    );
  });
}

function logicalGapItems() {
  const patterns = [
    (t) => ({
      prompt: `Argument: "In one group, ${t.metric} ${t.outcome} after ${t.actionGerund}. So the same action will work in every ${t.domain} setting." What is the logical gap?`,
      correct: "It generalizes from one case to every case without enough support.",
      explanation: "One case does not prove the same thing will happen everywhere."
    }),
    (t) => ({
      prompt: `Argument: "${cap(t.metric)} ${t.outcome} after ${t.actionGerund}. So the action caused the change." What is the logical gap?`,
      correct: "It assumes timing alone proves causation.",
      explanation: "Something happening first does not, by itself, prove it caused what came next."
    }),
    (t) => ({
      prompt: `Argument: "Most ${t.group} asked in a survey liked ${t.actionGerund}. So every person affected will benefit from it." What is the logical gap?`,
      correct: "It moves from what most surveyed people liked to what everyone will benefit from.",
      explanation: "Most people liking something does not prove it helps everyone."
    }),
    (t) => ({
      prompt: `Argument: "The average result improved after ${t.actionGerund}. So each individual ${t.group.slice(0, -1) || t.group} improved." What is the logical gap?`,
      correct: "It treats an average change as proof that every individual changed the same way.",
      explanation: "An average can go up even when some people do not improve."
    })
  ];
  return buildSkill("logical_gaps", (t, difficulty, offset, index) => {
    const pattern = patterns[(offset + difficulty) % patterns.length](t);
    return makeItem(
      "logical_gaps",
      index,
      difficulty,
      withFrame(difficulty, pattern.prompt),
      pattern.correct,
      [
        "It gives too many definitions of the same term.",
        "It uses a source with no possible incentive.",
        "It states the conclusion before the evidence.",
        "It includes a specific number instead of a story."
      ],
      pattern.explanation,
      ["logic", t.field, `d${difficulty}`, `pattern-${(offset + difficulty) % patterns.length}`]
    );
  });
}

function fallacyItems() {
  return buildSkill("fallacies", (t, difficulty, offset, index) => {
    const fallacy = fallacyTypes[(offset + difficulty - 1) % fallacyTypes.length];
    const otherNames = fallacyTypes
      .filter((entry) => entry.name !== fallacy.name)
      .map((entry) => entry.name);
    return makeItem(
      "fallacies",
      index,
      difficulty,
      withFrame(difficulty, `In a debate about a proposed ${t.domain} change, this happens: ${fallacy.line(t)} Which fallacy is showing up?`),
      fallacy.name,
      stableShuffle(otherNames, `${fallacy.name}:${index}`).slice(0, 3),
      fallacy.explanation,
      ["fallacy", fallacy.tag, t.field, `d${difficulty}`]
    );
  });
}

function probabilityItems() {
  const percentages = [20, 25, 30, 40, 55, 60, 65, 70, 75, 80, 85, 90, 15, 35, 45, 50];
  return buildSkill("probability", (t, difficulty, offset, index) => {
    const percent = percentages[(offset + difficulty) % percentages.length];
    const prompt =
      difficulty <= 3
        ? `A forecast about ${t.domain} says there is a ${percent}% chance that ${t.metric} will ${resultFuture(t)} next month. What does that mean?`
        : `A warning signal in ${t.domain} can catch a real problem, but it also gives false alarms. The problem it flags is uncommon. What is the best way to treat a positive signal?`;
    const correct =
      difficulty <= 3
        ? `In many similar cases, improvement would happen about ${percent} out of 100 times.`
        : "It should raise concern, but it is not proof without checking how common the problem is and how often the signal is wrong.";
    return makeItem(
      "probability",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      correct,
      difficulty <= 3
        ? [
            `The improvement will last for exactly ${percent}% of the month.`,
            `The improvement is guaranteed because the number is above 0%.`,
            `The forecast says ${percent}% of ${t.group} caused the result.`,
            `The result is impossible if the forecast is below 100%.`
          ]
        : [
            "It proves the flagged problem is definitely there.",
            "It should be ignored because every signal has some errors.",
            "It proves how common the problem is no longer matters.",
            "It means all unflagged cases are risk-free."
          ],
      "Probability is about chance and uncertainty, not guarantees.",
      ["probability", t.field, `d${difficulty}`, `p${percent}`]
    );
  });
}

function statsItems() {
  return buildSkill("statistical_sense", (t, difficulty, offset, index) => {
    const aEvents = 4 + ((offset + difficulty) % 9);
    const aTotal = 100;
    const bEvents = aEvents + 2;
    const bTotal = 300;
    const aRate = aEvents / aTotal;
    const bRate = bEvents / bTotal;
    const aHigher = aRate > bRate;
    const prompt =
      difficulty <= 3
        ? `In one ${t.domain} comparison, Group A had ${aEvents} cases out of ${aTotal}. Group B had ${bEvents} cases out of ${bTotal}. Which group had the higher rate?`
        : `A report about ${t.domain} says ${t.metric} rose from ${aEvents}% to ${aEvents + 5}% after a pilot program. What is the clearest way to describe the change?`;
    const correct =
      difficulty <= 3
        ? aHigher
          ? `Group A, because ${aEvents}/${aTotal} is a higher rate than ${bEvents}/${bTotal}.`
          : `Group B, because ${bEvents}/${bTotal} is a higher rate than ${aEvents}/${aTotal}.`
        : `It rose by 5 percentage points, which is about a ${Math.round((5 / aEvents) * 100)}% increase compared with the starting number.`;
    return makeItem(
      "statistical_sense",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      correct,
      difficulty <= 3
        ? [
            `Group A, because ${aEvents} is smaller than ${bEvents}.`,
            `Group B, because ${bTotal} is larger than ${aTotal}.`,
            "The rates are automatically equal because both groups are in the same comparison.",
            "There is no way to compare rates when group sizes differ."
          ]
        : [
            "It rose by 5%, because any move from one percent to another is a 5% change.",
            `It rose by ${aEvents + 5} percentage points, because that is the ending value.`,
            "It doubled, because all five-point changes are doublings.",
            "It cannot be described without knowing the city population."
          ],
      "For numbers, pay attention to group size and to the difference between percentage points and percent increase.",
      ["statistics", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function causationItems() {
  return buildSkill("causation", (t, difficulty, offset, index) => {
    const prompt = `${cap(t.actor)} tried a plan to ${t.action}. Afterward, ${t.metric} ${t.outcome}. Which fact would show why this does not prove the plan caused the change?`;
    return makeItem(
      "causation",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `${cap(t.alternative)}.`,
      [
        `${cap(t.irrelevant)}.`,
        `No event can ever have more than one possible cause.`,
        `A change of ${t.outcomeAmount} is always too small to measure.`,
        `${cap(t.actor)} is mentioned before ${t.metric} in the sentence.`
      ],
      "To prove cause, you need to rule out other likely causes or compare similar groups.",
      ["causation", "confounder", t.field, `d${difficulty}`]
    );
  });
}

function alternativeItems() {
  return buildSkill("alternative_explanations", (t, difficulty, offset, index) => {
    const prompt = `${cap(t.actor)} tried ${t.actionGerund}. Afterward, ${t.metric} ${t.outcome}. A supporter says the plan caused the change. Which other explanation also fits?`;
    return makeItem(
      "alternative_explanations",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `${cap(t.alternative)}.`,
      [
        `${cap(t.irrelevant)}.`,
        `${cap(t.metric)} cannot change under any circumstances.`,
        `The result must be false because it includes a percentage.`,
        `${cap(t.group)} were not mentioned in the policy name.`
      ],
      "A good alternative explanation fits the same facts without assuming the first cause is right.",
      ["alternatives", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function biasItems() {
  return buildSkill("cognitive_biases", (t, difficulty, offset, index) => {
    const bias = biasTypes[(offset + difficulty - 1) % biasTypes.length];
    const otherNames = biasTypes
      .filter((entry) => entry.name !== bias.name)
      .map((entry) => entry.name);
    return makeItem(
      "cognitive_biases",
      index,
      difficulty,
      withFrame(difficulty, `In a discussion about ${t.domain}, ${lowerFirst(bias.line(t))} Which thinking bias is shown?`),
      bias.name,
      stableShuffle(otherNames, `${bias.name}:${index}`).slice(0, 3),
      bias.explanation,
      ["bias", bias.tag, t.field, `d${difficulty}`]
    );
  });
}

function tradeoffItems() {
  return buildSkill("tradeoffs", (t, difficulty, offset, index) => {
    const cost = difficulty <= 2
      ? `requires staff time that could be used for other ${t.field} work`
      : `may move resources away from a smaller group that was not included in the test`;
    const prompt = `${cap(t.actor)} can ${t.action}, which may ${resultGoal(t)} among ${t.group}. But the plan ${cost}. Which statement best names the tradeoff?`;
    return makeItem(
      "tradeoffs",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `The plan may ${resultGoal(t)} while also using resources that could serve another need.`,
      [
        `The plan has benefits, so it cannot have costs.`,
        `The plan has costs, so it cannot have benefits.`,
        `The main tradeoff is the unrelated detail: ${lowerFirst(phrase(t.irrelevant))}.`,
        `A tradeoff exists only when every option is equally bad.`
      ],
      "A tradeoff compares what you gain with what you give up or risk.",
      ["tradeoff", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function beliefUpdateItems() {
  return buildSkill("belief_update", (t, difficulty, offset, index) => {
    const evidence =
      difficulty <= 2
        ? `one small test where ${t.metric} ${t.outcome}`
        : `a random comparison where similar groups with and without the change were measured`;
    const prompt = `You are unsure whether ${t.actionGerund} would ${resultGoal(t)} among ${t.group}. Then you learn about ${evidence}. How should your confidence change?`;
    const correct =
      difficulty <= 2
        ? "Increase confidence somewhat, while staying open to better evidence."
        : "Increase confidence a lot, while still avoiding total certainty.";
    return makeItem(
      "belief_update",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      correct,
      [
        "Become completely certain the action works in every setting.",
        "Ignore the evidence because no single item can matter at all.",
        "Reverse your view even if the new evidence supports your prior view.",
        "Treat the evidence as proof of the opposite claim."
      ],
      "Change your confidence in proportion to how strong and limited the evidence is.",
      ["belief-update", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

const items = [
  ...claimItems(),
  ...termItems(),
  ...argumentItems(),
  ...assumptionItems(),
  ...relevanceItems(),
  ...evidenceItems(),
  ...sourceItems(),
  ...logicalGapItems(),
  ...fallacyItems(),
  ...probabilityItems(),
  ...statsItems(),
  ...causationItems(),
  ...alternativeItems(),
  ...biasItems(),
  ...tradeoffItems(),
  ...beliefUpdateItems()
];

await mkdir(DATA_DIR, { recursive: true });
await writeFile(new URL("skills.json", DATA_DIR), `${JSON.stringify(skills, null, 2)}\n`);
await writeFile(new URL("question-bank.json", DATA_DIR), `${JSON.stringify(items, null, 2)}\n`);

console.log(`Generated ${skills.length} skills and ${items.length} items.`);

import { mkdir, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const ITEMS_PER_SKILL = 160;
const ITEMS_PER_DIFFICULTY = 32;
const LABELS = ["A", "B", "C", "D"];
const difficultyFrames = [
  "In a short public memo,",
  "In a staff briefing with one extra detail,",
  "In a review note for a mixed audience,",
  "In an audit summary with competing details,",
  "In a policy discussion that requires careful wording,"
];

const skills = [
  {
    id: "clarify_claim",
    ordinal: 1,
    name: "Clarify the Claim",
    publicLabel: "What's the Claim?",
    testableTask: "Identify the exact claim being asserted.",
    description: "Separate the main assertion from context, evidence, examples, and stronger claims not actually made."
  },
  {
    id: "define_terms",
    ordinal: 2,
    name: "Define Key Terms",
    publicLabel: "What Do the Words Mean?",
    testableTask: "Pick the vague, ambiguous, or shifting term that must be clarified.",
    description: "Notice language that needs a measurable or stable definition before an argument can be evaluated."
  },
  {
    id: "find_argument",
    ordinal: 3,
    name: "Find the Argument",
    publicLabel: "What's the Argument?",
    testableTask: "Identify a conclusion, premise, evidence, example, objection, or rhetorical flourish.",
    description: "Map the parts of an argument so the reasoning can be tested."
  },
  {
    id: "hidden_assumptions",
    ordinal: 4,
    name: "Spot Hidden Assumptions",
    publicLabel: "What's Assumed?",
    testableTask: "Choose the unstated premise the argument depends on.",
    description: "Surface the missing bridge between stated reasons and the conclusion."
  },
  {
    id: "relevance",
    ordinal: 5,
    name: "Test Relevance",
    publicLabel: "Does That Matter?",
    testableTask: "Decide whether information actually supports or weakens the conclusion.",
    description: "Distinguish evidence that bears on the claim from facts that merely sound related."
  },
  {
    id: "evidence_quality",
    ordinal: 6,
    name: "Evaluate Evidence Quality",
    publicLabel: "How Good Is the Evidence?",
    testableTask: "Identify the strongest evidence from explicit methodological details.",
    description: "Compare anecdotes, samples, experiments, measurements, and expert testimony."
  },
  {
    id: "source_reliability",
    ordinal: 7,
    name: "Check Source Reliability",
    publicLabel: "Can We Trust the Source?",
    testableTask: "Assess source credibility using expertise, incentives, method, and transparency.",
    description: "Recognize source features that strengthen or weaken a claim."
  },
  {
    id: "logical_gaps",
    ordinal: 8,
    name: "Detect Logical Gaps",
    publicLabel: "Does the Logic Follow?",
    testableTask: "Identify the invalid or unsupported inference.",
    description: "Catch overgeneralization, missing comparisons, circularity, and conclusions that outrun the premises."
  },
  {
    id: "fallacies",
    ordinal: 9,
    name: "Recognize Common Fallacies",
    publicLabel: "What's the Fallacy?",
    testableTask: "Match a flawed argument to the reasoning error it commits.",
    description: "Recognize recurring argument patterns such as straw man, false dilemma, and ad hominem."
  },
  {
    id: "probability",
    ordinal: 10,
    name: "Think Probabilistically",
    publicLabel: "How Likely Is It?",
    testableTask: "Choose the answer that best reflects uncertainty, likelihood, base rates, or confidence.",
    description: "Reason with partial information instead of treating possibilities as certainties."
  },
  {
    id: "statistical_sense",
    ordinal: 11,
    name: "Use Statistical Sense",
    publicLabel: "What Do the Numbers Say?",
    testableTask: "Interpret percentages, denominators, averages, rates, sample sizes, or cherry-picked data.",
    description: "Read numbers in context and avoid common statistical traps."
  },
  {
    id: "causation",
    ordinal: 12,
    name: "Separate Correlation and Causation",
    publicLabel: "Cause or Coincidence?",
    testableTask: "Identify why a causal conclusion is not yet justified.",
    description: "Look for confounders, reverse causation, and missing comparison groups."
  },
  {
    id: "alternative_explanations",
    ordinal: 13,
    name: "Consider Alternative Explanations",
    publicLabel: "What Else Could Explain It?",
    testableTask: "Pick another explanation that fits the given facts.",
    description: "Generate and compare plausible accounts before settling on one conclusion."
  },
  {
    id: "cognitive_biases",
    ordinal: 14,
    name: "Recognize Cognitive Biases",
    publicLabel: "What Bias Is Showing?",
    testableTask: "Identify the cognitive bias illustrated by a decision or interpretation.",
    description: "Notice predictable mental shortcuts that can distort judgment."
  },
  {
    id: "tradeoffs",
    ordinal: 15,
    name: "Weigh Tradeoffs and Consequences",
    publicLabel: "What Are the Tradeoffs?",
    testableTask: "Identify the clearest cost, benefit, opportunity cost, or second-order effect.",
    description: "Compare what a choice gains, sacrifices, risks, and changes downstream."
  },
  {
    id: "belief_update",
    ordinal: 16,
    name: "Update Beliefs Responsibly",
    publicLabel: "How Should Belief Change?",
    testableTask: "Choose the belief revision that is proportional to the new evidence.",
    description: "Calibrate confidence instead of ignoring evidence or overreacting to it."
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
    line: (t) => `A critic asks for a small pilot before ${t.actor} decides whether to ${t.action}. A supporter replies, "My opponent wants to block every improvement forever."`,
    explanation: "The reply attacks an exaggerated version of the critic's position."
  },
  {
    name: "False dilemma",
    tag: "false-dilemma",
    line: (t) => `A speaker says, "Either ${t.actor} must ${t.action} immediately, or it does not care about ${t.group} at all."`,
    explanation: "The argument treats two options as exhaustive when other options may exist."
  },
  {
    name: "Ad hominem",
    tag: "ad-hominem",
    line: (t) => `Someone rejects the proposal to ${t.action} because the presenter once made a budgeting mistake.`,
    explanation: "The response attacks the person instead of the argument."
  },
  {
    name: "Slippery slope",
    tag: "slippery-slope",
    line: (t) => `A speaker says, "If ${t.actor} agrees to ${t.action}, soon every rule in ${t.domain} will collapse."`,
    explanation: "The argument predicts an extreme chain of events without support."
  },
  {
    name: "Appeal to popularity",
    tag: "appeal-to-popularity",
    line: (t) => `A presenter says ${t.actor} should ${t.action} because the idea received the most likes in an online poll.`,
    explanation: "Popularity is treated as proof that the proposal is correct."
  },
  {
    name: "Circular reasoning",
    tag: "circular-reasoning",
    line: (t) => `A memo says ${t.actor} should ${t.action} because doing so is the right policy, and it is the right policy because it should be done.`,
    explanation: "The conclusion is used as its own support."
  },
  {
    name: "Hasty generalization",
    tag: "hasty-generalization",
    line: (t) => `After one ${t.domain} office reports success, a speaker concludes the same result will happen everywhere.`,
    explanation: "A broad conclusion is drawn from too little evidence."
  },
  {
    name: "Red herring",
    tag: "red-herring",
    line: (t) => `Asked whether ${t.action} would affect ${t.metric}, a speaker talks instead about the building's new paint color.`,
    explanation: "The response shifts attention to an irrelevant issue."
  },
  {
    name: "Appeal to tradition",
    tag: "appeal-to-tradition",
    line: (t) => `A manager says ${t.actor} should not ${t.action} because the old process has been used for many years.`,
    explanation: "The argument treats age or tradition as sufficient proof."
  },
  {
    name: "Post hoc",
    tag: "post-hoc",
    line: (t) => `${t.metric} ${t.outcome} after ${t.actor} began the new policy, so a speaker concludes the policy must have caused the change.`,
    explanation: "The argument assumes that because one event followed another, the first caused the second."
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
    line: (t) => `After hearing one vivid story about ${t.domain}, a resident assumes the same problem is common everywhere.`,
    explanation: "A memorable example is treated as more common than it may be."
  },
  {
    name: "Anchoring",
    tag: "anchoring",
    line: (t) => `The first estimate for the ${t.domain} plan says it will cost $900,000, so later reviewers treat $850,000 as cheap without checking the actual need.`,
    explanation: "Judgment is pulled toward the first number encountered."
  },
  {
    name: "Sunk cost bias",
    tag: "sunk-cost",
    line: (t) => `A team keeps funding a failing ${t.domain} project because it has already spent a year on it.`,
    explanation: "Past unrecoverable costs are allowed to drive the current decision."
  },
  {
    name: "Overconfidence bias",
    tag: "overconfidence",
    line: (t) => `A director predicts exact results from ${t.action} even though no similar pilot has been run.`,
    explanation: "The person shows more certainty than the evidence supports."
  },
  {
    name: "Status quo bias",
    tag: "status-quo",
    line: (t) => `A committee rejects every change to ${t.domain} mainly because the current system feels familiar.`,
    explanation: "The current option is favored because it is already in place."
  },
  {
    name: "Motivated reasoning",
    tag: "motivated-reasoning",
    line: (t) => `A sponsor praises weak evidence for ${t.action} because the result would help its preferred plan.`,
    explanation: "The evaluation is shaped by the desired conclusion."
  },
  {
    name: "Bandwagon effect",
    tag: "bandwagon",
    line: (t) => `A reviewer supports ${t.action} after seeing that most colleagues publicly support it, without reviewing the evidence.`,
    explanation: "The person follows the crowd rather than the reasons."
  }
];

function topic(domain, actor, action, metric, outcome, alternative, irrelevant, group, field) {
  return {
    domain,
    actor,
    action,
    metric,
    outcome,
    alternative,
    irrelevant,
    group,
    field,
    evidence: `${metric} ${outcome} in a small pilot`,
    interestedParty: `a vendor that would be paid if ${actor} chose to ${action}`,
    expert: `a ${field} researcher with published work on similar programs`
  };
}

function cap(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
    prompt: `${difficultyFrames[difficulty - 1]} ${prompt}`.replace(/\s+/g, " ").trim(),
    choices: shuffled.map((text, choiceIndex) => ({
      id: LABELS[choiceIndex],
      text
    })),
    answer: LABELS[answerIndex],
    explanation,
    tags
  };
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
    const prompt = `Read the argument: "${cap(t.evidence)}. Therefore, ${t.actor} should ${t.action}." What is the main claim?`;
    return makeItem(
      "clarify_claim",
      index,
      difficulty,
      prompt,
      `${cap(t.actor)} should ${t.action}.`,
      [
        `${cap(t.evidence)}.`,
        `${cap(t.actor)} has already proven the policy will always work.`,
        `${cap(t.irrelevant)}.`,
        `${cap(t.group)} are the only people affected.`
      ],
      "The main claim is the conclusion the argument asks the reader to accept.",
      ["claim", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function termItems() {
  return buildSkill("define_terms", (t, difficulty, offset, index) => {
    const term = vagueTerms[offset];
    const prompt = `${cap(t.actor)} says it will ${t.action} when the change is "${term}" for ${t.group}. Which word most needs a clearer definition before the rule can be applied?`;
    return makeItem(
      "define_terms",
      index,
      difficulty,
      prompt,
      `"${term}"`,
      [
        `"${t.actor.replace(/^the /, "")}"`,
        `"${t.group}"`,
        `"rule"`,
        `"applied"`
      ],
      `The word "${term}" is evaluative or vague, so the argument needs a stable definition for it.`,
      ["vagueness", t.field, `d${difficulty}`, term]
    );
  });
}

function argumentItems() {
  return buildSkill("find_argument", (t, difficulty, offset, index) => {
    const conclusion = `${cap(t.actor)} should ${t.action}.`;
    const premise = `${cap(t.evidence)}.`;
    const background = `${cap(t.irrelevant)}.`;
    const extra = `${cap(t.group)} were included in the report.`;
    const prompt = `Read the passage: "${background} ${premise} Therefore, ${conclusion} ${extra}" Which statement is the conclusion?`;
    return makeItem(
      "find_argument",
      index,
      difficulty,
      prompt,
      conclusion,
      [premise, background, extra, `${cap(t.metric)} was mentioned as context.`],
      "The conclusion is the point supported by the other statements.",
      ["argument-map", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function assumptionItems() {
  return buildSkill("hidden_assumptions", (t, difficulty, offset, index) => {
    const prompt = `Argument: "${cap(t.evidence)}. Therefore, ${t.actor} should ${t.action} across the full program." Which assumption does the argument need?`;
    return makeItem(
      "hidden_assumptions",
      index,
      difficulty,
      prompt,
      `The pilot result is likely to carry over when ${t.action} is used more broadly.`,
      [
        `${cap(t.irrelevant)} is the most important fact about the proposal.`,
        `${cap(t.metric)} can never be measured reliably.`,
        `${cap(t.actor)} should reject every alternative to the proposal.`,
        `${cap(t.group)} caused the pilot result by themselves.`
      ],
      "The conclusion depends on assuming the limited result can support the broader recommendation.",
      ["assumption", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function relevanceItems() {
  return buildSkill("relevance", (t, difficulty, offset, index) => {
    const prompt = `${cap(t.actor)} claims that choosing to ${t.action} will improve ${t.metric}. Which fact is most relevant to evaluating that claim?`;
    return makeItem(
      "relevance",
      index,
      difficulty,
      prompt,
      `A comparable group tried the same action and ${t.metric} improved under similar conditions.`,
      [
        `${cap(t.irrelevant)}.`,
        `The proposal was discussed on a Tuesday afternoon.`,
        `The report includes a photograph of ${t.group}.`,
        `The office uses a newer font in this year's documents.`
      ],
      "Relevant evidence bears directly on whether the proposed action affects the claimed outcome.",
      ["relevance", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function evidenceItems() {
  return buildSkill("evidence_quality", (t, difficulty, offset, index) => {
    const strongest =
      difficulty <= 2
        ? `A representative survey of ${t.group} measured ${t.metric} before and after the change.`
        : `A randomized pilot compared similar groups with and without the change, then measured ${t.metric}.`;
    const prompt = `Which evidence would most strongly support the claim that ${t.action} improves ${t.metric}?`;
    return makeItem(
      "evidence_quality",
      index,
      difficulty,
      prompt,
      strongest,
      [
        `One supporter says the idea feels promising.`,
        `A brochure says ${t.action} is innovative but gives no data.`,
        `Three people on social media praised the proposal.`,
        `A memo repeats that the proposal is useful without describing a method.`
      ],
      "The strongest option uses a method that measures the relevant outcome with a comparison or representative sample.",
      ["evidence", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function sourceItems() {
  return buildSkill("source_reliability", (t, difficulty, offset, index) => {
    const prompt = `A report claims ${t.actor} should ${t.action}. Which detail most weakens the report's reliability?`;
    return makeItem(
      "source_reliability",
      index,
      difficulty,
      prompt,
      `The report was produced by ${t.interestedParty}.`,
      [
        `The report lists its data sources in an appendix.`,
        `The author is ${t.expert}.`,
        `The report explains how ${t.metric} was measured.`,
        `The report includes results that conflict with the author's preference.`
      ],
      "A financial or institutional incentive can weaken source reliability when it may affect the conclusion.",
      ["source", "conflict-of-interest", t.field, `d${difficulty}`]
    );
  });
}

function logicalGapItems() {
  const patterns = [
    (t) => ({
      prompt: `Argument: "One office saw ${t.metric} improve after ${t.action}. Therefore, the same action will work in every ${t.domain} setting." What is the logical gap?`,
      correct: "It generalizes from one case to every case without enough support.",
      explanation: "A single case does not automatically justify a universal conclusion."
    }),
    (t) => ({
      prompt: `Argument: "${cap(t.metric)} improved after ${t.action}. Therefore, the action caused the improvement." What is the logical gap?`,
      correct: "It assumes timing alone proves causation.",
      explanation: "An event happening first does not by itself prove it caused the later change."
    }),
    (t) => ({
      prompt: `Argument: "Most surveyed ${t.group} liked ${t.action}. Therefore, every person affected will benefit from it." What is the logical gap?`,
      correct: "It moves from what most surveyed people liked to what everyone will benefit from.",
      explanation: "Preference among most respondents does not prove universal benefit."
    }),
    (t) => ({
      prompt: `Argument: "The average result improved after ${t.action}. Therefore, each individual ${t.group.slice(0, -1) || t.group} improved." What is the logical gap?`,
      correct: "It treats an average change as proof that every individual changed the same way.",
      explanation: "Averages can rise even when some individuals do not improve."
    })
  ];
  return buildSkill("logical_gaps", (t, difficulty, offset, index) => {
    const pattern = patterns[(offset + difficulty) % patterns.length](t);
    return makeItem(
      "logical_gaps",
      index,
      difficulty,
      pattern.prompt,
      pattern.correct,
      [
        "It gives too many definitions of the same term.",
        "It uses a source with no possible incentive.",
        "It states the conclusion before the evidence.",
        "It includes a concrete number instead of a story."
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
      `Which fallacy appears here? ${fallacy.line(t)}`,
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
        ? `A forecast for ${t.domain} says there is a ${percent}% chance that ${t.metric} will improve next month. Which interpretation is best?`
        : `A signal for ${t.domain} is useful but imperfect, and the problem it flags is uncommon. Which response best treats a positive signal?`;
    const correct =
      difficulty <= 3
        ? `In many similar cases, improvement would happen about ${percent} out of 100 times.`
        : "It should raise concern, but it should not be treated as certainty without checking base rates and errors.";
    return makeItem(
      "probability",
      index,
      difficulty,
      prompt,
      correct,
      difficulty <= 3
        ? [
            `The improvement will last for exactly ${percent}% of the month.`,
            `The improvement is guaranteed because the number is above zero.`,
            `The forecast says ${percent}% of ${t.group} caused the result.`,
            `The result is impossible if the forecast is below 100%.`
          ]
        : [
            "It proves the flagged problem is definitely present.",
            "It should be ignored because every signal has some errors.",
            "It proves the base rate no longer matters.",
            "It means all unflagged cases are risk-free."
          ],
      "Probabilistic claims express degrees of uncertainty, not guarantees.",
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
        : `A report says ${t.metric} rose from ${aEvents}% to ${aEvents + 5}%. What is the most precise description of the change?`;
    const correct =
      difficulty <= 3
        ? aHigher
          ? `Group A, because ${aEvents}/${aTotal} is a higher rate than ${bEvents}/${bTotal}.`
          : `Group B, because ${bEvents}/${bTotal} is a higher rate than ${aEvents}/${aTotal}.`
        : `It rose by 5 percentage points, which is a relative increase of about ${Math.round((5 / aEvents) * 100)}%.`;
    return makeItem(
      "statistical_sense",
      index,
      difficulty,
      prompt,
      correct,
      difficulty <= 3
        ? [
            `Group A, because ${aEvents} is smaller than ${bEvents}.`,
            `Group B, because ${bTotal} is larger than ${aTotal}.`,
            "The rates are automatically equal because both groups are in the same study.",
            "There is no way to compare rates when group sizes differ."
          ]
        : [
            "It rose by 5%, because any move from one percent to another is a 5% change.",
            `It rose by ${aEvents + 5} percentage points, because that is the ending value.`,
            "It doubled, because all five-point changes are doublings.",
            "It cannot be described without knowing the city population."
          ],
      "Statistical comparisons require attention to denominators and the difference between percentage points and relative percent change.",
      ["statistics", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function causationItems() {
  return buildSkill("causation", (t, difficulty, offset, index) => {
    const prompt = `${cap(t.metric)} ${t.outcome} after ${t.actor} chose to ${t.action}. Which criticism best explains why this does not yet prove causation?`;
    return makeItem(
      "causation",
      index,
      difficulty,
      prompt,
      `${cap(t.alternative)}.`,
      [
        `${cap(t.irrelevant)}.`,
        `No event can ever have more than one possible cause.`,
        `A change of ${t.outcome} is always too small to measure.`,
        `${cap(t.actor)} is mentioned before ${t.metric} in the sentence.`
      ],
      "A causal conclusion needs to rule out plausible alternative causes or use a stronger comparison design.",
      ["causation", "confounder", t.field, `d${difficulty}`]
    );
  });
}

function alternativeItems() {
  return buildSkill("alternative_explanations", (t, difficulty, offset, index) => {
    const prompt = `${cap(t.actor)} says ${t.action} caused the change because ${t.metric} ${t.outcome}. Which alternative explanation also fits the facts?`;
    return makeItem(
      "alternative_explanations",
      index,
      difficulty,
      prompt,
      `${cap(t.alternative)}.`,
      [
        `${cap(t.irrelevant)}.`,
        `${cap(t.metric)} cannot change under any circumstances.`,
        `The result must be false because it includes a percentage.`,
        `${cap(t.group)} were not mentioned in the policy name.`
      ],
      "A good alternative explanation accounts for the same observed result without assuming the proposed cause.",
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
      `Which cognitive bias is illustrated here? ${bias.line(t)}`,
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
      : `may shift resources away from a smaller group that was not included in the pilot`;
    const prompt = `${cap(t.actor)} can ${t.action}. The likely benefit is better ${t.metric}, but the plan ${cost}. Which statement best identifies the tradeoff?`;
    return makeItem(
      "tradeoffs",
      index,
      difficulty,
      prompt,
      `The plan may improve ${t.metric} while also using resources that could serve another need.`,
      [
        `The plan has benefits, so it cannot have costs.`,
        `The plan has costs, so it cannot have benefits.`,
        `${cap(t.irrelevant)} is the main tradeoff.`,
        `A tradeoff exists only when every option is equally bad.`
      ],
      "A tradeoff compares what is gained with what is sacrificed or risked.",
      ["tradeoff", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function beliefUpdateItems() {
  return buildSkill("belief_update", (t, difficulty, offset, index) => {
    const evidence =
      difficulty <= 2
        ? `one small pilot where ${t.metric} ${t.outcome}`
        : `a randomized comparison where similar groups with and without the change were measured`;
    const prompt = `You were unsure whether ${t.action} would improve ${t.metric}. You now learn about ${evidence}. What is the most responsible belief update?`;
    const correct =
      difficulty <= 2
        ? "Increase confidence somewhat, while staying open to better evidence."
        : "Increase confidence more substantially, while still avoiding absolute certainty.";
    return makeItem(
      "belief_update",
      index,
      difficulty,
      prompt,
      correct,
      [
        "Become completely certain the action works in every setting.",
        "Ignore the evidence because no single item can matter at all.",
        "Reverse your view even if the new evidence supports your prior view.",
        "Treat the evidence as proof of the opposite claim."
      ],
      "Belief changes should be proportional to the strength and limits of the evidence.",
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

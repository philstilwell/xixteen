import { mkdir, writeFile } from "node:fs/promises";

const DATA_DIR = new URL("../data/", import.meta.url);
const ITEMS_PER_SKILL = 160;
const ITEMS_PER_DIFFICULTY = 32;
const LABELS = ["A", "B", "C", "D"];
const speakerNames = ["Jordan", "Riley", "Maya", "Sam", "Avery", "Taylor", "Morgan", "Casey"];
const difficultyFrames = [
  "",
  "",
  "",
  "",
  ""
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
  topic("evening bus service for late-shift workers", "the city council", "extend evening bus service until midnight", "late-shift commute complaints", "fell by 22%", "a large employer started a private shuttle the same month", "the new buses were repainted blue", "late-shift workers", "transportation"),
  topic("classroom phone lockers", "the school board", "require phone lockers during class", "classroom disruption reports", "fell by 31%", "a new hall monitor schedule began at the same time", "the lockers are installed near the gym", "ninth-grade classrooms", "education"),
  topic("medication reminder texts for older patients", "the hospital", "send medication reminder texts before evening doses", "missed-dose reports", "fell by 18%", "pharmacists also began follow-up calls", "the text messages use a green pill icon", "patients over 60", "health"),
  topic("a four-day workweek test for software engineers", "the company", "test a Monday-through-Thursday workweek", "staff resignations", "fell by 15%", "the company also raised salaries that quarter", "the test calendar starts on a Monday", "software engineers", "workplace"),
  topic("larger grocery unit-price labels", "the grocery chain", "add larger unit-price labels on shelf tags", "shopper overpayment complaints", "fell by 27%", "a local consumer group ran a price-literacy campaign", "the shelf labels use bold black numbers", "weekly grocery shoppers", "retail"),
  topic("late fines on children's books", "the library", "waive late fines for children's books", "library card renewals", "rose by 19%", "the library also opened on Sundays", "the children's-book checkout desk moved six feet", "families checking out children's books", "public services"),
  topic("two-factor login for site administrators", "the platform", "require two-factor login for site administrators", "admin account takeovers", "fell by 44%", "some high-risk admin accounts were removed earlier", "the login button changed from green to blue", "site administrators", "technology"),
  topic("brighter streetlights on Maple Street", "the neighborhood association", "add brighter LED streetlights on Maple Street", "reported thefts", "fell by 12%", "police patrols increased during the same period", "the new light poles are made of aluminum", "residents on Maple Street", "public safety"),
  topic("peer tutoring for first-year statistics students", "the university", "expand peer tutoring in statistics", "course pass rates", "rose by 11%", "the final exam was also shortened", "the tutoring room has new chairs", "first-year statistics students", "education"),
  topic("calorie labels on restaurant menus", "the restaurant group", "show calorie labels on printed lunch menus", "dessert orders", "fell by 16%", "dessert prices increased at the same time", "the lunch menus are printed on thicker paper", "lunch customers", "nutrition"),
  topic("bank overdraft warning texts", "the bank", "send overdraft warning texts before fees post", "overdraft fees", "fell by 24%", "the bank also changed its fee grace period", "the warning texts arrive from a short code", "checking-account customers", "finance"),
  topic("timed-entry passes for weekend park trails", "the park service", "use timed-entry passes for weekend trail visits", "trail crowding complaints", "fell by 33%", "a nearby trail reopened that month", "the digital passes include a small trail map", "weekend trail hikers", "environment"),
  topic("free Friday museum admission", "the museum", "offer free admission on Fridays", "family visits", "rose by 29%", "a new children's exhibit opened the same week", "the Friday tickets are scanned at the east door", "local families", "culture"),
  topic("youth soccer concussion checks", "the sports league", "add mandatory sideline concussion checks", "repeat head injuries", "fell by 21%", "the league also shortened the season", "the concussion checklist is printed on yellow paper", "youth soccer players", "sports"),
  topic("same-day donation receipts", "the nonprofit", "send donation receipts within one day", "donor retention", "rose by 14%", "the nonprofit also launched a matching campaign", "the receipt email subject line changed", "first-time donors", "nonprofit"),
  topic("warehouse ergonomic training", "the warehouse", "offer monthly lifting-safety and ergonomic training", "back-injury claims", "fell by 20%", "new lifting equipment arrived that quarter", "the training room has a ceiling-mounted projector", "warehouse staff", "workplace safety"),
  topic("apartment-lobby compost bins", "the city sanitation office", "place compost bins in apartment lobbies", "landfill waste from participating buildings", "fell by 17%", "trash pickup schedules also changed", "the lobby compost bins have foot pedals", "apartment residents", "environment"),
  topic("private-by-default app profiles", "the app maker", "make new user profiles private by default", "publicly visible profiles", "fell by 48%", "the app also deleted inactive accounts", "the privacy screen uses a shield icon", "new app users", "technology"),
  topic("same-day clinic appointment slots", "the clinic", "reserve same-day appointment slots", "patient no-show rates", "fell by 13%", "the clinic also began reminder calls", "the appointment cards are white", "primary-care patients", "health"),
  topic("seat-zone airline boarding", "the airline", "board passengers by seat zone", "average boarding time", "fell by 9%", "the airline also reduced carry-on size limits", "the gate signs are backlit", "domestic flight passengers", "travel"),
  topic("an online apartment repair portal", "the landlord", "launch an online apartment repair portal", "unresolved repair requests", "fell by 26%", "the landlord hired two additional repair technicians", "the repair portal uses a house logo", "apartment tenants", "housing"),
  topic("fruit placement in a school cafeteria line", "the cafeteria", "move fruit bowls to the front of the cafeteria line", "fruit purchases", "rose by 23%", "a fruit discount started that week", "the fruit bowls are ceramic", "middle-school students", "food"),
  topic("weekly call-center script coaching", "the call center", "give support agents weekly script coaching", "customer complaint rates", "fell by 18%", "the call queue was also shortened", "the coaching slides use blue headers", "support agents", "customer support"),
  topic("household water-leak alerts", "the water utility", "send automatic household water-leak alerts", "average household water use", "fell by 10%", "a rainy season began during the study", "the water-leak alert screen includes a blue droplet icon", "local homeowners", "utilities"),
  topic("body-camera activation reminders", "the police department", "send body-camera activation reminders before patrol shifts", "missing-camera-footage reports", "fell by 35%", "the department also updated supervisor reviews", "the reminder tone is two beeps", "patrol officers", "governance"),
  topic("county mail-ballot tracking", "the election office", "offer online mail-ballot tracking", "phone calls asking ballot status", "fell by 42%", "the office also expanded its phone staff", "the ballot-tracking page uses county colors", "mail voters", "election administration"),
  topic("language-learning spaced-review prompts", "the tutoring app", "send spaced-review prompts for language vocabulary", "vocabulary retention quiz scores", "rose by 12%", "the app also changed the quiz format", "the review prompts use a bell icon", "language learners", "learning"),
  topic("a beginner gym orientation", "the gym", "offer a beginner gym orientation", "new-member cancellations", "fell by 19%", "the gym also discounted annual plans", "the orientation mats are black", "new gym members", "fitness"),
  topic("safe-driving feedback for policyholders", "the insurer", "send weekly safe-driving feedback", "reported minor crashes", "fell by 8%", "fuel prices changed driving patterns that month", "the feedback dashboard uses star ratings", "auto-insurance policyholders", "insurance"),
  topic("top-of-article correction boxes", "the newsroom", "place corrections at the top of articles", "reader trust ratings", "rose by 7%", "the newsroom also hired a public editor", "the correction box has a gray border", "newsletter readers", "media"),
  topic("clearer farmers market price signs", "the farmers market", "require clearer price signs at vendor stalls", "price disputes", "fell by 28%", "the market also added a weekend help desk", "the stall price signs are laminated", "weekend farmers market shoppers", "local commerce"),
  topic("hotel quiet-hours text reminders", "the hotel", "send quiet-hours text reminders to hotel guests", "noise complaints from guest rooms", "fell by 30%", "the hotel also changed room assignments", "the quiet-hours text reminder uses a small moon icon", "overnight hotel guests", "hospitality")
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
    line: (t, speaker, otherSpeaker) => `${speaker} asks for one more small test before ${t.actor} decides. ${otherSpeaker} replies, "${speaker} wants to block every improvement forever."`,
    choiceHint: "misstates a view before attacking it as if it were real",
    explanation: "The reply attacks an exaggerated version of the other person's view."
  },
  {
    name: "False dilemma",
    tag: "false-dilemma",
    line: (t, speaker) => `${speaker} says, "Either ${t.actor} must ${t.action} right now, or it does not care about ${t.group} at all."`,
    choiceHint: "pretends two choices are the only realistic options",
    explanation: "The argument acts like there are only two choices when there may be more."
  },
  {
    name: "Ad hominem",
    tag: "ad-hominem",
    line: (t, speaker, otherSpeaker) => `${speaker} rejects ${otherSpeaker}'s proposal to ${t.action} because ${otherSpeaker} once made a budgeting mistake.`,
    choiceHint: "attacks the person rather than answering the argument",
    explanation: "The response attacks the person instead of the argument."
  },
  {
    name: "Slippery slope",
    tag: "slippery-slope",
    line: (t, speaker) => `${speaker} says, "If ${t.actor} agrees to ${t.action}, soon every related rule will fall apart."`,
    choiceHint: "predicts a chain reaction without enough support",
    explanation: "The argument predicts an extreme chain reaction without support."
  },
  {
    name: "Appeal to popularity",
    tag: "appeal-to-popularity",
    line: (t, speaker) => `${speaker} says ${t.actor} should ${t.action} because the idea received the most likes in an online poll.`,
    choiceHint: "treats popularity as proof the claim is correct",
    explanation: "Popularity is treated as proof that the idea is correct."
  },
  {
    name: "Circular reasoning",
    tag: "circular-reasoning",
    line: (t, speaker) => `${speaker} writes that ${t.actor} should ${t.action} because it is the right move, and it is the right move because it should be done.`,
    choiceHint: "uses the conclusion itself as its main support",
    explanation: "The conclusion is used as its own support."
  },
  {
    name: "Hasty generalization",
    tag: "hasty-generalization",
    line: (t, speaker) => `${speaker} points to one group that reported success with a similar change and says the same result will happen everywhere.`,
    choiceHint: "jumps from little evidence to a broad claim",
    explanation: "A broad conclusion is drawn from too little evidence."
  },
  {
    name: "Red herring",
    tag: "red-herring",
    line: (t, speaker, otherSpeaker) => `${otherSpeaker} asks whether ${t.actionGerund} would affect ${t.metric}. ${speaker} answers by talking about this side detail: ${lowerFirst(phrase(t.irrelevant))}.`,
    choiceHint: "changes the subject instead of addressing the issue",
    explanation: "The response shifts attention to an irrelevant issue."
  },
  {
    name: "Appeal to tradition",
    tag: "appeal-to-tradition",
    line: (t, speaker) => `${speaker} says ${t.actor} should not ${t.action} because the old way has been used for many years.`,
    choiceHint: "treats old habits as proof the claim is right",
    explanation: "The argument treats age or tradition as enough proof."
  },
  {
    name: "Post hoc",
    tag: "post-hoc",
    line: (t, speaker) => `${speaker} says, "${cap(t.afterChangeResult)}, so the policy must have caused the change."`,
    choiceHint: "treats timing as enough proof of cause by itself",
    explanation: "The argument assumes that because one event came after another, the first caused the second."
  }
];

const biasTypes = [
  {
    name: "Confirmation bias",
    tag: "confirmation-bias",
    line: (t, speaker) => `${speaker} reads only comments praising the plan to ${t.action} and ignores equally detailed criticism.`,
    explanation: "The person favors evidence that supports an existing view."
  },
  {
    name: "Availability bias",
    tag: "availability-bias",
    line: (t, speaker) => `${speaker} hears one vivid story about ${t.group} and assumes that example shows what usually happens.`,
    explanation: "A memorable example is treated as more common than it may be."
  },
  {
    name: "Anchoring",
    tag: "anchoring",
    line: (t, speaker) => `${speaker} sees a first cost guess of $900,000 for the plan. After that, ${speaker} treats $850,000 as cheap without checking what the plan should cost.`,
    explanation: "Judgment is pulled toward the first number encountered."
  },
  {
    name: "Sunk cost bias",
    tag: "sunk-cost",
    line: (t, speaker) => `${speaker}'s team keeps funding the plan because it already spent a year developing it, even after early results look poor.`,
    explanation: "Past unrecoverable costs are allowed to drive the current decision."
  },
  {
    name: "Overconfidence bias",
    tag: "overconfidence",
    line: (t, speaker) => `${speaker} predicts exact results from ${t.actionGerund} even though no similar test has been run.`,
    explanation: "The person shows more certainty than the evidence supports."
  },
  {
    name: "Status quo bias",
    tag: "status-quo",
    line: (t, speaker) => `${speaker} rejects the proposal mainly because the current system feels familiar.`,
    explanation: "The current option is favored because it is already in place."
  },
  {
    name: "Motivated reasoning",
    tag: "motivated-reasoning",
    line: (t, speaker) => `${speaker} praises weak evidence supporting ${t.actionGerund} because that conclusion would help ${speaker}'s preferred plan.`,
    explanation: "The evaluation is shaped by the desired conclusion."
  },
  {
    name: "Bandwagon effect",
    tag: "bandwagon",
    line: (t, speaker) => `${speaker} supports ${t.actionGerund} after seeing that most classmates or coworkers support it, without checking the evidence.`,
    explanation: "The person follows the crowd rather than the reasons."
  }
];

const FALLACY_RESOURCES = {
  "Straw man": {
    site: "LogFall",
    title: "Straw man argument",
    url: "https://logfall.com/fallacies/straw-man-argument/"
  },
  "False dilemma": {
    site: "LogFall",
    title: "False dilemma",
    url: "https://logfall.com/fallacies/false-dilemma/"
  },
  "Ad hominem": {
    site: "LogFall",
    title: "Ad hominem",
    url: "https://logfall.com/fallacies/ad-hominem/"
  },
  "Slippery slope": {
    site: "LogFall",
    title: "Slippery slope",
    url: "https://logfall.com/fallacies/slippery-slope/"
  },
  "Appeal to popularity": {
    site: "LogFall",
    title: "Argumentum ad populum",
    url: "https://logfall.com/fallacies/argumentum-ad-populum/"
  },
  "Circular reasoning": {
    site: "LogFall",
    title: "Begging the question",
    url: "https://logfall.com/fallacies/begging-the-question/"
  },
  "Hasty generalization": {
    site: "LogFall",
    title: "Hasty generalization",
    url: "https://logfall.com/fallacies/hasty-generalization/"
  },
  "Red herring": {
    site: "LogFall",
    title: "Red herring",
    url: "https://logfall.com/fallacies/red-herring/"
  },
  "Appeal to tradition": {
    site: "LogFall",
    title: "Appeal to tradition",
    url: "https://logfall.com/fallacies/appeal-to-tradition/"
  },
  "Post hoc": {
    site: "LogFall",
    title: "Post hoc ergo propter hoc",
    url: "https://logfall.com/fallacies/post-hoc-ergo-propter-hoc/"
  }
};

const BIAS_RESOURCES = {
  "Confirmation bias": {
    site: "CogBias",
    title: "Confirmation bias",
    url: "https://cogbias.site/biases/confirmation-bias/"
  },
  "Availability bias": {
    site: "CogBias",
    title: "Availability heuristic",
    url: "https://cogbias.site/biases/availability-heuristic/"
  },
  "Anchoring": {
    site: "CogBias",
    title: "Anchoring effect",
    url: "https://cogbias.site/biases/anchoring-effect/"
  },
  "Sunk cost bias": {
    site: "CogBias",
    title: "Sunk cost effect",
    url: "https://cogbias.site/biases/sunk-cost-effect/"
  },
  "Overconfidence bias": {
    site: "CogBias",
    title: "Overconfidence effect",
    url: "https://cogbias.site/biases/overconfidence-effect/"
  },
  "Status quo bias": {
    site: "CogBias",
    title: "Status quo bias",
    url: "https://cogbias.site/biases/status-quo-bias/"
  },
  "Motivated reasoning": {
    site: "CogBias",
    title: "Motivated reasoning",
    url: "https://cogbias.site/biases/motivated-reasoning/"
  },
  "Bandwagon effect": {
    site: "CogBias",
    title: "Bandwagon effect",
    url: "https://cogbias.site/biases/bandwagon-effect/"
  }
};

function topic(domain, actor, action, metric, outcome, alternative, irrelevant, group, field) {
  const outcomeAmount = outcome.replace(/^(fell|rose) by /, "");
  const testResult = `${metric} ${outcome} compared with the four weeks before the test`;
  const afterChangeResult = `${metric} ${outcome} in the four weeks after the plan began compared with the four weeks before it`;
  return {
    domain,
    actor,
    action,
    actionGerund: gerundize(action),
    metric,
    outcome,
    outcomeAmount,
    testResult,
    afterChangeResult,
    alternative,
    irrelevant,
    group,
    field,
    evidence: `a four-week test with ${group} found that ${testResult}`,
    interestedParty: `a company with a financial stake if ${actor} chose to ${action}`,
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
  return text.replace(/[.!?]+$/, "");
}

function fallacyChoice(name) {
  const fallacy = fallacyTypes.find((entry) => entry.name === name);
  if (!fallacy) {
    throw new Error(`Unknown fallacy: ${name}`);
  }
  return `${fallacy.name}: ${fallacy.choiceHint}`;
}

function resourceForChoice(skillId, choiceText) {
  if (skillId === "fallacies") {
    return FALLACY_RESOURCES[phrase(choiceText).split(":")[0]] || null;
  }
  if (skillId === "cognitive_biases") {
    return BIAS_RESOURCES[phrase(choiceText)] || null;
  }
  return null;
}

function asSentence(text) {
  const clean = text.trim();
  return /[.!?]$/.test(clean) ? cap(clean) : `${cap(clean)}.`;
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

function speakerName(offset, difficulty, shift = 0) {
  return speakerNames[(offset + difficulty + shift) % speakerNames.length];
}

function makeItem(skillId, index, difficulty, prompt, correct, distractors, explanation, tags) {
  const id = `${skillId}-${String(index).padStart(3, "0")}`;
  const choices = uniqueTexts([correct, ...distractors]);
  if (choices.length < 4) {
    throw new Error(`${id} has fewer than four unique choices`);
  }
  const answerIndex = answerIndexFor(skillId, index, difficulty);
  const shuffledDistractors = stableShuffle(choices.slice(1), `${id}:distractors`).slice(0, LABELS.length - 1);
  const arrangedChoices = [];
  let distractorIndex = 0;
  for (let choiceIndex = 0; choiceIndex < LABELS.length; choiceIndex += 1) {
    arrangedChoices.push(choiceIndex === answerIndex ? correct : shuffledDistractors[distractorIndex]);
    if (choiceIndex !== answerIndex) {
      distractorIndex += 1;
    }
  }
  const arrangedLabels = LABELS.slice(0, arrangedChoices.length);
  const feedback = Object.fromEntries(arrangedChoices.map((choiceText, choiceIndex) => [
    arrangedLabels[choiceIndex],
    buildChoiceFeedback({
      skillId,
      choiceText,
      correctText: correct,
      isCorrect: choiceIndex === answerIndex,
      explanation,
      tags
    })
  ]));
  const resources = Object.fromEntries(arrangedChoices.map((choiceText, choiceIndex) => {
    const resource = resourceForChoice(skillId, choiceText);
    return resource ? [arrangedLabels[choiceIndex], { ...resource }] : null;
  }).filter(Boolean));
  return {
    id,
    skill: skillId,
    difficulty,
    prompt: prompt.replace(/\s+/g, " ").trim(),
    choices: arrangedChoices.map((text, choiceIndex) => ({
      id: LABELS[choiceIndex],
      text
    })),
    answer: LABELS[answerIndex],
    explanation,
    feedback,
    resources,
    tags: uniqueTexts([skillId, ...tags])
  };
}

function buildChoiceFeedback({ skillId, choiceText, correctText, isCorrect, explanation, tags }) {
  const text = phrase(choiceText);
  const tagSet = new Set(tags);
  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  if (isCorrect) {
    return normalize(correctFeedback(skillId, text, explanation, tagSet));
  }

  return normalize(incorrectFeedback(skillId, text, correctText, explanation, tagSet));
}

function correctFeedback(skillId, text, explanation, tagSet) {
  switch (skillId) {
    case "clarify_claim":
      return "Correct. This is the recommendation the speaker wants people to accept. The test result is only a reason for that recommendation, and the side details do not state what should be done.";
    case "define_terms":
      return `Correct. ${text} is the word doing the unclear work. Until people define it, they cannot tell what standard the plan has to meet.`;
    case "find_argument":
      return "Correct. This sentence is the conclusion: the point being supported. The other sentences are evidence, background, or information about who the proposal is meant to help.";
    case "hidden_assumptions":
      return `Correct. This is the missing bridge the argument needs before the conclusion can follow. ${explanation}`;
    case "relevance":
      return "Correct. This fact speaks directly to the claim because it checks the same action, target group, or measured result instead of drifting to a side issue.";
    case "evidence_quality":
      return "Correct. This is the strongest evidence because it measures the claimed result in a fairer way, usually with a larger sample, a comparison, repeated settings, or a clear method.";
    case "source_reliability":
      return `Correct. This detail gives readers a concrete reason to trust the source less. ${explanation}`;
    case "logical_gaps":
      return `Correct. This names the step in the reasoning that does not follow from the evidence. ${explanation}`;
    case "fallacies":
      return `Correct. ${explanation} The wording of the choice names the same mistake shown in the debate.`;
    case "probability":
      return "Correct. This answer treats the number or signal as uncertain evidence. Probability gives a chance or reason to check further, not a guarantee.";
    case "statistical_sense":
      return `Correct. This answer reads the numbers with the right comparison. ${explanation}`;
    case "causation":
      return "Correct. This fact gives a live alternative cause, so the observed change cannot yet be credited to the plan alone.";
    case "alternative_explanations":
      return "Correct. This explanation fits the same facts without assuming the proposed plan caused the result.";
    case "cognitive_biases":
      return `Correct. ${explanation} The choice names the bias shown by the person's thinking.`;
    case "tradeoffs":
      return "Correct. This answer keeps both sides of the decision in view: what the plan might improve and what it would cost, delay, or risk.";
    case "belief_update":
      return `Correct. This is the right size and direction of belief change. ${explanation}`;
    default:
      return `Correct. ${explanation}`;
  }
}

function incorrectFeedback(skillId, text, correctText, explanation, tagSet) {
  switch (skillId) {
    case "clarify_claim":
      return claimDistractorFeedback(text);
    case "define_terms":
      return termDistractorFeedback(text);
    case "find_argument":
      return argumentDistractorFeedback(text);
    case "hidden_assumptions":
      return assumptionDistractorFeedback(text, explanation);
    case "relevance":
      return relevanceDistractorFeedback(text);
    case "evidence_quality":
      return evidenceDistractorFeedback(text);
    case "source_reliability":
      return sourceDistractorFeedback(text);
    case "logical_gaps":
      return logicDistractorFeedback(text, explanation);
    case "fallacies":
      return fallacyDistractorFeedback(text, correctText);
    case "probability":
      return probabilityDistractorFeedback(text);
    case "statistical_sense":
      return statsDistractorFeedback(text);
    case "causation":
      return causationDistractorFeedback(text);
    case "alternative_explanations":
      return alternativeDistractorFeedback(text);
    case "cognitive_biases":
      return biasDistractorFeedback(text, correctText);
    case "tradeoffs":
      return tradeoffDistractorFeedback(text);
    case "belief_update":
      return beliefDistractorFeedback(text, tagSet);
    default:
      return `Not quite. This choice does not answer the target question. ${explanation}`;
  }
}

function claimDistractorFeedback(text) {
  if (/\btest|four-week|found|rose|fell|compared\b/i.test(text)) {
    return "Not quite. This is evidence from the test, so it helps support the speaker's point. It is not the claim the speaker is asking people to accept.";
  }
  if (/\bproven|everywhere|without needing more evidence\b/i.test(text)) {
    return "Not quite. This overstates the argument. The speaker recommends the plan, but does not claim it has been proven to work everywhere.";
  }
  if (/\bonly\b|\bno other concern\b/i.test(text)) {
    return "Not quite. This adds an extreme claim about who matters. The speaker's actual claim is the recommendation about the proposal.";
  }
  return "Not quite. This is a side detail from the setup. A main claim is the point the speaker wants accepted, not a visible or background detail.";
}

function termDistractorFeedback(text) {
  if (/approve it/i.test(text)) {
    return "Not quite. People know what approving a proposal means. The unclear part is the standard that decides when approval should happen.";
  }
  if (/the plan/i.test(text)) {
    return "Not quite. The plan has already been named in the setup. The problem is the vague judging word attached to the plan.";
  }
  if (/weighing a proposal/i.test(text)) {
    return "Not quite. This phrase describes the meeting context. It is not the slippery word people need to define.";
  }
  return "Not quite. This phrase identifies the group or proposal, but it does not set an unclear standard for judging the plan.";
}

function argumentDistractorFeedback(text) {
  if (/\btest|found|rose|fell|compared\b/i.test(text)) {
    return "Not quite. This sentence gives a reason or evidence. A conclusion is the point that reason is meant to support.";
  }
  if (/\bproposal is meant|group the proposal|meant mainly\b/i.test(text)) {
    return "Not quite. This is background about the proposal's audience. It helps set the scene, but it is not the point being argued for.";
  }
  return "Not quite. This is a background detail. The conclusion is the sentence that follows from the reasons and says what should be accepted.";
}

function assumptionDistractorFeedback(text, explanation) {
  if (/side detail/i.test(text)) {
    return "Not quite. A side detail may be noticeable, but the argument does not need it to be true. A hidden assumption must connect the reason to the conclusion.";
  }
  if (/never be measured|cannot.*measured/i.test(text)) {
    return "Not quite. This would actually weaken the argument by saying the result cannot be checked. The needed assumption helps the evidence count.";
  }
  if (/reject every alternative/i.test(text)) {
    return "Not quite. Critical thinking does not require rejecting every alternative before looking at evidence. The needed assumption is narrower.";
  }
  return `Not quite. This does not supply the missing bridge in the argument. ${explanation}`;
}

function relevanceDistractorFeedback(text) {
  if (/liked the idea|like the plan|sounds good|reactions/i.test(text)) {
    return "Not quite. People's reactions may be interesting, but liking a plan is not the same as checking whether the claimed result happened.";
  }
  if (/story describes/i.test(text)) {
    return "Not quite. A detailed story can feel convincing, but this one still does not measure the result named in the claim.";
  }
  return "Not quite. This fact is mostly a side detail. Relevant evidence should bear directly on the action, group, or result named in the claim.";
}

function evidenceDistractorFeedback(text) {
  if (/friend says|feels promising/i.test(text)) {
    return "Not quite. A friend's impression is weak evidence because it gives no measured result and no fair comparison.";
  }
  if (/brochure/i.test(text)) {
    return "Not quite. A brochure can explain how a plan is supposed to work, but explanation is not the same as evidence that it did work.";
  }
  if (/social media|three people/i.test(text)) {
    return "Not quite. A few reactions on social media are too thin and unmeasured to be strong evidence about the result.";
  }
  if (/after the change|what it was before/i.test(text)) {
    return "Not quite. Measuring only after the change leaves out the baseline, so it is hard to tell whether anything improved.";
  }
  return "Not quite. This option lacks the fair measurement, comparison, or clear method that would make the evidence strong.";
}

function sourceDistractorFeedback(text) {
  if (/names who collected/i.test(text)) {
    return "Not quite. Naming who collected the data usually makes a report easier to check, so it is not a reason by itself to trust it less.";
  }
  if (/expert who has studied|author is/i.test(text)) {
    return "Not quite. Relevant expertise usually makes a source more trustworthy, not less, unless there is another problem.";
  }
  if (/lists where the data came from|includes results that do not favor/i.test(text)) {
    return "Not quite. Openness about data sources and unfavorable results is a trust-building sign, not a warning sign.";
  }
  return "Not quite. This detail does not create a clear source problem such as hidden methods, weak expertise, tilted sampling, or a strong motive to mislead.";
}

function logicDistractorFeedback(text, explanation) {
  if (/definitions|word meaning/i.test(text)) {
    return "Not quite. The issue is not that a word is vague. The problem is a jump in reasoning from the evidence to the conclusion.";
  }
  if (/source/i.test(text)) {
    return "Not quite. The argument may have a source, but the question asks about the logic of the inference, not source reliability.";
  }
  if (/conclusion after the evidence/i.test(text)) {
    return "Not quite. Putting a conclusion after evidence is normal argument structure. That is not a logical gap by itself.";
  }
  if (/includes a number/i.test(text)) {
    return "Not quite. Numbers can be useful evidence. The issue is how the argument moves from the number to a stronger claim.";
  }
  return `Not quite. This does not identify the inference problem. ${explanation}`;
}

function fallacyDistractorFeedback(text, correctText) {
  const chosenName = text.split(":")[0];
  const correctName = correctText.split(":")[0];
  const chosen = fallacyTypes.find((entry) => entry.name === chosenName);
  const correct = fallacyTypes.find((entry) => entry.name === correctName);
  if (chosen && correct) {
    return `Not quite. ${chosen.name} would involve a different mistake: it ${chosen.choiceHint}. The debate instead matches ${correct.name.toLowerCase()}.`;
  }
  return "Not quite. This names a real bad-argument pattern, but it is not the pattern shown in the scenario.";
}

function probabilityDistractorFeedback(text) {
  if (/exactly|last for/i.test(text)) {
    return "Not quite. A probability does not say exactly how long a result will last in one case. It estimates chance across cases.";
  }
  if (/guaranteed|no uncertainty/i.test(text)) {
    return "Not quite. A nonzero chance is not a guarantee. Probability is useful precisely because uncertainty remains.";
  }
  if (/impossible unless|100%/i.test(text)) {
    return "Not quite. A result can be possible even when its chance is below 100%. Treating probability as all-or-nothing is the mistake.";
  }
  if (/Ignore the signal/i.test(text)) {
    return "Not quite. False alarms mean the signal is not proof, but they do not mean the signal should be ignored.";
  }
  if (/definitely|no follow-up/i.test(text)) {
    return "Not quite. A positive signal can be wrong, so it calls for follow-up rather than certainty.";
  }
  return "Not quite. This treats the signal too absolutely. Good probability thinking keeps both evidence and uncertainty in view.";
}

function statsDistractorFeedback(text) {
  if (/raw count|smaller than|must be better/i.test(text)) {
    return "Not quite. Raw counts can mislead when group sizes differ. The fair comparison is the rate.";
  }
  if (/larger.*higher rate|bigger group/i.test(text)) {
    return "Not quite. A bigger group does not automatically have the higher rate. You still have to divide events by observations.";
  }
  if (/automatically equal/i.test(text)) {
    return "Not quite. Being in the same comparison does not make the rates equal. The given counts and group sizes decide the rates.";
  }
  if (/no way to compare rates/i.test(text)) {
    return "Not quite. Different group sizes are exactly when rates are useful; the counts and totals are enough to compare.";
  }
  if (/starting value does not matter/i.test(text)) {
    return "Not quite. Percentage-point change and percent change are different, and percent change depends on the starting value.";
  }
  if (/ending value should be used/i.test(text)) {
    return "Not quite. Percentage points are found by subtracting the starting rate from the ending rate, not by copying the ending value.";
  }
  if (/doubled|cut in half/i.test(text)) {
    return "Not quite. A five-point change is not automatically doubling or halving. That depends on the starting number.";
  }
  return "Not quite. The needed information is already in the rates given; extra population facts are not required for this comparison.";
}

function causationDistractorFeedback(text) {
  if (/includes a percentage/i.test(text)) {
    return "Not quite. A percentage can describe a change, but it does not by itself show what caused the change.";
  }
  if (/never have more than one possible cause/i.test(text)) {
    return "Not quite. Real outcomes can have more than one possible cause. That is exactly why a cause claim needs more support.";
  }
  return "Not quite. A visible side detail does not rule out other causes or show that the plan caused the result.";
}

function alternativeDistractorFeedback(text) {
  if (/includes a percentage/i.test(text)) {
    return "Not quite. A percentage describes the result, but it does not give another explanation for why the result happened.";
  }
  if (/cannot change|no explanation is needed/i.test(text)) {
    return "Not quite. The setup says the result changed, so saying change is impossible clashes with the facts.";
  }
  return "Not quite. This jumps from a side detail to 'the only cause.' A good alternative explanation fits the facts without overclaiming.";
}

function biasDistractorFeedback(text, correctText) {
  const chosen = biasTypes.find((entry) => entry.name === text);
  const correct = biasTypes.find((entry) => entry.name === correctText);
  if (chosen && correct) {
    return `Not quite. ${chosen.name} is a real bias, but it points to a different pattern: ${lowerFirst(chosen.explanation)} This scenario shows ${correct.name.toLowerCase()}.`;
  }
  return "Not quite. This names a real bias, but it does not match the thinking pattern shown in the scenario.";
}

function tradeoffDistractorFeedback(text) {
  if (/Costs never matter/i.test(text)) {
    return "Not quite. Costs are part of the tradeoff. A benefit can be real and still need to be weighed against what it uses up.";
  }
  if (/unrelated detail/i.test(text)) {
    return "Not quite. A random visible detail is not the tradeoff. The tradeoff is between the plan's possible benefit and its cost or risk.";
  }
  return "Not quite. A tradeoff does not require every option to be bad. It simply asks what is gained and what is given up.";
}

function beliefDistractorFeedback(text, tagSet) {
  if (/final proof|certain|guaranteed/i.test(text)) {
    return "Not quite. The evidence may matter, but this answer overreacts by treating limited evidence as certainty.";
  }
  if (/Ignore|Ignore the evidence|Ignore the result/i.test(text)) {
    return "Not quite. Limited or mixed evidence may deserve only a small update, but ignoring relevant evidence throws away information.";
  }
  if (/Lower confidence|Decrease confidence|points the right way/i.test(text)) {
    return "Not quite. This moves confidence in the wrong direction for evidence that supports the claim.";
  }
  if (/Raise confidence|upward|points the wrong way/i.test(text)) {
    return "Not quite. This moves confidence in the wrong direction for evidence that counts against the claim.";
  }
  if (/opposite claim|opposite/i.test(text)) {
    return "Not quite. This flips too far. Evidence may support, weaken, or fail to affect a claim without proving the opposite.";
  }
  if (/every new detail is useful|side detail weakens/i.test(text)) {
    return "Not quite. Confidence should move because of relevant evidence, not just because a new detail appeared.";
  }
  return tagSet.has("irrelevant-detail")
    ? "Not quite. The detail does not test the claim, so it should not move confidence much."
    : "Not quite. This answer updates by the wrong amount or in the wrong direction for the evidence given.";
}

function answerIndexFor(skillId, index, difficulty) {
  const itemOffset = (index - 1) % ITEMS_PER_DIFFICULTY;
  const offsetOrder = stableShuffle(
    Array.from({ length: ITEMS_PER_DIFFICULTY }, (_, offset) => offset),
    `${skillId}:d${difficulty}:answer-offsets`
  );
  return offsetOrder.indexOf(itemOffset) % LABELS.length;
}

function withFrame(difficulty, prompt) {
  const frame = difficultyFrames[difficulty - 1];
  return frame ? `${frame} ${prompt}` : prompt;
}

function decisionSetup(t) {
  return `${cap(t.actor)} is weighing a proposal aimed at ${t.group}: ${t.action}.`;
}

function trialResult(t) {
  return asSentence(t.evidence);
}

function oppositeTestResult(t) {
  const opposite = t.outcome.startsWith("fell") ? "rose" : "fell";
  return `${t.metric} ${opposite} by ${t.outcomeAmount} compared with the four weeks before the test`;
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

function alternativeCause(t) {
  return `${cap(phrase(t.alternative))}, which could also explain the change.`;
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
    const speaker = speakerName(offset, difficulty);
    const prompt = `${decisionSetup(t)} ${trialResult(t)} ${speaker}, who supports the proposal, says, "Because of that test, ${t.actor} should ${t.action}." Which claim is ${speaker} asking people to accept?`;
    return makeItem(
      "clarify_claim",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `${cap(t.actor)} should ${t.action}.`,
      [
        asSentence(t.evidence),
        `${cap(t.actor)} has proven the idea will work everywhere without needing more evidence.`,
        asSentence(t.irrelevant),
        `${cap(t.group)} are the only ones affected, so no other concern matters.`
      ],
      `${speaker}'s main claim is the recommendation. The test result is a reason offered for that claim, not the claim itself.`,
      ["claim", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function termItems() {
  return buildSkill("define_terms", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const term = vagueTerms[offset];
    const prompt = `${decisionSetup(t)} At the meeting, ${speaker} says, "Let's approve it only if the plan is ${term}." Which word or phrase needs a clearer meaning before people can judge what ${speaker} means?`;
    return makeItem(
      "define_terms",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      `"${term}"`,
      [
        `"approve it"`,
        `"the plan"`,
        `"weighing a proposal"`,
        `"aimed at ${t.group}"`
      ],
      `The word "${term}" is vague here. People need a clear definition before they can tell whether the plan meets the rule.`,
      ["vagueness", t.field, `d${difficulty}`, term]
    );
  });
}

function argumentItems() {
  return buildSkill("find_argument", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const conclusionText = `${t.actor} should ${t.action}.`;
    const conclusion = cap(conclusionText);
    const premise = asSentence(t.evidence);
    const background = asSentence(t.irrelevant);
    const extra = `The proposal is meant mainly for ${t.group}.`;
    const prompt = `At a meeting about ${t.domain}, ${speaker} says, "${background} ${premise} Therefore, ${conclusionText} ${extra}" Which sentence is ${speaker}'s conclusion?`;
    return makeItem(
      "find_argument",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      conclusion,
      [
        premise,
        background,
        extra
      ],
      `The conclusion is ${speaker}'s point. The test result is a reason offered to support it.`,
      ["argument-map", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function assumptionItems() {
  const cases = [
    (t, speaker, variant) => ({
      tag: "scale-up",
      prompt: `${decisionSetup(t)} ${trialResult(t)} ${speaker} argues, "That test is enough reason to use the plan more widely." Which hidden assumption does ${speaker}'s argument need?`,
      correct: [
        "The test group is similar enough to the wider group that the result can guide the decision.",
        "The people in the test are enough like the wider group for the result to matter.",
        "The small test is close enough to the real rollout to count as useful evidence.",
        "The wider group is enough like the test group that the result is a fair clue.",
        "The test setting matches the bigger decision closely enough for the result to matter."
      ][variant % 5],
      explanation: "The hidden assumption is that the test is a fair guide to the bigger decision."
    }),
    (t, speaker, variant) => ({
      tag: "cause-link",
      prompt: `${decisionSetup(t)} ${trialResult(t)} ${speaker} says, "The plan caused that result." Which hidden assumption does ${speaker}'s argument need?`,
      correct: [
        "No other major change during the test better explains the result than the plan does.",
        "Nothing else important changed during the test in a way that better explains the result.",
        "The result is not better explained by another change that happened during the test.",
        "Other changes during the test were not strong enough to explain the result better.",
        "The plan is the best explanation of the result, not some other change at the same time."
      ][variant % 5],
      explanation: "The hidden assumption is that the result came from the plan, not from another cause."
    }),
    (t, speaker, variant) => ({
      tag: "measure-link",
      prompt: `${decisionSetup(t)} ${trialResult(t)} ${speaker} says, "That means the plan helped ${t.group}." Which hidden assumption does ${speaker}'s argument need?`,
      correct: [
        "The measured result is a reasonable sign that the plan helped the target group.",
        "The result being measured is the right kind of evidence for whether the plan helped.",
        "Improvement in the tracked result would count as a real sign of help for the group.",
        "The measurement is close enough to the goal to show whether the group was helped.",
        "The tracked result is a fair way to judge whether the plan helped the people involved."
      ][variant % 5],
      explanation: "The hidden assumption is that the measured result is a good sign of whether the plan helped."
    }),
    (t, speaker, variant) => ({
      tag: "goal-worth",
      prompt: `${decisionSetup(t)} ${speaker} says, "If the plan can ${resultGoal(t)}, then it should be adopted." Which hidden assumption does ${speaker}'s argument need?`,
      correct: [
        `${cap(resultGerund(t))} ${t.metric} would matter enough to count in this decision.`,
        `${cap(resultGerund(t))} ${t.metric} is important enough to help justify the plan.`,
        `A real change in ${t.metric} would be valuable enough to matter for the decision.`,
        `The goal of ${resultGerund(t)} ${t.metric} is important enough to help decide what to do.`,
        `${cap(t.metric)} matters enough that improving it could be a serious reason for the plan.`
      ][variant % 5],
      explanation: "The hidden assumption is that the hoped-for result is important enough to count as a real reason."
    }),
    (t, speaker, variant) => ({
      tag: "lasting-result",
      prompt: `${decisionSetup(t)} ${trialResult(t)} ${speaker} says, "The result will continue if the plan becomes permanent." Which hidden assumption does ${speaker}'s argument need?`,
      correct: [
        "The short-term result will not disappear once the test period ends.",
        "The result from the short test will last long enough to matter after the rollout.",
        "The test result is not just a temporary bump that fades when the test is over.",
        "The improvement seen during the test will continue if the plan becomes permanent.",
        "The four-week result is stable enough to be useful for a longer-term decision."
      ][variant % 5],
      explanation: "The hidden assumption is that the short test result will last long enough to matter."
    })
  ];
  return buildSkill("hidden_assumptions", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const variant = Math.floor(offset / cases.length) + difficulty - 1;
    const itemCase = cases[(offset + difficulty - 1) % cases.length](t, speaker, variant);
    return makeItem(
      "hidden_assumptions",
      index,
      difficulty,
      withFrame(difficulty, itemCase.prompt),
      itemCase.correct,
      [
        "The side detail decides the issue.",
        `${cap(t.metric)} can never be measured reliably, no matter how carefully people try.`,
        `${cap(t.actor)} should reject every alternative before checking any other evidence, even if it is relevant.`
      ],
      itemCase.explanation,
      ["assumption", itemCase.tag, t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function relevanceItems() {
  const cases = [
    (t, variant) => ({
      tag: "similar-group",
      correct: [
        "A comparable group tried the plan and saw the tracked result improve under similar conditions.",
        "Another group in a similar setting used the plan and the same result improved.",
        "A comparable group tried the plan, and the result being checked moved in the right direction.",
        "A similar group used the plan under similar conditions and the tracked result improved.",
        "A group like the target group tried the plan and saw the result improve in the same area."
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "direct-measure",
      correct: [
        "Researchers measured the actual result before and after the plan was tried.",
        "The report tracked the claimed result both before the plan and after the plan.",
        "Before-and-after data compare the result from before the plan with the result after it began.",
        "A careful check focused on the result named in the claim, not just people's reactions to the idea.",
        "The report measures whether the result actually changed after the plan was used."
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "target-group",
      correct: [
        "The actual result was measured in the group the proposal is meant to help.",
        "The report checks the claimed result among the people the plan is supposed to affect.",
        "Data come from the target group, not from a different group with different needs.",
        "Researchers looked at the result for the same people the proposal is meant to help.",
        "The report measures the claimed result in the group named in the proposal."
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "comparison-group",
      correct: [
        "A matched group that did not use the plan was tracked so the result could be compared.",
        "Researchers included a similar group without the plan, giving the result a fair comparison.",
        "A comparison group was tracked at the same time, so the plan's result could be checked.",
        "The report compares the target group with a similar group that did not use the plan.",
        "A no-plan group was measured too, making the result easier to interpret."
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "outcome-specific",
      correct: [
        `The report checked ${t.metric}, not just whether people said they liked the idea.`,
        `Direct measurement tracks ${t.metric} instead of only asking whether the plan sounds good.`,
        `The report focuses on ${t.metric}, which is the result named in the claim.`,
        `A careful check measured whether ${t.metric} changed, not merely whether people approved of the plan.`,
        `Because it is about ${t.metric}, the fact speaks to the exact result being claimed.`
      ][variant % 5]
    })
  ];
  return buildSkill("relevance", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const variant = Math.floor(offset / cases.length) + difficulty - 1;
    const itemCase = cases[(offset + difficulty - 1) % cases.length](t, variant);
    const prompt = `${speaker} claims the proposal to ${t.action} will ${resultGoal(t)}. Which fact matters most for checking that claim?`;
    return makeItem(
      "relevance",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      itemCase.correct,
      [
        asSentence(t.irrelevant),
        `A report says some ${t.group} liked the idea, but it does not check the claimed result.`,
        `A detailed story describes why people like the plan, but it still does not measure whether ${t.metric} changed.`
      ],
      `Relevant evidence directly helps check whether the proposed action affects the result ${speaker} claimed.`,
      ["relevance", itemCase.tag, t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function evidenceItems() {
  const cases = [
    (t, variant) => ({
      tag: "large-before-after",
      correct: [
        `A large, fair study measured ${t.metric} before and after the change.`,
        `Many people were included, and researchers measured ${t.metric} before and after the plan.`,
        `A fair before-and-after study used a large sample to track ${t.metric}.`,
        `Researchers used a large sample and checked ${t.metric} both before and after the change.`,
        `The evidence covers many cases and measures ${t.metric} on both sides of the change.`
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "random-comparison",
      correct: [
        `A random test compared similar groups with and without the change, then measured ${t.metric}.`,
        `Similar groups were randomly assigned to use or not use the plan, then ${t.metric} was measured.`,
        `Researchers randomly compared a plan group with a no-plan group and tracked ${t.metric}.`,
        `The plan was tested against a similar no-plan group chosen by random assignment.`,
        `A fair random comparison measured ${t.metric} in both the plan group and the no-plan group.`
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "independent-team",
      correct: [
        `Independent researchers used the same method to measure ${t.metric} before and after the plan.`,
        `A team not connected to the proposal measured ${t.metric} with the same method each time.`,
        `Outside researchers checked ${t.metric} before and after the plan using a consistent method.`,
        `The measurement was done by an independent team using the same rules before and after.`,
        `People outside the project collected comparable before-and-after data on ${t.metric}.`
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "repeated-settings",
      correct: [
        `Several similar settings tried the plan, and each one measured ${t.metric} the same way.`,
        `The plan was tried in several similar places, with ${t.metric} measured consistently in each one.`,
        `Multiple similar settings tracked ${t.metric} using the same method after trying the plan.`,
        `Results from several similar places were checked with the same measure of ${t.metric}.`,
        `Comparable sites each tried the plan and used the same method to track ${t.metric}.`
      ][variant % 5]
    }),
    (t, variant) => ({
      tag: "clear-sample",
      correct: [
        `The study reported its sample size, comparison method, and results for ${t.metric}.`,
        `The report gave the sample size, comparison method, and measured result for ${t.metric}.`,
        `Researchers listed how many cases were studied, how they compared them, and what happened to ${t.metric}.`,
        `A study write-up included the sample size, method, and results for ${t.metric}.`,
        `The evidence states who was measured, how the comparison worked, and what changed in ${t.metric}.`
      ][variant % 5]
    })
  ];
  return buildSkill("evidence_quality", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const variant = Math.floor(offset / cases.length) + difficulty - 1;
    const itemCase = cases[(offset + difficulty - 1) % cases.length](t, variant);
    const prompt = `${speaker} wants to know whether the proposal to ${t.action} actually helps ${t.group} by ${resultGerund(t)} ${t.metric}. Which evidence would be strongest?`;
    return makeItem(
      "evidence_quality",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      itemCase.correct,
      [
        `${speaker}'s friend says the idea feels promising but gives no data about ${t.metric}.`,
        `A brochure explains how ${t.actionGerund} would work but does not measure ${t.metric} or compare groups.`,
        `Three people on social media say they like the idea after hearing about it, but no results are reported.`,
        `A report measured ${t.metric} after the change but did not say what it was before the plan.`
      ],
      "The strongest option measures the result in a fair way, often with a comparison group.",
      ["evidence", itemCase.tag, t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function sourceItems() {
  const financialMotiveAnswers = [
    () => "A company that sells services tied to the recommendation helped write the report.",
    () => "The author works for a firm bidding to run part of the plan.",
    () => "The report was sponsored by a supplier that could be hired if the plan passed.",
    () => "A consultant who helped design the plan was paid to evaluate it.",
    () => "The publisher sells products connected to the recommendation.",
    () => "The report comes from a group seeking the contract created by the plan."
  ];
  const missingMethodAnswers = [
    () => "The report does not say how the data was gathered.",
    () => "The report gives results but no sample size, dates, or data source.",
    () => "The report never explains who was surveyed or how they were chosen.",
    () => "The methods section is missing, so readers cannot check the process.",
    () => "The report gives a conclusion but no way to inspect the raw data."
  ];
  const noExpertiseAnswers = [
    () => "The author has no relevant expertise and cites no one who does.",
    () => "The author works outside the topic area and does not quote experts.",
    () => "The report is written by a publicity intern with no background in the field.",
    () => "No expert source is named, even though the report makes technical claims.",
    () => "The author gives no qualifications for judging this kind of plan."
  ];
  const cherryPickedAnswers = [
    () => "The report leaves out results that went against its conclusion.",
    () => "The author reports only the best month and skips weaker months.",
    () => "The report mentions successes but leaves out failed trials of the same plan.",
    () => "Several negative results were collected but not included in the summary.",
    () => "The chart starts after the worst results had already happened."
  ];
  const biasedSampleAnswers = [
    () => "The survey only included people who already supported the plan.",
    () => "The survey came from a signup list for fans of the proposal.",
    () => "People who disliked the plan were not invited to answer the survey.",
    () => "The sample was drawn from a meeting organized by supporters of the plan.",
    () => "Only people who had already benefited from the plan were surveyed."
  ];
  const cases = [
    (t, variant) => ({
      tag: "profit-motive",
      correct: financialMotiveAnswers[variant % financialMotiveAnswers.length](t),
      explanation: "A source is less trustworthy when it may profit from the answer it gives."
    }),
    (t, variant) => ({
      tag: "missing-method",
      correct: missingMethodAnswers[variant % missingMethodAnswers.length](t),
      explanation: "A source is less trustworthy when readers cannot check its method."
    }),
    (t, variant) => ({
      tag: "no-expertise",
      correct: noExpertiseAnswers[variant % noExpertiseAnswers.length](t),
      explanation: "A source is less trustworthy when it lacks expertise on the topic."
    }),
    (t, variant) => ({
      tag: "cherry-picked",
      correct: cherryPickedAnswers[variant % cherryPickedAnswers.length](t),
      explanation: "A source is less trustworthy when it hides inconvenient evidence."
    }),
    (t, variant) => ({
      tag: "biased-sample",
      correct: biasedSampleAnswers[variant % biasedSampleAnswers.length](t),
      explanation: "A source is less trustworthy when its sample is tilted toward one answer."
    })
  ];
  return buildSkill("source_reliability", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const variant = Math.floor(offset / cases.length) + difficulty - 1;
    const itemCase = cases[(offset + difficulty - 1) % cases.length](t, variant);
    const prompt = `${speaker} reads a report about ${t.domain}. The report recommends that ${t.actor} ${t.action}, and it claims the plan would ${resultGoal(t)}. Which detail would make ${speaker} trust the report less?`;
    return makeItem(
      "source_reliability",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      itemCase.correct,
      [
        "The report names who collected the data.",
        `The author is ${t.expert}.`,
        "The report lists where the data came from and includes results that do not favor the author."
      ],
      itemCase.explanation,
      ["source", itemCase.tag, t.field, `d${difficulty}`]
    );
  });
}

function logicalGapItems() {
  const patterns = [
    (t, speaker, variant) => ({
      prompt: `At a planning meeting about ${t.domain}, ${speaker} says, "In one group that tried ${t.actionGerund}, ${t.testResult}. So this plan will work in every similar setting." What is the logical gap in ${speaker}'s reasoning?`,
      correct: [
        "The argument generalizes from one case to every case without enough support.",
        "One successful example is used as if it proves the result will happen everywhere.",
        "One group improved, but that does not show all similar settings will improve too.",
        "One test is assumed to be enough to show the plan will work in every setting.",
        "A single success becomes a much broader claim than the evidence supports."
      ][variant % 5],
      explanation: "The logical gap is the jump from one case to every case. One success does not prove the same thing will happen everywhere."
    }),
    (t, speaker, variant) => ({
      prompt: `In a memo about ${t.domain}, ${speaker} writes, "During a small trial of ${t.actionGerund}, ${t.testResult}. So the action caused the change." What is the logical gap in ${speaker}'s reasoning?`,
      correct: [
        "Timing alone is treated as proof of causation, without ruling out other causes.",
        "A before-and-after change is used as proof of cause without more evidence.",
        "The action is assumed to be the cause just because the change came after it.",
        "The reasoning moves from sequence to cause without checking what else changed.",
        "Timing is counted as enough evidence even though another cause could explain the result."
      ][variant % 5],
      explanation: "The logical gap is treating timing as proof of cause. Something happening first does not, by itself, prove it caused what came next."
    }),
    (t, speaker, variant) => ({
      prompt: `${speaker} says, "Most ${t.group} asked in a survey liked ${t.actionGerund}. So every person affected will benefit from it." What is the logical gap in ${speaker}'s reasoning?`,
      correct: [
        "The claim moves from what most surveyed people liked to what everyone will benefit from.",
        "Most survey approval is used as proof that every affected person will be helped.",
        "Liking the plan is treated as proof that the plan benefits every person affected.",
        "A survey of most people is assumed to show that every person will benefit.",
        "People liking the plan is confused with evidence that the plan helps everyone."
      ][variant % 5],
      explanation: "The logical gap is moving from most surveyed people to every affected person. Liking a plan also does not prove the plan helps."
    }),
    (t, speaker, variant) => ({
      prompt: `A report says the average result improved after ${t.actionGerund}. ${speaker} concludes, "That means every person in the group improved." What is the logical gap in ${speaker}'s reasoning?`,
      correct: [
        "The average change is used as proof that every individual changed the same way.",
        "The group average is assumed to show what happened to each individual person.",
        "The reasoning stretches an average improvement into the claim that everyone improved.",
        "A group-level result is read as if it proves the same result for every person.",
        "Some people may not improve even when the average does, and the argument misses that."
      ][variant % 5],
      explanation: "The logical gap is that an average can go up even when some people do not improve."
    })
  ];
  return buildSkill("logical_gaps", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const variant = Math.floor(offset / patterns.length) + difficulty - 1;
    const pattern = patterns[(offset + difficulty) % patterns.length](t, speaker, variant);
    return makeItem(
      "logical_gaps",
      index,
      difficulty,
      withFrame(difficulty, pattern.prompt),
      pattern.correct,
      [
        "It gives too many definitions, even though the issue is not word meaning.",
        "It criticizes a source, even though the source is not described in the argument.",
        "It puts the conclusion after the evidence, which is not a reasoning problem by itself.",
        "It includes a number, even though numbers can still be useful evidence when read carefully."
      ],
      pattern.explanation,
      ["logic", t.field, `d${difficulty}`, `pattern-${(offset + difficulty) % patterns.length}`]
    );
  });
}

function fallacyItems() {
  return buildSkill("fallacies", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const otherSpeaker = speakerName(offset, difficulty, 3);
    const fallacy = fallacyTypes[(offset + difficulty - 1) % fallacyTypes.length];
    const otherNames = fallacyTypes
      .filter((entry) => entry.name !== fallacy.name)
      .map((entry) => entry.name);
    return makeItem(
      "fallacies",
      index,
      difficulty,
      withFrame(difficulty, `During a debate about ${t.domain}, ${fallacy.line(t, speaker, otherSpeaker)} Which fallacy is showing up?`),
      fallacyChoice(fallacy.name),
      stableShuffle(otherNames, `${fallacy.name}:${index}`).slice(0, 3).map(fallacyChoice),
      `${fallacy.name}: ${fallacy.explanation}`,
      ["fallacy", fallacy.tag, t.field, `d${difficulty}`]
    );
  });
}

function probabilityItems() {
  const percentages = [20, 25, 30, 40, 55, 60, 65, 70, 75, 80, 85, 90, 15, 35, 45, 50];
  const forecastAnswers = [
    (percent) => `In many similar cases, the improvement would happen about ${percent} out of 100 times.`,
    (percent) => `If there were 100 similar forecasts, about ${percent} would be expected to improve.`,
    (percent) => `The forecast says improvement is possible but not guaranteed: about ${percent} chances in 100.`,
    (percent) => `It leaves room for the result not to happen, because ${percent}% is a chance rather than a promise.`,
    (percent) => `The number estimates how often this improvement would happen across many similar cases.`,
    (percent) => `Out of 100 cases like this, roughly ${percent} would be expected to improve.`,
    (percent) => `A ${percent}-out-of-100 chance means the result may happen, but it may not.`,
    (percent) => `The percentage describes a chance across repeated similar cases, not a promise for this one.`,
    (percent) => `About ${percent} of 100 similar situations would be expected to show the improvement.`,
    (percent) => `This is a likelihood estimate: the result is possible, not certain.`
  ];
  const signalAnswers = [
    "Use the signal as a reason to check further, not as proof that the problem is there.",
    "Check the base rate and false-alarm rate before treating the signal as strong evidence.",
    "See the signal as evidence to investigate, while remembering that it is not certainty.",
    "Take the signal seriously, but ask how often this kind of tool is wrong.",
    "Update cautiously because a positive signal can still turn out to be a false alarm."
  ];
  return buildSkill("probability", (t, difficulty, offset, index) => {
    const percent = percentages[(offset + difficulty) % percentages.length];
    const answerVariant = offset + difficulty - 1;
    const signalPrompt = difficulty === 4
      ? `A screening tool connected to ${t.domain} flags possible problems. It catches many real problems, but it also gives false alarms. The problem is uncommon in the group being screened. What is the best way to treat a positive signal?`
      : `A screening tool connected to ${t.domain} gives a positive signal for one case. The tool catches many real problems, but false alarms are common, and only a small share of cases have the problem. What is the best way to treat that signal?`;
    const prompt =
      difficulty <= 3
        ? `A month-ahead forecast for ${t.domain} says the chance is ${percent} out of 100 that ${t.metric} will ${resultFuture(t)}. What does that percentage mean?`
        : signalPrompt;
    const correct =
      difficulty <= 3
        ? forecastAnswers[answerVariant % forecastAnswers.length](percent)
        : signalAnswers[answerVariant % signalAnswers.length];
    return makeItem(
      "probability",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      correct,
      difficulty <= 3
        ? [
            `The improvement will last for exactly ${percent}% of the month.`,
            `The improvement is guaranteed because the number is above 0%, so no uncertainty remains.`,
            `The result is impossible unless the forecast says 100%, which treats uncertainty as all-or-nothing.`
          ]
        : [
            "Ignore the signal because some signals are wrong.",
            "It proves the flagged problem is definitely there, so no follow-up check is needed.",
            "It means all flagged cases have the problem and all unflagged cases are safe."
          ],
      "Probability is about chance and uncertainty, not guarantees.",
      ["probability", t.field, `d${difficulty}`, `p${percent}`]
    );
  });
}

function statsItems() {
  return buildSkill("statistical_sense", (t, difficulty, offset, index) => {
    const baseEvents = 4 + ((offset + difficulty) % 9);
    const bHigherScenario = (offset + difficulty) % 2 === 0;
    const aEvents = bHigherScenario ? baseEvents + 2 : baseEvents;
    const aTotal = bHigherScenario ? 300 : 100;
    const bEvents = bHigherScenario ? baseEvents : baseEvents + 2;
    const bTotal = bHigherScenario ? 100 : 300;
    const aRate = aEvents / aTotal;
    const bRate = bEvents / bTotal;
    const aHigher = aRate > bRate;
    const percentStart = baseEvents;
    const percentEnd = percentStart + 5;
    const percentRises = (offset + difficulty) % 2 === 0;
    const prompt =
      difficulty <= 3
        ? `In a study about ${t.domain}, the tracked outcome is ${t.metric}. Group A recorded ${aEvents} outcome events in ${aTotal} observations. Group B recorded ${bEvents} outcome events in ${bTotal} observations. Which group had the higher rate?`
        : percentRises
          ? `A report about ${t.domain} says ${t.metric} rose from ${percentStart}% to ${percentEnd}% after a test program. What is the clearest way to describe the change?`
          : `A report about ${t.domain} says ${t.metric} fell from ${percentEnd}% to ${percentStart}% after a test program. What is the clearest way to describe the change?`;
    const correct =
      difficulty <= 3
        ? aHigher
          ? `Group A, because ${aEvents}/${aTotal} is a higher rate than ${bEvents}/${bTotal}; compare rates, not just counts.`
          : `Group B, because ${bEvents}/${bTotal} is a higher rate than ${aEvents}/${aTotal}; compare rates, not just counts.`
        : percentRises
          ? `It rose by 5 percentage points, which is about a ${Math.round((5 / percentStart) * 100)}% increase compared with the starting number.`
          : `It fell by 5 percentage points, which is about a ${Math.round((5 / percentEnd) * 100)}% decrease compared with the starting number.`;
    return makeItem(
      "statistical_sense",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      correct,
      difficulty <= 3
        ? [
            `Group A, because ${aEvents} is smaller than ${bEvents}, so the raw count must be better.`,
            `Group B, because ${bTotal} is larger than ${aTotal}, so the bigger group must have the higher rate.`,
            "The rates are automatically equal because both groups are in the same comparison.",
            "There is no way to compare rates when group sizes differ, even if both counts are given."
          ]
        : [
            `${percentRises ? "It rose" : "It fell"} by 5%, because any move from one percent to another is a 5% change and the starting value does not matter.`,
            `${percentRises ? "It rose" : "It fell"} by ${percentRises ? percentEnd : percentStart} percentage points, because the ending value should be used as the number of points.`,
            `${percentRises ? "It doubled" : "It was cut in half"}, because all five-point changes work that way regardless of the starting value.`,
            "It cannot be described without knowing the city population, even though the starting and ending rates are given."
          ],
      "For numbers, pay attention to group size and to the difference between percentage points and percent change.",
      ["statistics", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function causationItems() {
  return buildSkill("causation", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const prompt = `${cap(t.actor)} tried a plan to ${t.action}. ${asSentence(t.afterChangeResult)} ${speaker} says, "The plan caused the change." Which fact would show why ${speaker}'s claim is not proved yet?`;
    return makeItem(
      "causation",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      alternativeCause(t),
      [
        "The result includes a percentage.",
        `No event can ever have more than one possible cause, so no other cause matters.`,
        `${asSentence(t.irrelevant)} That visible detail proves the plan caused the result, even though it does not compare causes.`
      ],
      "To prove cause, you need to rule out other likely causes or compare similar groups.",
      ["causation", "confounder", t.field, `d${difficulty}`]
    );
  });
}

function alternativeItems() {
  return buildSkill("alternative_explanations", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const prompt = `${cap(t.actor)} tried ${t.actionGerund}. ${asSentence(t.afterChangeResult)} ${speaker} says, "The plan caused the change." Which other explanation also fits the facts?`;
    return makeItem(
      "alternative_explanations",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      alternativeCause(t),
      [
        "The result includes a percentage.",
        `${cap(t.metric)} cannot change under any circumstances, so no explanation is needed.`,
        `${asSentence(t.irrelevant)} That visible detail must be the only cause of the result.`
      ],
      "A good alternative explanation fits the same facts without assuming the first cause is right.",
      ["alternatives", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function biasItems() {
  return buildSkill("cognitive_biases", (t, difficulty, offset, index) => {
    const speaker = speakerName(offset, difficulty);
    const bias = biasTypes[(offset + difficulty - 1) % biasTypes.length];
    const otherNames = biasTypes
      .filter((entry) => entry.name !== bias.name)
      .map((entry) => entry.name);
    return makeItem(
      "cognitive_biases",
      index,
      difficulty,
      withFrame(difficulty, `In a discussion about ${t.domain}, ${bias.line(t, speaker)} Which thinking bias is shown in ${speaker}'s thinking?`),
      bias.name,
      stableShuffle(otherNames, `${bias.name}:${index}`).slice(0, 3),
      bias.explanation,
      ["bias", bias.tag, t.field, `d${difficulty}`]
    );
  });
}

function tradeoffItems() {
  const correctOptions = [
    (t, variant) => [
      "It names the possible benefit and the real cost so both sides are visible.",
      "It points out what the plan might improve and what it would require in return.",
      "The gain people hope for is named along with the cost of getting it.",
      "The possible improvement and the required cost are kept together.",
      "It notices that the plan may help, but only by using something limited."
    ][variant % 5],
    (t, variant) => [
      "It weighs the hoped-for result against the resources the plan would take.",
      "It compares the result people want with the time, money, or attention required.",
      "It asks whether the expected gain is worth the resources the plan would use.",
      "The desired result and the required resources stay in the same decision.",
      "The plan's possible payoff and resource cost are connected in the choice."
    ][variant % 5],
    (t, variant) => [
      "The benefit and the cost are counted as parts of the same decision.",
      "It avoids looking only at the upside by including the cost in the judgment.",
      "The benefit matters, but the cost also has to be counted.",
      "The upside and the downside are kept together instead of separated.",
      "It judges the plan by looking at both what it gains and what it uses."
    ][variant % 5],
    (t, variant) => [
      "The plan could help, but another need might get less attention.",
      "It notices that helping one goal may leave less support for another goal.",
      "One group or need may benefit while another waits longer.",
      "The possible help is real, but the answer also names what may be delayed.",
      "It recognizes that choosing this plan may push another useful option aside."
    ][variant % 5],
    (t, variant) => [
      "Both sides stay in view: possible improvement and limited resources.",
      "It looks at the possible improvement while remembering the resources are limited.",
      "It names the hoped-for gain and the limit that makes the choice difficult.",
      "The upside and the resource limit are shown as the two sides of the tradeoff.",
      "It says the plan may improve something, but resources still have to be shared."
    ][variant % 5]
  ];
  return buildSkill("tradeoffs", (t, difficulty, offset, index) => {
    const costs = [
      `requires staff time that could be used for other ${t.field} work`,
      `uses money that could fund a different ${t.field} need`,
      `may move resources away from a smaller group that was not included in the test`,
      `could create extra work for people who already handle other ${t.field} tasks`,
      `may help ${t.group} while making another group's problem wait longer`
    ];
    const cost = costs[difficulty - 1];
    const variant = Math.floor(offset / correctOptions.length) + difficulty - 1;
    const correct = correctOptions[(offset + difficulty - 1) % correctOptions.length](t, variant);
    const prompt = `${cap(t.actor)} can ${t.action}, which may ${resultGoal(t)}. But the plan ${cost}. Which statement best names the tradeoff?`;
    return makeItem(
      "tradeoffs",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      correct,
      [
        "Costs never matter if a plan has a benefit.",
        `The main tradeoff is the unrelated detail: ${lowerFirst(phrase(t.irrelevant))}.`,
        "A tradeoff exists only when every option is equally bad and no option has any upside."
      ],
      "A tradeoff compares what you gain with what you give up or risk.",
      ["tradeoff", t.field, `d${difficulty}`, `variant-${offset}`]
    );
  });
}

function beliefUpdateItems() {
  const cases = [
    (t, variant) => ({
      tag: "small-support",
      newInfo: `you learn about one small four-week test where ${t.testResult}`,
      correct: [
        "Raise confidence somewhat, while staying open to better evidence.",
        "Shift your confidence upward a bit, because the test helps but does not settle the question.",
        "Become somewhat more confident, while remembering that one small test is limited.",
        "Treat the result as support for the claim, but keep looking for stronger evidence.",
        "Make a modest upward update because the result points the right way but is still small."
      ][variant % 5],
      distractors: [
        "Treat one small test as final proof.",
        "Lower confidence even though the result points the right way for the claim.",
        "Treat the result as proof that the opposite claim is true, even though it supports the plan."
      ],
      explanation: "A small test that points the right way should raise confidence somewhat, but it is not final proof."
    }),
    (t, variant) => ({
      tag: "strong-support",
      newInfo: `you see a random comparison using two similar groups. In the group that used the plan, ${t.testResult}. In the group without the plan, the same result did not improve`,
      correct: [
        "Raise confidence a lot, while still avoiding total certainty.",
        "Become much more confident, but do not treat one comparison as perfect proof.",
        "Give the claim a strong boost because the comparison makes the evidence much better.",
        "Make a sharp upward update, while leaving room for future evidence to matter.",
        "Treat the claim as much more likely, though not guaranteed in every setting."
      ][variant % 5],
      distractors: [
        "Ignore the evidence completely.",
        "Lower confidence because comparison groups weaken evidence instead of strengthening it.",
        "Treat the evidence as proof the action makes things worse, even though the result improved."
      ],
      explanation: "A fair comparison is stronger evidence, so confidence should rise more, but not to 100%."
    }),
    (t, variant) => ({
      tag: "small-opposition",
      newInfo: `you learn about one small four-week test where ${oppositeTestResult(t)}`,
      correct: [
        "Lower confidence somewhat, while staying open to better evidence.",
        "Shift your confidence downward a bit, because the test counts against the claim but is small.",
        "Become somewhat less confident, while remembering that one small test is limited.",
        "Treat the result as evidence against the claim, but not as final disproof.",
        "Decrease confidence modestly because the result points the wrong way but is still small."
      ][variant % 5],
      distractors: [
        "Raise confidence no matter which way the result points.",
        "Become certain the action can never work anywhere after one small test.",
        "Treat the result as proof the original claim is certainly true, even though it points the other way."
      ],
      explanation: "A small test that points the wrong way should lower confidence somewhat, but it is not final proof."
    }),
    (t, variant) => ({
      tag: "irrelevant-detail",
      newInfo: `you learn that ${lowerFirst(phrase(t.irrelevant))}`,
      correct: [
        "Keep confidence about the same, because that detail does not test whether the plan works.",
        "Do not change confidence much, because the new detail is not evidence about the result.",
        "Leave confidence mostly where it was, since the detail does not check the claim.",
        "Treat the detail as mostly irrelevant to whether the plan causes the result.",
        "Avoid moving confidence much because the detail does not bear on the claim."
      ][variant % 5],
      distractors: [
        "Raise confidence because every new detail is useful.",
        "Lower confidence because any side detail weakens the idea, even when it is unrelated.",
        "Treat the detail as proof that the opposite claim is true, even though it does not test the result."
      ],
      explanation: "Irrelevant information should not move confidence much, even when it sounds connected to the topic."
    }),
    (t, variant) => ({
      tag: "mixed-support",
      newInfo: `you learn about one small four-week test where ${t.testResult}. You also learn that ${lowerFirst(phrase(t.alternative))}`,
      correct: [
        "Nudge confidence upward only a little, because the result helps but another change could explain it.",
        "Make only a slight upward update, since the result helps but the other change weakens the update.",
        "Adjust upward a bit, while taking the competing explanation seriously.",
        "Treat the result as some support, but keep the update small because of the other change.",
        "Become only a little more confident because the helpful result has another possible cause."
      ][variant % 5],
      distractors: [
        "Become certain because the result moved the right way, ignoring the other change.",
        "Ignore the result completely because another change happened too.",
        "Treat the evidence as proof that the opposite claim is true, even though the result moved the right way."
      ],
      explanation: "Mixed evidence can still matter, but the possible alternative explanation should keep the update small."
    })
  ];
  return buildSkill("belief_update", (t, difficulty, offset, index) => {
    const variant = Math.floor(offset / cases.length) + difficulty - 1;
    const updateCase = cases[(offset + difficulty - 1) % cases.length](t, variant);
    const prompt = `You are unsure whether ${t.actionGerund} would ${resultGoal(t)}. Then ${updateCase.newInfo}. How should your confidence change?`;
    return makeItem(
      "belief_update",
      index,
      difficulty,
      withFrame(difficulty, prompt),
      updateCase.correct,
      updateCase.distractors,
      updateCase.explanation,
      ["belief-update", updateCase.tag, t.field, `d${difficulty}`, `variant-${offset}`]
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

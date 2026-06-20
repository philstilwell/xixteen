#!/usr/bin/env python3
"""Build the XiXteen curriculum PDF from the generated question bank."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import date
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate,
    CondPageBreak,
    Flowable,
    Frame,
    HRFlowable,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_FILE = OUTPUT_DIR / "xixteen-critical-thinking-curriculum.pdf"
SYNTHESIS_FILE = OUTPUT_DIR / "xixteen-critical-thinking-synthesis.pdf"
SKILL_OUTPUT_DIR = OUTPUT_DIR / "skills"
TEACHER_RESOURCE_FILE = DATA_DIR / "teacher-resources.json"

PAGE_WIDTH, PAGE_HEIGHT = letter
MARGIN_X = 0.62 * inch
MARGIN_TOP = 0.62 * inch
MARGIN_BOTTOM = 0.58 * inch
CONTENT_WIDTH = PAGE_WIDTH - (2 * MARGIN_X)

INK = colors.HexColor("#1f2a2e")
MUTED = colors.HexColor("#637176")
LINE = colors.HexColor("#d9d0bf")
PAPER = colors.HexColor("#fffdf7")
CREAM = colors.HexColor("#f7f3ea")
TEAL = colors.HexColor("#1f8a8a")
CORAL = colors.HexColor("#d95d47")
GOLD = colors.HexColor("#c79a2d")
BLUE = colors.HexColor("#4b6f9f")
GREEN = colors.HexColor("#5c7f51")
PURPLE = colors.HexColor("#9b5a82")

ACCENTS = [
    "#1f8a8a", "#d95d47", "#c79a2d", "#4b6f9f",
    "#5c7f51", "#9b5a82", "#3b7c6e", "#b26a3c",
    "#6d6aa8", "#2f7d9b", "#a34f55", "#7b6f35",
    "#49714d", "#8a5d9b", "#b07a28", "#386f72",
]

LABELS = ["A", "B", "C", "D"]


SKILL_CURRICULUM = {
    "clarify_claim": {
        "importance": "Every argument is easier to judge once you know exactly what someone is asking you to accept. Without this skill, people waste time attacking side details, stories, or evidence while the real point quietly escapes inspection.",
        "method": "Look for the sentence that would still need support if all the background details were removed. Separate the recommendation from the reason, the measured result, the audience, and any claim that goes beyond what the speaker actually said.",
        "analogy": "Think of a claim as the destination on a map. Evidence is the road, scenery is background, and exaggerations are roads to somewhere else.",
        "example": "If a principal says test scores rose after tutoring, so the school should expand tutoring, the claim is the expansion recommendation. The score increase is support for that claim, not the claim itself.",
        "classroom": "Ask students to underline the sentence the speaker wants the audience to accept, then box every sentence that merely supports, describes, or overstates that point."
    },
    "define_terms": {
        "importance": "Vague words let people agree too quickly and disagree too late. Terms such as fair, safe, enough, harmful, or successful can carry the whole argument while meaning different things to different people.",
        "method": "Find the word that sets the standard for judgment. If reasonable people could ask, How much? In what way? By whose measure? or Compared with what?, the word probably needs a sharper definition.",
        "analogy": "A vague term is like a blurry ruler. You can measure with it only after the markings are clear.",
        "example": "A rule that says a policy is acceptable only if it is affordable needs a definition of affordable: total cost, cost per person, cost compared with benefits, or cost within a budget limit.",
        "classroom": "Have students replace the vague term with two different precise definitions and notice how the same argument changes."
    },
    "find_argument": {
        "importance": "Arguments are built from parts: conclusion, reason, background, example, and side comment. Naming those parts keeps readers from treating every sentence as equally important.",
        "method": "Ask which sentence is being supported, then ask which sentence does the supporting. Conclusion indicators such as therefore help, but the real test is the role the sentence plays.",
        "analogy": "An argument is like a table: the conclusion is the tabletop, and the reasons are the legs. Background facts may be in the room, but they are not holding the table up.",
        "example": "The park had fewer complaints after timed entry, therefore timed entry should continue. The complaint count is the reason; the continuation recommendation is the conclusion.",
        "classroom": "Ask students to label each sentence with one of four roles: conclusion, reason, background, or irrelevant detail."
    },
    "hidden_assumptions": {
        "importance": "Many arguments fail not because a stated sentence is false, but because an unstated bridge is missing. Assumptions are the silent hinges that let a reason swing toward a conclusion.",
        "method": "Put the reason and conclusion side by side. Then ask what must also be true for the reason to count as support. The best assumption is usually narrower than a huge universal claim.",
        "analogy": "A hidden assumption is a bridge over a gap. If the bridge is weak, even true facts may not get you to the conclusion.",
        "example": "A small pilot worked, so the city should expand it. The hidden assumption is that the pilot group is similar enough to the wider city for the pilot result to matter.",
        "classroom": "Use the because-therefore test: because [reason], therefore [conclusion]. Then ask students to supply the missing because in the middle."
    },
    "relevance": {
        "importance": "Relevant evidence bears on the claim; irrelevant detail merely stands nearby. This skill protects students from being impressed by vivid facts that do not actually test the point at issue.",
        "method": "Match the evidence to the claim's action, group, and measured result. If a fact does not help decide whether that specific claim is true, it is probably a side detail.",
        "analogy": "Relevance is a spotlight. A bright detail can still be pointed at the wrong part of the stage.",
        "example": "If the claim is that quiet-hours text reminders reduce hotel noise complaints, the color of the reminder icon matters little; complaint rates in similar hotels matter much more.",
        "classroom": "Have students circle the claim's verb, target group, and result. Then test each evidence choice against those three anchors."
    },
    "evidence_quality": {
        "importance": "Not all evidence deserves the same weight. A story, a tiny survey, a biased report, and a well-designed comparison can all sound like evidence, but they do different amounts of work.",
        "method": "Prefer evidence that measures the claimed result directly, uses a fair comparison, includes enough cases, and makes the method visible. Be cautious with anecdotes, impressions, and unsupported explanations.",
        "analogy": "Evidence quality is like camera focus. A blurry photo may show something, but a clear, well-framed photo deserves more confidence.",
        "example": "A large comparison of similar schools before and after a tutoring program is stronger than a single student saying tutoring felt helpful.",
        "classroom": "Ask students to rank evidence choices from strongest to weakest, then explain the ranking using sample size, comparison, measurement, and source."
    },
    "source_reliability": {
        "importance": "A source can be wrong because it lacks expertise, hides its method, samples badly, or has strong pressure to reach a certain answer. Source checks do not replace evidence checks; they tell us how carefully to treat the evidence.",
        "method": "Ask four questions: Does the source know the topic? Does it show the method? Does it have a reason to tilt the result? Does it include inconvenient information?",
        "analogy": "A source is like a witness. You ask what they saw, how close they were, what they know, and whether they have a reason to shade the story.",
        "example": "A water-utility report is more trustworthy if it gives the data source and method; it is less trustworthy if it hides the sample or is written by a vendor trying to sell the alert system.",
        "classroom": "Have students separate expertise problems, method problems, sampling problems, and motive problems instead of using trust as one vague feeling."
    },
    "logical_gaps": {
        "importance": "A logical gap appears when the conclusion reaches farther than the evidence. The facts may be true, the source may be decent, and the wording may be clear, yet the argument still may not follow.",
        "method": "Compare what the evidence says with what the conclusion adds. Watch for jumps from some to all, average to every person, possible to certain, or before-after to caused-by.",
        "analogy": "Logic is a staircase. A gap is a missing step; you may see the upper floor, but you cannot simply pretend the step is there.",
        "example": "If average test scores rose, it does not follow that every student improved. The average can rise while some students stay the same or decline.",
        "classroom": "Ask students to finish this sentence: The evidence shows only __, but the conclusion claims __."
    },
    "fallacies": {
        "importance": "Fallacy labels are useful when they name a precise pattern, not when they are used as insults. The goal is to diagnose the bad move so the discussion can return to the actual issue.",
        "method": "Identify the move made by the speaker: attacking the person, reducing options to two, changing the subject, exaggerating an opponent, treating popularity as proof, or assuming what needs proof.",
        "analogy": "A fallacy is a recognizable wrong turn in reasoning. The label is the road sign, but the real skill is seeing the turn.",
        "example": "If someone asks for more data and the reply is that they want to block all progress forever, the reply is a straw man because it attacks a distorted version of the original position.",
        "classroom": "Have students describe the bad move in plain language before naming the fallacy. This prevents label-matching without understanding.",
        "resource": "LogFall article links appear in the feedback for the fallacy items."
    },
    "probability": {
        "importance": "Probability helps people think between impossible and guaranteed. Many real decisions involve signals, forecasts, false alarms, base rates, and uncertainty rather than proof.",
        "method": "Translate percentages into out-of-100 language. Ask whether the number is a chance, a frequency, a warning signal, or a guarantee. Keep uncertainty visible.",
        "analogy": "Probability is a weather forecast for belief. A 70 percent chance of rain matters, but it is not the same as rain already falling.",
        "example": "A tool that is right 80 out of 100 times gives a reason to check further; it does not make the result certain in this one case.",
        "classroom": "Ask students to rewrite every probability as a frequency: out of 100 similar cases, about how many would show the result?"
    },
    "statistical_sense": {
        "importance": "Numbers can clarify, but they can also mislead when people ignore denominators, baselines, rates, averages, or the difference between percent and percentage points.",
        "method": "Ask what is being counted, what it is being compared with, and what the denominator is. Never let a large raw number outrun the size of the group it came from.",
        "analogy": "Statistics are like a scale. If you do not know the units or the zero point, the reading can look precise while meaning very little.",
        "example": "Twenty complaints out of 1,000 customers is a lower rate than twelve complaints out of 200 customers, even though twenty is the bigger raw count.",
        "classroom": "Have students write the fraction behind every rate before choosing an answer."
    },
    "causation": {
        "importance": "Cause claims are powerful because they suggest action. They also require discipline: timing, correlation, or improvement after a plan is not enough by itself.",
        "method": "Look for another change that happened at the same time, a missing comparison group, reverse direction, selection effects, or a reason the result might have changed anyway.",
        "analogy": "Causation is a courtroom claim. A suspect being near the scene matters, but it is not a conviction without ruling out other explanations.",
        "example": "If theft reports fell after brighter lights were installed, increased patrols during the same period could also explain the change.",
        "classroom": "Ask students to name at least one rival cause before they accept a cause claim."
    },
    "alternative_explanations": {
        "importance": "Good thinkers do not stop at the first explanation that fits. They ask what else could make the same facts true, especially when a conclusion is attractive.",
        "method": "Keep the observed facts fixed, then generate another story that could produce them. The best alternative is specific and fits the evidence without contradicting it.",
        "analogy": "Alternative explanations are spare keys. If more than one key opens the same lock, you should not assume you have found the only one.",
        "example": "If museum family visits rose after free Friday admission began, a new children's exhibit opening the same week is a plausible alternative explanation.",
        "classroom": "Have students complete this sentence: The result could have happened because of the plan, but it could also have happened because __."
    },
    "cognitive_biases": {
        "importance": "Biases are not just mistakes in arguments; they are patterns in attention, memory, confidence, and desire that shape judgment before an argument is even spoken.",
        "method": "Identify what is pulling the person's thinking off course: confirming a prior view, following the crowd, anchoring on a first number, protecting sunk costs, favoring the familiar, or overestimating certainty.",
        "analogy": "A cognitive bias is like a lens tint. The scene is still there, but the tint changes what stands out and what fades.",
        "example": "Reading only praise for a plan while ignoring equally detailed criticism is confirmation bias because the person is filtering evidence toward a favored view.",
        "classroom": "Ask students to name the mental pull before naming the bias. What is the person drawn toward or away from?",
        "resource": "CogBias article links appear in the feedback for the bias items."
    },
    "tradeoffs": {
        "importance": "Decisions usually buy one good by spending another. Tradeoff thinking keeps benefits, costs, risks, delays, and second effects in the same frame.",
        "method": "Look for what the plan gains and what it uses up or endangers. A tradeoff is not just a downside; it is the connection between competing values or resources.",
        "analogy": "A tradeoff is a budget for attention, money, time, or risk. Spending in one place leaves less to spend somewhere else.",
        "example": "Hiring more tutors may improve pass rates, but it may use funds that would otherwise support smaller classes or updated materials.",
        "classroom": "Have students write the sentence: This plan may improve __, but it may cost or risk __."
    },
    "belief_update": {
        "importance": "Strong thinkers change confidence by the right amount. They neither ignore new evidence nor swing wildly from one result to certainty.",
        "method": "Ask whether the evidence points toward or away from the claim, how strong the evidence is, and what uncertainty remains. Then move confidence a little or a lot accordingly.",
        "analogy": "Belief updating is steering, not teleporting. New evidence should turn the wheel in proportion to its strength.",
        "example": "A small test showing fewer thefts after brighter lights should raise confidence somewhat, but not prove the plan will always work or eliminate the need for better evidence.",
        "classroom": "Ask students to choose both direction and size: up or down, slightly or strongly, and why."
    },
}

PEDAGOGY_EXPANSIONS = {
    "clarify_claim": {
        "essential_question": "What exactly is the speaker asking us to accept?",
        "conceptual_core": "This skill trains students to locate the target of judgment before judging it. A prompt may include background, measurements, motives, vivid details, and a speaker's conclusion. The claim is the statement that would need support after the background has been cleared away. Students should learn that claims can be descriptive, predictive, causal, evaluative, or practical recommendations, and that each type requires different later tests.",
        "student_moves": [
            "Find the speaker and mark the sentence that sounds like the point of the argument.",
            "Separate the claim from the evidence that is offered for it.",
            "Check whether an answer overstates the claim by adding always, only, proven, everyone, or everywhere.",
            "Restate the claim in plain language before choosing an answer."
        ],
        "common_confusions": [
            "Students often pick the most concrete fact because it feels important, even when it is only evidence.",
            "Students may pick an extreme version of the claim because it sounds more decisive than the actual conclusion.",
            "Students sometimes confuse the issue being discussed with the position someone takes on that issue."
        ],
        "teacher_prompts": [
            "Who is trying to persuade whom?",
            "Which sentence would the speaker need to defend if challenged?",
            "Which choices are evidence, background, or exaggeration rather than the claim?"
        ],
        "worked_example": {
            "scenario": "A city tests later library hours and visits rise from 400 to 460 per week. A council member says, because of that test, the city should keep the later hours.",
            "think_aloud": "The visit count is evidence. The issue is library hours. The council member's claim is the recommendation to keep later hours. A choice saying the test proves later hours always work would go beyond the claim.",
            "takeaway": "The main claim is the point being defended, not the measurement used to defend it."
        },
        "assessment": "A good answer names the exact point being supported and rejects answers that are merely supporting facts, side details, or overclaims.",
        "extension": "Ask students to bring in a short editorial or ad and highlight the main claim in one color and the support in another."
    },
    "define_terms": {
        "essential_question": "Which word or phrase must be made clearer before the argument can be fairly judged?",
        "conceptual_core": "Arguments often turn on ordinary words that hide a standard. Words like safe, fair, effective, affordable, harmful, successful, and better invite disagreement unless the speaker says what would count. Defining terms does not settle the whole argument, but it makes the argument testable. The goal is not to demand definitions for every word; it is to find the term that carries the burden of the conclusion.",
        "student_moves": [
            "Look for judgment words, threshold words, and comparison words.",
            "Ask what someone would need to count or observe to apply the term.",
            "Distinguish unclear key terms from details that are already specific.",
            "Test whether two reasonable readers could interpret the word differently."
        ],
        "common_confusions": [
            "Students may pick a familiar word simply because it appears often in the prompt.",
            "Students may think a term is clear because they have a private meaning for it.",
            "Students may define a side detail while leaving the standard that matters untouched."
        ],
        "teacher_prompts": [
            "What would count as enough?",
            "What would two people disagree about even if they agreed on the facts?",
            "Can we measure or apply this word without adding a standard?"
        ],
        "worked_example": {
            "scenario": "A school says a phone rule is justified because it creates a healthier classroom.",
            "think_aloud": "The word healthier is doing the work. Does it mean fewer distractions, less anxiety, better grades, more sleep, or better social interaction? Until that term is defined, the rule cannot be judged clearly.",
            "takeaway": "The key term is the one that hides the standard for success."
        },
        "assessment": "A good answer selects the vague or standard-setting phrase and can explain what kind of definition would make the claim testable.",
        "extension": "Have students rewrite a vague claim twice with two different definitions and discuss how the evidence needed would change."
    },
    "find_argument": {
        "essential_question": "What role does each sentence play in the argument?",
        "conceptual_core": "Finding the argument means mapping the relationship among sentences. Students learn to distinguish conclusion, reason, evidence, example, context, and irrelevant detail. This is a structural skill: the same sentence can be evidence in one argument and conclusion in another. The key is the job it performs in the immediate passage.",
        "student_moves": [
            "Identify the sentence that other sentences are meant to support.",
            "Mark evidence or reasons that point toward that conclusion.",
            "Treat examples as illustrations unless they are the main point being defended.",
            "Ignore signal words if the sentence's actual role points the other way."
        ],
        "common_confusions": [
            "Students often treat the first fact as the conclusion because it appears first.",
            "Students may mistake a topic sentence for an argued conclusion.",
            "Students may choose a true background statement even when it is not doing argumentative work."
        ],
        "teacher_prompts": [
            "Which sentence answers 'so what should we believe or do?'",
            "Which sentence answers 'why should we believe that?'",
            "If we removed this sentence, would the argument lose its support, its conclusion, or only some background?"
        ],
        "worked_example": {
            "scenario": "A school club says its bake sale raised more money than the car wash, so next month the club should run another bake sale.",
            "think_aloud": "The money comparison supports the recommendation. The conclusion is the action the club should take. The topic is fundraising, but the argument is the move from past result to future plan.",
            "takeaway": "The conclusion is the supported point; the reason is the support."
        },
        "assessment": "A good answer identifies the conclusion, reason, or other requested role without being pulled toward the most interesting sentence.",
        "extension": "Give students a short passage and ask them to diagram it with arrows from reasons to conclusion."
    },
    "hidden_assumptions": {
        "essential_question": "What unstated idea must be true for the reason to support the conclusion?",
        "conceptual_core": "An assumption is not merely something unstated; it is an unstated bridge the argument needs. Students should learn to avoid both extremes: choosing an assumption so broad it would make almost any argument work, or choosing a detail that is true but not necessary for this argument. The best assumption usually connects the specific evidence to the specific conclusion.",
        "student_moves": [
            "Put the stated reason and conclusion next to each other.",
            "Ask what must be true for that reason to count in favor of that conclusion.",
            "Prefer a narrow bridge over a sweeping guarantee.",
            "Use the denial test: if this assumption were false, would the argument weaken?"
        ],
        "common_confusions": [
            "Students may choose a statement that would be nice to know but is not required.",
            "Students may choose a much stronger claim than the argument needs.",
            "Students may confuse evidence with the assumption that lets the evidence matter."
        ],
        "teacher_prompts": [
            "What is the missing bridge between these two sentences?",
            "Would the conclusion still be supported if this choice were false?",
            "Is this answer just helpful, or is it needed?"
        ],
        "worked_example": {
            "scenario": "A store's weekend trial of a new checkout line reduced waiting times, so the store should use that checkout setup every day.",
            "think_aloud": "The argument assumes weekend customers and weekday customers are similar enough, or that the checkout setup would still reduce waits under normal daily conditions.",
            "takeaway": "Assumptions connect the evidence to the conclusion without adding more than the argument needs."
        },
        "assessment": "A good answer supplies a necessary bridge and avoids choices that are mere background, evidence, or overconfident guarantees.",
        "extension": "Have students write because-therefore sentences and insert the missing assumption between the reason and conclusion."
    },
    "relevance": {
        "essential_question": "Which fact actually helps us judge the claim?",
        "conceptual_core": "Relevance is about fit. Evidence can be vivid, surprising, or emotionally interesting while still not bearing on the claim. Students should learn to anchor each relevance judgment in the claim's action, target group, and outcome. A relevant fact does not have to prove the claim by itself; it just has to make the claim easier or harder to assess.",
        "student_moves": [
            "Circle the action, group, and outcome in the claim.",
            "Ask whether each option speaks to one of those anchors.",
            "Reject decorative details that only share the same topic.",
            "Prefer evidence from similar conditions when the claim is about whether a plan will work."
        ],
        "common_confusions": [
            "Students may pick a fact because it mentions the same setting or people.",
            "Students may think irrelevant means false, even though irrelevant facts can be true.",
            "Students may demand conclusive proof when the task only asks what matters most."
        ],
        "teacher_prompts": [
            "Does this fact help decide the claim, or does it just sit near the claim?",
            "Which part of the claim does this evidence touch?",
            "If this fact changed, would our view of the claim change?"
        ],
        "worked_example": {
            "scenario": "A hotel manager claims quiet-hour text reminders will reduce hallway noise complaints from overnight guests.",
            "think_aloud": "A photo of the hotel lobby is not relevant. Complaint rates after a similar reminder program at comparable hotels are relevant because they match the action and outcome.",
            "takeaway": "Relevant evidence touches the exact claim, not just the general topic."
        },
        "assessment": "A good answer identifies the fact that bears most directly on the claim's action, target group, and outcome.",
        "extension": "Ask students to create one relevant and one irrelevant fact for the same claim, then trade with a partner."
    },
    "evidence_quality": {
        "essential_question": "How strong is the evidence for this claim?",
        "conceptual_core": "Evidence quality depends on directness, comparison, measurement, sample size, and transparency. Students should learn that a piece of evidence can be relevant but still weak. A single anecdote, a vague report, or a tiny unrepresentative survey may point in a direction without carrying much weight. The skill is comparative: choose the option that would deserve the most confidence under the facts given.",
        "student_moves": [
            "Ask whether the evidence measures the claimed outcome directly.",
            "Look for a fair comparison or baseline.",
            "Check whether the sample is large enough and similar enough to the target group.",
            "Prefer visible methods over impressions and unexplained summaries."
        ],
        "common_confusions": [
            "Students may treat any number as strong evidence because it looks precise.",
            "Students may overvalue a personal story when the claim is about a larger group.",
            "Students may ignore whether the measurement matches the outcome in the claim."
        ],
        "teacher_prompts": [
            "What was measured, and was it the right thing?",
            "Compared with what?",
            "How many cases, and were they like the group in the claim?"
        ],
        "worked_example": {
            "scenario": "A tutoring program claims it improves algebra pass rates. One happy student gives a testimonial, while a district report compares pass rates in similar classes with and without tutoring.",
            "think_aloud": "The testimonial is relevant but weak. The comparison report is stronger because it uses the right outcome, a comparison group, and more cases.",
            "takeaway": "Strong evidence is relevant evidence with better design."
        },
        "assessment": "A good answer selects the option with better direct measurement, comparison, sample, and transparency.",
        "extension": "Have students rank four evidence types and justify the ranking using the same four criteria every time."
    },
    "source_reliability": {
        "essential_question": "How much trust should we place in this source, and why?",
        "conceptual_core": "Source reliability is not a vibe check. It is a structured judgment about expertise, method, independence, transparency, and track record. Students should learn that a source with a possible interest is not automatically wrong, and a source without an obvious interest is not automatically right. The question is how the source's position affects the weight we should give its claim.",
        "student_moves": [
            "Ask whether the source has relevant knowledge or access.",
            "Look for a clear method, sample, and data path.",
            "Check whether the source has pressure, incentives, or commitments that could slant judgment.",
            "Value sources that show limitations or inconvenient evidence."
        ],
        "common_confusions": [
            "Students may treat motive as proof of falsehood rather than a reason for caution.",
            "Students may trust impressive titles even when the topic is outside the person's expertise.",
            "Students may ignore missing methods because the conclusion sounds reasonable."
        ],
        "teacher_prompts": [
            "What does this source know, and how would it know?",
            "What method is visible?",
            "What reason might this source have to leave something out?"
        ],
        "worked_example": {
            "scenario": "A company claims its study shows its app improves sleep, but the report does not say how users were selected or how sleep was measured.",
            "think_aloud": "The problem is not just that the company benefits. The missing method makes the claim hard to check, and the source's incentive gives us another reason to ask for transparency.",
            "takeaway": "Reliability grows when expertise, method, and openness are visible."
        },
        "assessment": "A good answer names the reliability issue precisely: expertise, method, sampling, independence, transparency, or track record.",
        "extension": "Ask students to compare two sources on the same claim using a five-column reliability chart."
    },
    "logical_gaps": {
        "essential_question": "Does the conclusion really follow from the evidence?",
        "conceptual_core": "Logical gaps occur when the evidence is asked to do more than it can do. Students should learn to compare the exact scope of the evidence with the exact scope of the conclusion. Gaps often involve quantity, time, group, certainty, causation, or universality. This skill is not about whether the conclusion is false; it is about whether this argument has earned it.",
        "student_moves": [
            "State what the evidence actually shows in one careful sentence.",
            "State what the conclusion adds.",
            "Look for jumps from some to all, possible to certain, short term to long term, or one group to another.",
            "Choose the answer that names the unsupported jump."
        ],
        "common_confusions": [
            "Students may reject a conclusion because they dislike it rather than because it fails to follow.",
            "Students may accept a conclusion because the evidence is true.",
            "Students may overlook small words like all, always, only, or proves."
        ],
        "teacher_prompts": [
            "What does the evidence show only?",
            "What extra thing does the conclusion claim?",
            "Which word makes the conclusion stronger than the evidence?"
        ],
        "worked_example": {
            "scenario": "A survey finds that most students in one art class liked a new grading rubric, so the school says every student will prefer it.",
            "think_aloud": "The evidence is about one class and most students in that class. The conclusion expands to every student in the school. That group and certainty jump is the gap.",
            "takeaway": "True evidence can still be too narrow for the conclusion."
        },
        "assessment": "A good answer identifies the precise leap from evidence to conclusion rather than attacking the topic generally.",
        "extension": "Have students rewrite weak conclusions so they match the evidence more modestly."
    },
    "fallacies": {
        "essential_question": "What recognizable bad move does this argument make?",
        "conceptual_core": "Fallacy work should improve reasoning, not turn discussion into name-calling. Students should first describe the move in plain language, then attach the label. The label is useful only if it identifies the structure: attacking a person instead of the argument, pretending there are only two options, misrepresenting an opponent, changing the subject, appealing to popularity, or assuming the conclusion.",
        "student_moves": [
            "Describe what the speaker does in ordinary language.",
            "Match that move to the fallacy label.",
            "Use the wrong choices as contrast cases rather than memorized vocabulary.",
            "Explain how the argument could return to the real issue."
        ],
        "common_confusions": [
            "Students may label any bad argument with a familiar fallacy name.",
            "Students may confuse a harsh tone with ad hominem when the evidence is still addressed.",
            "Students may spot the topic but miss the argumentative move."
        ],
        "teacher_prompts": [
            "What move did the speaker make?",
            "Did the reply address the claim or dodge it?",
            "How would you describe the error without using a fallacy label?"
        ],
        "worked_example": {
            "scenario": "A student asks whether a new schedule has evidence behind it. Another student replies, you just hate change and want the school to fail.",
            "think_aloud": "The reply attacks the person's attitude instead of answering the evidence question. That is an ad hominem style move, not a response to the argument.",
            "takeaway": "Name the pattern only after you can describe the bad reasoning move."
        },
        "assessment": "A good answer selects the fallacy whose structure matches the scenario and rejects labels that are only topically related.",
        "extension": "Have students revise a fallacious argument into a stronger version that addresses the actual issue.",
        "resource_note": "The quiz feedback links fallacy items to corresponding LogFall articles when a direct article match is available."
    },
    "probability": {
        "essential_question": "How should uncertainty affect what we expect?",
        "conceptual_core": "Probability gives students language for partial belief. Many claims are neither proved nor disproved; they are more or less likely given the information available. Students need to distinguish chance from certainty, risk from outcome, signal from guarantee, and individual cases from long-run frequencies. This is essential for forecasts, tests, warnings, and everyday planning.",
        "student_moves": [
            "Translate percentages into out-of-100 language.",
            "Ask whether the number describes a chance, a frequency, a false alarm rate, or a prediction.",
            "Keep likely separate from certain and unlikely separate from impossible.",
            "Notice when the evidence changes odds without settling the result."
        ],
        "common_confusions": [
            "Students may treat a high probability as a guarantee.",
            "Students may treat a low probability as impossible.",
            "Students may ignore the base rate or the group the probability applies to."
        ],
        "teacher_prompts": [
            "Out of 100 similar cases, about how many would we expect?",
            "Does this number tell us what will happen here, or how often it tends to happen?",
            "What uncertainty remains?"
        ],
        "worked_example": {
            "scenario": "A weather app says there is a 70 percent chance of rain in town tomorrow.",
            "think_aloud": "That does not mean it will rain for 70 percent of the day or that rain is guaranteed. It means that in similar forecast situations, rain would occur about 70 out of 100 times.",
            "takeaway": "Probability guides expectations while leaving room for uncertainty."
        },
        "assessment": "A good answer uses the probability as evidence without turning it into certainty or dismissing it as useless.",
        "extension": "Ask students to rewrite probabilistic claims as frequencies and identify what group of cases the frequency refers to."
    },
    "statistical_sense": {
        "essential_question": "What does this number mean in context?",
        "conceptual_core": "Statistical sense keeps numbers connected to their denominators, baselines, units, and comparisons. Students should learn that a precise number can still be misleading if the reference point is missing. The central habits are asking compared with what, out of how many, measured how, and over what time period. The goal is not advanced math; it is disciplined interpretation.",
        "student_moves": [
            "Identify the numerator and denominator behind a rate.",
            "Ask what the number is being compared with.",
            "Separate percent change from percentage-point change.",
            "Check whether averages, totals, or selected examples hide variation."
        ],
        "common_confusions": [
            "Students may think a bigger raw count always means a bigger rate.",
            "Students may treat a percentage change as clear without knowing the starting value.",
            "Students may ignore whether the comparison groups are the same size."
        ],
        "teacher_prompts": [
            "Out of how many?",
            "Compared with what baseline?",
            "Is this a total, rate, average, percentage, or percentage-point change?"
        ],
        "worked_example": {
            "scenario": "A clinic says missed appointments fell by 20 percent after reminder texts, from 100 missed visits per month to 80.",
            "think_aloud": "The 20 percent has a reference point: 20 fewer missed visits compared with the earlier 100. Without the before number, the change would be harder to judge.",
            "takeaway": "Numbers become meaningful when the comparison and denominator are visible."
        },
        "assessment": "A good answer identifies the missing or correct numerical context: baseline, denominator, comparison group, unit, or time period.",
        "extension": "Have students convert every statistic in a news paragraph into a sentence that names the denominator and comparison."
    },
    "causation": {
        "essential_question": "Has the argument shown that one thing caused another?",
        "conceptual_core": "Causal claims are attractive because they suggest a lever for action. Students should learn that timing and correlation are clues, not proof. A responsible causal judgment asks about comparison groups, other changes, selection effects, reverse direction, and plausible mechanisms. This skill slows the leap from after this to because of this.",
        "student_moves": [
            "Check whether the alleged cause happened before the effect.",
            "Ask what else changed at the same time.",
            "Look for a comparison group or baseline trend.",
            "Consider whether the effect could have influenced the supposed cause."
        ],
        "common_confusions": [
            "Students may assume that improvement after a plan proves the plan caused it.",
            "Students may treat correlation as useless rather than as a clue that needs testing.",
            "Students may ignore selection effects when people choose into a program."
        ],
        "teacher_prompts": [
            "What would we need to compare?",
            "What else could have changed?",
            "Could the cause and effect be reversed or both caused by a third factor?"
        ],
        "worked_example": {
            "scenario": "Reported thefts drop after brighter streetlights are installed, but the city also increases evening patrols that month.",
            "think_aloud": "The drop is compatible with the lights helping, but patrols are a rival cause. A better design would compare similar streets with and without the lighting change while tracking patrol changes.",
            "takeaway": "A causal claim gets stronger when rival causes are ruled out."
        },
        "assessment": "A good answer explains why the cause is not yet proven or identifies evidence that would better test the causal link.",
        "extension": "Ask students to list three rival causes for a before-after result before they discuss the original cause."
    },
    "alternative_explanations": {
        "essential_question": "What else could explain the same facts?",
        "conceptual_core": "Alternative explanation thinking is disciplined imagination. Students keep the observed evidence fixed and ask what other story could make it true. This reduces premature closure, especially when the first explanation is emotionally satisfying or easy to remember. The strongest alternative explanation is specific, plausible, and compatible with the given facts.",
        "student_moves": [
            "Name the observed result without interpreting it.",
            "Generate another cause, condition, or selection effect that could produce the same result.",
            "Reject alternatives that contradict the prompt.",
            "Prefer alternatives that are specific enough to test."
        ],
        "common_confusions": [
            "Students may offer a random possibility that does not fit the facts.",
            "Students may think an alternative explanation must disprove the original explanation.",
            "Students may choose a vague phrase like many factors without naming one."
        ],
        "teacher_prompts": [
            "What fact are we trying to explain?",
            "What other story could make that fact true?",
            "How could we test the original explanation against this alternative?"
        ],
        "worked_example": {
            "scenario": "A museum's family attendance rises after free Friday admission begins, but a popular dinosaur exhibit opens the same weekend.",
            "think_aloud": "Free admission could matter, but the new exhibit could also explain the attendance increase. Both fit the observed rise, so we need more evidence to separate them.",
            "takeaway": "An alternative explanation does not have to be proven; it has to plausibly fit the same evidence."
        },
        "assessment": "A good answer names a plausible alternative that matches the observed facts and avoids unsupported contradictions.",
        "extension": "Have students practice the sentence frame: The result could be due to __, but it could also be due to __."
    },
    "cognitive_biases": {
        "essential_question": "What mental pull is shaping this judgment?",
        "conceptual_core": "Cognitive biases are patterns in attention, memory, confidence, motivation, and social influence. Students should learn that bias does not mean stupidity or bad character; it means a normal mental shortcut is distorting judgment. The skill is to identify the pull: toward confirming what we already believe, following the group, protecting past effort, anchoring on the first number, or trusting what is easiest to recall.",
        "student_moves": [
            "Identify what the thinker is drawn toward or away from.",
            "Separate evidence problems from mind-pattern problems.",
            "Match the pattern to the bias label.",
            "Suggest a debiasing move, such as seeking disconfirming evidence or resetting the anchor."
        ],
        "common_confusions": [
            "Students may label any mistake as bias without naming the mental pattern.",
            "Students may confuse a fallacy in an argument with a bias in judgment.",
            "Students may treat bias as something only other people have."
        ],
        "teacher_prompts": [
            "What is pulling the person's attention?",
            "What information is being overweighted or ignored?",
            "What would a more balanced thinking move look like?"
        ],
        "worked_example": {
            "scenario": "After deciding a study app is helpful, a student reads only positive reviews and skips detailed negative reviews.",
            "think_aloud": "The student is filtering information to support a prior belief. That is confirmation bias, and the correction is to actively inspect evidence on the other side.",
            "takeaway": "Bias labels should point to a specific mental pull."
        },
        "assessment": "A good answer identifies the bias pattern shown by the person's thinking and distinguishes it from nearby labels.",
        "extension": "Ask students to design a small debiasing checklist for one decision they actually face.",
        "resource_note": "The quiz feedback links bias items to corresponding CogBias articles when a direct article match is available."
    },
    "tradeoffs": {
        "essential_question": "What does this choice gain, and what does it give up or risk?",
        "conceptual_core": "Tradeoff thinking moves students beyond pro-con lists by asking how goods compete. Time, money, attention, privacy, fairness, speed, safety, accuracy, and flexibility can all be scarce. A tradeoff is not merely a downside; it is a relationship between values or resources. Strong tradeoff answers keep the benefit and the cost in one frame.",
        "student_moves": [
            "Identify the main benefit the plan seeks.",
            "Identify the resource, value, or opportunity it may use up.",
            "Look for second effects on people not centered in the proposal.",
            "Avoid answers that mention a cost without linking it to the choice."
        ],
        "common_confusions": [
            "Students may treat any negative fact as a tradeoff even if it is unrelated.",
            "Students may ignore opportunity cost because no money is visibly spent.",
            "Students may choose the most emotional consequence rather than the clearest competing value."
        ],
        "teacher_prompts": [
            "What is the plan trying to improve?",
            "What could get worse, receive less attention, or become riskier?",
            "Who benefits, who pays, and who carries the risk?"
        ],
        "worked_example": {
            "scenario": "A school wants more test-prep time before exams by reducing open reading time.",
            "think_aloud": "The plan may improve short-term test practice, but it spends time that could support independent reading, curiosity, and long-term literacy. That is the tradeoff.",
            "takeaway": "A tradeoff names both the gain and what is spent or risked to get it."
        },
        "assessment": "A good answer shows the competing benefit and cost, risk, delay, or opportunity cost in the same decision.",
        "extension": "Ask students to map one school policy as a triangle of benefits, costs, and affected groups."
    },
    "belief_update": {
        "essential_question": "How much should new evidence change confidence?",
        "conceptual_core": "Belief updating teaches proportion. Students should neither ignore evidence that points in a direction nor treat one small result as final proof. The skill joins direction and size: does the evidence support or weaken the claim, and is it strong enough to move confidence a little or a lot? This habit is central to intellectual humility.",
        "student_moves": [
            "State the prior uncertainty or starting belief.",
            "Decide whether the evidence points toward or away from the claim.",
            "Judge the evidence strength using sample, comparison, directness, and reliability.",
            "Move confidence by an amount that fits the evidence."
        ],
        "common_confusions": [
            "Students may think changing confidence means fully changing sides.",
            "Students may ignore weak evidence because it is not conclusive.",
            "Students may overreact to one vivid case or small test."
        ],
        "teacher_prompts": [
            "Which direction does the evidence point?",
            "How strong is it?",
            "What uncertainty remains after we update?"
        ],
        "worked_example": {
            "scenario": "You are unsure whether brighter lights reduce theft reports. A small matched test finds reports fell from 50 to 44 over the same period nearby streets stayed about the same.",
            "think_aloud": "The evidence points toward the lights helping, and the comparison makes it more useful. But it is still one small test, so confidence should increase somewhat, not jump to certainty.",
            "takeaway": "Responsible updating changes belief in proportion to evidence strength."
        },
        "assessment": "A good answer names both the direction and size of the confidence change while preserving remaining uncertainty.",
        "extension": "Ask students to practice a confidence scale from 0 to 100 and explain what would move them 5 points versus 30 points."
    },
}

SYNTHESIS_ARCS = [
    {
        "title": "Clarify the object of judgment",
        "skills": "01-04",
        "summary": "Critical thinking begins by slowing down the rush to agree or disagree. These skills identify the claim, define the terms, map the argument, and locate the assumption that makes the reasoning possible.",
    },
    {
        "title": "Evaluate support",
        "skills": "05-08",
        "summary": "Once the target is clear, the thinker asks whether the support actually matters, whether it is strong enough, whether the source deserves trust, and whether the conclusion follows without a hidden jump.",
    },
    {
        "title": "Handle error and uncertainty",
        "skills": "09-14",
        "summary": "Real reasoning happens under uncertainty and human pressure. These skills name common fallacies, interpret probability and statistics, resist weak causal claims, generate alternatives, and notice cognitive bias.",
    },
    {
        "title": "Decide and update responsibly",
        "skills": "15-16",
        "summary": "Critical thinking ends in judgment, not paralysis. These skills help learners weigh tradeoffs and update confidence by the right amount when new evidence arrives.",
    },
]


SYNTHESIS_OVERVIEWS = {
    "clarify_claim": {
        "aspect": "The object of judgment",
        "overview": "Critical thinking needs a target. Before a person can judge an argument, they must know what is actually being claimed. This skill prevents students from attacking background details, reacting to tone, or treating evidence as if it were the conclusion. It is the first act of intellectual fairness: identify the point someone wants accepted before deciding whether it deserves acceptance.",
        "practice": "Ask: What sentence would still need support if all the scene-setting details were removed?",
        "connection": "This skill prepares every later skill, because relevance, evidence, assumptions, and belief updates all depend on knowing the claim under review.",
    },
    "define_terms": {
        "aspect": "The meaning of the target",
        "overview": "Arguments often fail because key words carry hidden standards. Fair, harmful, enough, better, safe, affordable, and effective are not small decorative words; they can decide the whole dispute. Defining terms turns a blurry argument into a testable one. Students learn that disagreement is sometimes about facts, but often about what the words are allowed to mean.",
        "practice": "Ask: Which word would two reasonable people define differently while thinking they agree?",
        "connection": "Clear terms make claims measurable and make evidence easier to interpret.",
    },
    "find_argument": {
        "aspect": "The structure of support",
        "overview": "A thinker needs to know what each sentence is doing. Some sentences state conclusions, some give reasons, some provide examples, and some merely set the scene. This skill trains students to see argument as architecture rather than a pile of statements. Once the structure is visible, students can test whether the support actually holds the conclusion up.",
        "practice": "Ask: Which sentence is being supported, and which sentence is doing the supporting?",
        "connection": "Argument structure connects claim clarification to later work on assumptions and logical gaps.",
    },
    "hidden_assumptions": {
        "aspect": "The unstated bridge",
        "overview": "Reasoning often depends on what is left unsaid. A stated reason may be true, and the conclusion may still not follow unless a bridge assumption is also true. Students who can find assumptions become less vulnerable to persuasive gaps. They learn to ask what must be true, not merely what would be convenient, interesting, or vaguely related.",
        "practice": "Ask: If this unstated idea were false, would the reason still support the conclusion?",
        "connection": "Assumption work is the hinge between understanding an argument and evaluating whether it earns its conclusion.",
    },
    "relevance": {
        "aspect": "The discipline of attention",
        "overview": "Relevant facts touch the claim; irrelevant facts only stand nearby. This skill trains students to resist vivid but useless details. It is especially important in public arguments, advertising, and social media, where a detail can feel meaningful simply because it shares the same topic. Relevance asks whether a fact changes the rational pressure on the claim.",
        "practice": "Ask: Which part of the claim does this fact help us judge?",
        "connection": "Relevance is the gatekeeper for evidence quality. A fact cannot be strong evidence for a claim if it does not bear on that claim.",
    },
    "evidence_quality": {
        "aspect": "The weight of support",
        "overview": "Evidence comes in grades. Anecdotes, impressions, tiny surveys, large comparisons, transparent measurements, and controlled tests do not deserve equal weight. This skill gives students a practical standard for deciding how much confidence evidence should create. The goal is not cynicism; it is proportional trust based on directness, comparison, sample, measurement, and method.",
        "practice": "Ask: Does this evidence measure the right outcome, in the right group, with a fair comparison?",
        "connection": "Evidence quality links directly to belief updating: stronger evidence should move confidence more than weaker evidence.",
    },
    "source_reliability": {
        "aspect": "Epistemic trust",
        "overview": "Much of what humans know comes through other people. Source reliability teaches students how to trust without being naive and doubt without becoming reflexively suspicious. Expertise, method, transparency, independence, and track record all matter. A source with an interest is not automatically wrong, but hidden methods and strong incentives should change how carefully we treat its claims.",
        "practice": "Ask: How does this source know, and what might make its report tilted, thin, or incomplete?",
        "connection": "Source reliability complements evidence quality by asking whether the pathway from evidence to audience is trustworthy.",
    },
    "logical_gaps": {
        "aspect": "Entitlement to the conclusion",
        "overview": "A logical gap appears when a conclusion reaches beyond what the evidence has earned. The problem may not be false evidence or a bad source; it may simply be an overextended conclusion. Students learn to detect jumps from some to all, possible to certain, short term to long term, one group to another, or average to every individual.",
        "practice": "Ask: What does the evidence show only, and what extra thing does the conclusion add?",
        "connection": "Logical-gap thinking converts vague doubt into a precise diagnosis of what the argument has not shown.",
    },
    "fallacies": {
        "aspect": "Recognizable bad moves",
        "overview": "Fallacies are recurring patterns of failed reasoning. Used well, fallacy names are not insults; they are diagnostic tools. Students should first describe the bad move in ordinary language, then name it. The important habit is to return attention to the real issue: Is the claim supported, or has the speaker dodged, distorted, attacked, or oversimplified?",
        "practice": "Ask: What move did the speaker make instead of addressing the real argument?",
        "connection": "Fallacy recognition strengthens argument evaluation by naming common ways reasoning can go off track.",
    },
    "probability": {
        "aspect": "Thinking between proof and impossibility",
        "overview": "Many real judgments live between yes and no. Probability gives students a language for partial confidence, risk, forecasts, false alarms, and long-run frequencies. It protects against both overconfidence and dismissal. A likely result is not guaranteed; an unlikely result is not impossible; a useful signal is not final proof.",
        "practice": "Ask: Out of 100 similar cases, how many should we expect, and what uncertainty remains?",
        "connection": "Probability prepares students to update belief responsibly rather than swinging between certainty and rejection.",
    },
    "statistical_sense": {
        "aspect": "Numbers with context",
        "overview": "Numbers can illuminate or mislead. Statistical sense keeps quantities attached to denominators, baselines, units, rates, averages, and comparison groups. Students learn that a percentage without a starting point can be empty, a raw count can hide group size, and an average can conceal variation. This is everyday numeracy for judgment.",
        "practice": "Ask: Compared with what, out of how many, measured how, and over what time?",
        "connection": "Statistical sense strengthens evidence quality and makes probability concrete.",
    },
    "causation": {
        "aspect": "Claims about what makes things happen",
        "overview": "Causal claims invite action: if this caused that, then changing this may change that. Because causal claims are powerful, they need discipline. Students learn that timing and correlation are clues, not proof. They look for comparison groups, rival causes, selection effects, reverse direction, and other changes happening at the same time.",
        "practice": "Ask: What else changed, and what comparison would show whether this factor caused the result?",
        "connection": "Causation joins evidence, alternatives, and logical gaps in one of the most common real-world reasoning tasks.",
    },
    "alternative_explanations": {
        "aspect": "Disciplined imagination",
        "overview": "A good thinker does not stop with the first explanation that fits. Alternative explanations keep the observed facts fixed while asking what else could make those facts true. This skill builds humility without paralysis. A plausible alternative does not have to defeat the original explanation by itself; it shows what still needs to be tested.",
        "practice": "Ask: What other story could produce the same result without contradicting the facts?",
        "connection": "Alternative explanations are central to causal reasoning, source evaluation, and fair-minded inquiry.",
    },
    "cognitive_biases": {
        "aspect": "The self as a reasoning instrument",
        "overview": "Critical thinking is not only about other people's arguments. The thinker is part of the system. Biases shape attention, memory, confidence, and motivation before an argument is even spoken. Students learn that bias is not a moral failure; it is a predictable pressure that can be noticed and managed through better habits.",
        "practice": "Ask: What is pulling this person's attention, memory, or confidence off course?",
        "connection": "Bias recognition makes critical thinking self-correcting rather than merely critical of others.",
    },
    "tradeoffs": {
        "aspect": "Judgment among competing goods",
        "overview": "Many decisions are not battles between good and bad. They are choices among values: speed and accuracy, privacy and convenience, fairness and efficiency, short-term gain and long-term cost. Tradeoff thinking teaches students to hold benefits and costs in the same frame. It turns critique into practical judgment.",
        "practice": "Ask: What does this choice gain, and what does it spend, risk, delay, or crowd out?",
        "connection": "Tradeoff thinking bridges analysis and action by showing what a decision commits us to.",
    },
    "belief_update": {
        "aspect": "Calibrated learning",
        "overview": "The endpoint of critical thinking is not permanent doubt. It is better calibration. Students should learn to move confidence in the right direction and by the right amount. Weak evidence may deserve a small update; strong evidence may deserve a large one; no single result should become certainty unless the support truly warrants it.",
        "practice": "Ask: Does this evidence raise or lower confidence, and how much should it move us?",
        "connection": "Belief updating synthesizes the whole model: clarity, evidence, logic, uncertainty, bias, and tradeoffs all feed into proportionate judgment.",
    },
}


PROCESS_TEMPLATES = {
    "clarify_claim": "To uncover the answer, separate the speaker's recommendation from the evidence used to support it. The correct choice is {answer_label} because it states the point the speaker wants accepted: {answer_text}. The other options are either support, background, or an overclaim.",
    "define_terms": "To uncover the answer, look for the term that sets a standard without defining the standard. The correct choice is {answer_label} because {answer_text} is the wording that needs a clear boundary before the argument can be judged.",
    "find_argument": "To uncover the answer, ask which sentence is being supported by the others. The correct choice is {answer_label}: {answer_text}. Treat evidence and background as helpers, not as the conclusion itself.",
    "hidden_assumptions": "To uncover the answer, put the stated reason next to the conclusion and ask what bridge must be true between them. The correct choice is {answer_label} because it supplies that bridge without adding a much stronger claim than the argument needs.",
    "relevance": "To uncover the answer, match each fact to the claim's action, group, and result. The correct choice is {answer_label} because it bears directly on the issue being checked rather than merely sounding related.",
    "evidence_quality": "To uncover the answer, compare how directly and fairly each option tests the claim. The correct choice is {answer_label} because it gives stronger measurement, comparison, sample, or method than the alternatives.",
    "source_reliability": "To uncover the answer, ask what would make the source less trustworthy as a source: weak expertise, hidden method, tilted sample, or pressure to slant the result. The correct choice is {answer_label} because it gives that kind of warning.",
    "logical_gaps": "To uncover the answer, state exactly what the evidence shows, then compare it with what the conclusion adds. The correct choice is {answer_label} because it names the jump the argument makes.",
    "fallacies": "To uncover the answer, describe the bad move before naming it. The correct choice is {answer_label} because the scenario matches that pattern: {answer_text}. Use the other labels as contrast cases.",
    "probability": "To uncover the answer, keep chance separate from certainty. The correct choice is {answer_label} because it treats the number or signal as useful evidence while preserving uncertainty.",
    "statistical_sense": "To uncover the answer, identify the denominator, baseline, rate, or comparison that makes the number meaningful. The correct choice is {answer_label} because it reads the quantity in the right context.",
    "causation": "To uncover the answer, ask what else changed or what comparison is missing. The correct choice is {answer_label} because it blocks the leap from observed change to proven cause.",
    "alternative_explanations": "To uncover the answer, keep the observed result fixed and test which option gives another plausible cause. The correct choice is {answer_label} because it fits the facts without assuming the original explanation is the only one.",
    "cognitive_biases": "To uncover the answer, identify the mental pull in the scenario. The correct choice is {answer_label} because {answer_text} names the bias pattern shown by the person's thinking.",
    "tradeoffs": "To uncover the answer, hold the possible gain and the possible cost in the same sentence. The correct choice is {answer_label} because it shows what is gained and what is given up, delayed, or risked.",
    "belief_update": "To uncover the answer, choose both the direction and the size of the confidence change. The correct choice is {answer_label} because it moves belief in proportion to the evidence instead of ignoring or overreacting to it.",
}


class DotXMark(Flowable):
    """Draw a dot-based X mark echoing the site identity."""

    def __init__(self, width=1.25 * inch, height=1.25 * inch):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        colors_ = [TEAL, CORAL, GOLD, BLUE, GREEN, PURPLE, colors.HexColor("#2f7d9b"), colors.HexColor("#b07a28")]
        radius = 0.055 * inch
        points = [
            (0.20, 0.20), (0.32, 0.32), (0.44, 0.44), (0.56, 0.56),
            (0.80, 0.20), (0.68, 0.32), (0.56, 0.44), (0.44, 0.56),
            (0.20, 0.80), (0.32, 0.68), (0.68, 0.68), (0.80, 0.80),
            (0.44, 0.44), (0.56, 0.44), (0.44, 0.56), (0.56, 0.56),
        ]
        for index, (x, y) in enumerate(points):
            self.canv.setFillColor(colors_[index % len(colors_)])
            self.canv.circle(x * self.width, y * self.height, radius, fill=1, stroke=0)


class CurriculumDoc(BaseDocTemplate):
    def __init__(
        self,
        filename,
        title="XiXteen Critical Thinking Curriculum",
        subject="Critical thinking curriculum and item bank",
        running_title="XiXteen Critical Thinking Curriculum",
    ):
        self.running_title = running_title
        frame = Frame(
            MARGIN_X,
            MARGIN_BOTTOM,
            CONTENT_WIDTH,
            PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM,
            id="normal",
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
        )
        super().__init__(
            filename,
            pagesize=letter,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            title=title,
            author="XiXteen",
            subject=subject,
        )
        self.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=draw_page_frame)])


def draw_page_frame(canvas, doc):
    canvas.saveState()
    page_num = canvas.getPageNumber()
    if page_num > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(MARGIN_X, PAGE_HEIGHT - 0.42 * inch, PAGE_WIDTH - MARGIN_X, PAGE_HEIGHT - 0.42 * inch)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN_X, PAGE_HEIGHT - 0.30 * inch, getattr(doc, "running_title", "XiXteen Critical Thinking Curriculum"))
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(PAGE_WIDTH - MARGIN_X, 0.34 * inch, str(page_num))
        canvas.setStrokeColor(LINE)
        canvas.line(MARGIN_X, 0.50 * inch, PAGE_WIDTH - MARGIN_X, 0.50 * inch)
    canvas.restoreState()


def build_styles():
    base = getSampleStyleSheet()
    return {
        "CoverTitle": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=34,
            leading=38,
            textColor=INK,
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "CoverSub": ParagraphStyle(
            "CoverSub",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=13,
            leading=18,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=18,
        ),
        "H1": ParagraphStyle(
            "H1",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=27,
            textColor=INK,
            spaceBefore=4,
            spaceAfter=10,
        ),
        "H2": ParagraphStyle(
            "H2",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=INK,
            spaceBefore=10,
            spaceAfter=6,
        ),
        "Body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.4,
            leading=12.7,
            textColor=INK,
            spaceAfter=5,
        ),
        "BodySmall": ParagraphStyle(
            "BodySmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.2,
            leading=10.8,
            textColor=INK,
            spaceAfter=4,
        ),
        "Muted": ParagraphStyle(
            "Muted",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.1,
            leading=10.6,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "ChapterKicker": ParagraphStyle(
            "ChapterKicker",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=MUTED,
            spaceAfter=4,
        ),
        "ChapterTitle": ParagraphStyle(
            "ChapterTitle",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=26,
            leading=30,
            textColor=INK,
            spaceAfter=7,
        ),
        "ChapterPublic": ParagraphStyle(
            "ChapterPublic",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=13,
            leading=17,
            textColor=TEAL,
            spaceAfter=10,
        ),
        "ItemTitle": ParagraphStyle(
            "ItemTitle",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=9.0,
            leading=11.4,
            textColor=INK,
            spaceBefore=5,
            spaceAfter=4,
        ),
        "Prompt": ParagraphStyle(
            "Prompt",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.8,
            leading=11.5,
            textColor=INK,
            spaceAfter=5,
        ),
        "Choice": ParagraphStyle(
            "Choice",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.8,
            leading=9.8,
            textColor=INK,
        ),
        "Feedback": ParagraphStyle(
            "Feedback",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.7,
            leading=9.7,
            textColor=INK,
            spaceAfter=2,
        ),
    }


def p(text):
    return escape(str(text or ""), quote=False)


def bold(label, text):
    return f"<b>{p(label)}</b> {p(text)}"


def chunked(values, size):
    for index in range(0, len(values), size):
        yield values[index:index + size]


def load_data():
    skills = json.loads((DATA_DIR / "skills.json").read_text())
    items = json.loads((DATA_DIR / "question-bank.json").read_text())
    by_skill = defaultdict(list)
    for item in items:
        by_skill[item["skill"]].append(item)
    for skill_id in by_skill:
        by_skill[skill_id].sort(key=lambda item: (item["difficulty"], item["id"]))
    skills.sort(key=lambda skill: skill["ordinal"])
    return skills, by_skill, items


def skill_accent(skill):
    return colors.HexColor(ACCENTS[(skill["ordinal"] - 1) % len(ACCENTS)])


def slugify(value):
    value = value.replace("'", "")
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "skill"


def skill_pdf_path(skill):
    return SKILL_OUTPUT_DIR / f"{skill['code']}-{slugify(skill['publicLabel'])}.pdf"


def pdf_href(path):
    return str(path.relative_to(ROOT)).replace("\\", "/")


def numbered_paragraphs(title, values, styles):
    flowables = [Paragraph(p(title), styles["H2"])]
    for index, value in enumerate(values, start=1):
        flowables.append(Paragraph(f"<b>{index}.</b> {p(value)}", styles["BodySmall"]))
    return flowables


def pedagogy_summary_table(skill, items, styles):
    accent = skill_accent(skill)
    details = SKILL_CURRICULUM[skill["id"]]
    expansion = PEDAGOGY_EXPANSIONS[skill["id"]]
    rows = [
        [Paragraph("<b>Essential question</b>", styles["Choice"]), Paragraph(p(expansion["essential_question"]), styles["BodySmall"])],
        [Paragraph("<b>Why it matters</b>", styles["Choice"]), Paragraph(p(details["importance"]), styles["BodySmall"])],
        [Paragraph("<b>Conceptual core</b>", styles["Choice"]), Paragraph(p(expansion["conceptual_core"]), styles["BodySmall"])],
        [Paragraph("<b>Student method</b>", styles["Choice"]), Paragraph(p(details["method"]), styles["BodySmall"])],
        [Paragraph("<b>Analogy</b>", styles["Choice"]), Paragraph(p(details["analogy"]), styles["BodySmall"])],
        [Paragraph("<b>Assessment focus</b>", styles["Choice"]), Paragraph(p(expansion["assessment"]), styles["BodySmall"])],
    ]
    resource_note = expansion.get("resource_note") or details.get("resource")
    if resource_note:
        rows.append([Paragraph("<b>Resource note</b>", styles["Choice"]), Paragraph(p(resource_note), styles["BodySmall"])])
    table = Table(rows, colWidths=[1.22 * inch, CONTENT_WIDTH - 1.22 * inch], repeatRows=0)
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, accent),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1eadc")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def worked_example_table(skill, styles):
    expansion = PEDAGOGY_EXPANSIONS[skill["id"]]
    example = expansion["worked_example"]
    rows = [
        [Paragraph("<b>Scenario</b>", styles["Choice"]), Paragraph(p(example["scenario"]), styles["BodySmall"])],
        [Paragraph("<b>Teacher think-aloud</b>", styles["Choice"]), Paragraph(p(example["think_aloud"]), styles["BodySmall"])],
        [Paragraph("<b>Student takeaway</b>", styles["Choice"]), Paragraph(p(example["takeaway"]), styles["BodySmall"])],
    ]
    table = Table(rows, colWidths=[1.35 * inch, CONTENT_WIDTH - 1.35 * inch])
    table.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.45, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f7f3ea")),
        ("BACKGROUND", (1, 0), (1, -1), PAPER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def pedagogy_deep_dive(skill, styles):
    expansion = PEDAGOGY_EXPANSIONS[skill["id"]]
    flowables = [
        Spacer(1, 0.12 * inch),
        Paragraph("Teaching Sequence", styles["H2"]),
    ]
    flowables.extend([Paragraph(f"<b>{index}.</b> {p(value)}", styles["BodySmall"]) for index, value in enumerate(expansion["student_moves"], start=1)])
    flowables.extend(numbered_paragraphs("Common Confusions To Watch For", expansion["common_confusions"], styles))
    flowables.extend(numbered_paragraphs("Teacher Prompts", expansion["teacher_prompts"], styles))
    flowables.extend([
        CondPageBreak(2.2 * inch),
        Paragraph("Worked Example", styles["H2"]),
        worked_example_table(skill, styles),
        Spacer(1, 0.08 * inch),
        Paragraph(f"<b>Classroom extension.</b> {p(expansion['extension'])}", styles["BodySmall"]),
    ])
    return flowables


def make_cover(styles, item_count):
    story = [Spacer(1, 0.28 * inch)]
    mark_table = Table([[DotXMark()]], colWidths=[CONTENT_WIDTH])
    mark_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.extend([
        mark_table,
        Spacer(1, 0.18 * inch),
        Paragraph("XiXteen", styles["CoverTitle"]),
        Paragraph("A comprehensive critical thinking curriculum built from 16 skills and objective quiz items.", styles["CoverSub"]),
        Spacer(1, 0.18 * inch),
        summary_table([
            ("Skills", "16"),
            ("Items", f"{item_count:,}"),
            ("Levels per skill", "5"),
            ("Items per skill", "160"),
        ], styles, accent=TEAL),
        Spacer(1, 0.35 * inch),
        Paragraph(
            "This curriculum turns the XiXteen item bank into a teachable sequence. Each chapter introduces one critical thinking skill, explains why it matters, gives a solving method, and then presents the full item set with answer feedback and teaching commentary.",
            styles["Body"],
        ),
        Paragraph(f"Generated from the current XiXteen corpus on {date.today().isoformat()}.", styles["Muted"]),
        PageBreak(),
    ])
    return story


def make_front_matter(styles, skills, by_skill):
    map_cells = []
    for left, right in zip(skills[:8], skills[8:]):
        map_cells.append([curriculum_map_cell(left, styles), curriculum_map_cell(right, styles)])
    table = Table(map_cells, colWidths=[CONTENT_WIDTH / 2 - 0.05 * inch, CONTENT_WIDTH / 2 - 0.05 * inch])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return [
        Paragraph("How To Use This Curriculum", styles["H1"]),
        Paragraph("XiXteen is organized around daily practice: one objective item from each of 16 critical thinking skills. This PDF expands that structure into a curriculum reference for learners, teachers, tutors, debate coaches, and anyone who wants to build a steadier habit of judgment.", styles["Body"]),
        Paragraph("Each chapter begins with a rigorous skill introduction and then lists items by difficulty. The feedback is intentionally choice-level: students should learn not only why the right answer is right, but why each tempting alternative is weaker.", styles["Body"]),
        Paragraph("Teaching Routine", styles["H2"]),
        Paragraph(bold("1.", "Read the prompt slowly and name the target skill before looking at the choices."), styles["BodySmall"]),
        Paragraph(bold("2.", "Predict the kind of answer the skill calls for: claim, definition, conclusion, assumption, relevance, evidence, source warning, logical gap, fallacy, probability move, statistic, causal caution, alternative explanation, bias, tradeoff, or belief update."), styles["BodySmall"]),
        Paragraph(bold("3.", "Choose an answer, then read every feedback note. The distractor feedback is where much of the learning happens."), styles["BodySmall"]),
        Paragraph(bold("4.", "Use the process commentary to reconstruct the path from prompt to answer."), styles["BodySmall"]),
        Paragraph("Curriculum Map", styles["H2"]),
        table,
    ]


def curriculum_map_cell(skill, styles):
    return Paragraph(
        f"<b>{p(skill['code'])} {p(skill['publicLabel'])}</b><br/>"
        f"<font color='#637176'>{p(skill['name'])}</font><br/>"
        f"{p(skill['testableTask'])}",
        styles["Choice"],
    )


def synthesis_arc_table(styles):
    rows = [[
        Paragraph("<b>Arc</b>", styles["Choice"]),
        Paragraph("<b>Skills</b>", styles["Choice"]),
        Paragraph("<b>Role in critical thinking</b>", styles["Choice"]),
    ]]
    for arc in SYNTHESIS_ARCS:
        rows.append([
            Paragraph(p(arc["title"]), styles["Choice"]),
            Paragraph(p(arc["skills"]), styles["Choice"]),
            Paragraph(p(arc["summary"]), styles["BodySmall"]),
        ])
    table = Table(rows, colWidths=[1.72 * inch, 0.72 * inch, CONTENT_WIDTH - 2.44 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1eadc")),
        ("BOX", (0, 0), (-1, -1), 0.6, TEAL),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def summary_table(pairs, styles, accent):
    row = []
    for label, value in pairs:
        row.append(Paragraph(f"<b>{p(value)}</b><br/><font color='#637176'>{p(label)}</font>", styles["Choice"]))
    table = Table([row], colWidths=[CONTENT_WIDTH / len(pairs)] * len(pairs))
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.75, accent),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def chapter_intro(skill, items, styles, include_page_break=True):
    accent = skill_accent(skill)
    story = [
        Paragraph(f"Skill {p(skill['code'])}", styles["ChapterKicker"]),
        Paragraph(p(skill["name"]), styles["ChapterTitle"]),
        Paragraph(p(skill["publicLabel"]), styles["ChapterPublic"]),
        summary_table([
            ("Objective", skill["testableTask"]),
            ("Items", str(len(items))),
            ("Difficulty bands", "Levels 1-5"),
        ], styles, accent=accent),
        Spacer(1, 0.14 * inch),
        pedagogy_summary_table(skill, items, styles),
    ]
    story.extend(pedagogy_deep_dive(skill, styles))
    story.extend([
        Spacer(1, 0.12 * inch),
        Paragraph("Item Bank", styles["H2"]),
        Paragraph("Items are grouped by level. For each item, read the prompt, predict the answer, choose, and then use the feedback and process commentary to examine the reasoning path.", styles["Body"]),
    ])
    if include_page_break:
        story.insert(0, PageBreak())
    return story


def item_process_note(skill, item):
    correct = next(choice for choice in item["choices"] if choice["id"] == item["answer"])
    template = PROCESS_TEMPLATES[skill["id"]]
    return template.format(
        answer_label=correct["id"],
        answer_text=correct["text"],
    )


def make_choices_table(item, styles):
    cells = []
    correct = item["answer"]
    for choice in item["choices"]:
        label = choice["id"]
        marker = "correct" if label == correct else "choice"
        cells.append(Paragraph(f"<b>{p(label)}.</b> {p(choice['text'])}<br/><font color='#637176'>{marker}</font>", styles["Choice"]))
    rows = list(chunked(cells, 2))
    table = Table(rows, colWidths=[CONTENT_WIDTH / 2 - 0.03 * inch, CONTENT_WIDTH / 2 - 0.03 * inch])
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.25, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return table


def make_feedback(item, styles):
    blocks = []
    for label in LABELS:
        choice = next(choice for choice in item["choices"] if choice["id"] == label)
        status = "Correct" if label == item["answer"] else "Distractor"
        resource = item.get("resources", {}).get(label)
        text = f"<b>{p(label)} feedback ({status}):</b> {p(item['feedback'].get(label, ''))}"
        if resource:
            text += f"<br/><font color='#637176'>Study link: {p(resource['site'])} - <a href='{p(resource['url'])}'>{p(resource['title'])}</a></font>"
        blocks.append(Paragraph(text, styles["Feedback"]))
    return blocks


def make_item_flowables(skill, item, styles):
    accent = skill_accent(skill)
    answer = item["answer"]
    flowables = [
        CondPageBreak(2.45 * inch),
        HRFlowable(width="100%", thickness=0.55, color=LINE, spaceBefore=5, spaceAfter=5),
        Paragraph(f"{p(item['id'])} | Level {item['difficulty']} | Answer {p(answer)}", styles["ItemTitle"]),
        Paragraph(f"<b>Prompt.</b> {p(item['prompt'])}", styles["Prompt"]),
        make_choices_table(item, styles),
        Spacer(1, 0.05 * inch),
        Paragraph(f"<b>Core explanation.</b> {p(item['explanation'])}", styles["BodySmall"]),
        Paragraph(f"<b>Process commentary.</b> {p(item_process_note(skill, item))}", styles["BodySmall"]),
    ]
    if item.get("tags"):
        useful_tags = [tag for tag in item["tags"] if not tag.startswith("variant-")]
        flowables.append(Paragraph(f"<font color='#637176'>Tags: {p(', '.join(useful_tags))}</font>", styles["Muted"]))
    flowables.extend(make_feedback(item, styles))
    flowables.append(Spacer(1, 0.04 * inch))
    return flowables


def level_heading(level, skill, styles):
    return [
        CondPageBreak(1.0 * inch),
        Spacer(1, 0.05 * inch),
        Paragraph(f"Level {level}", styles["H2"]),
        Paragraph(level_description(level, skill), styles["Muted"]),
    ]


def level_description(level, skill):
    descriptions = {
        1: "Level 1 establishes the clean version of the skill: the cue is direct, the distractors are visible, and the main task is to learn the contrast.",
        2: "Level 2 keeps the same skill but adds more realistic wording and more tempting distractors.",
        3: "Level 3 asks for steadier discrimination: the right answer is still objective, but the wrong answers often sound plausible.",
        4: "Level 4 asks learners to hold more context in mind while applying the same method.",
        5: "Level 5 is for fluency: the learner should now name the thinking move and explain the elimination path.",
    }
    return descriptions[level]


def make_skill_cover(skill, items, styles):
    accent = skill_accent(skill)
    expansion = PEDAGOGY_EXPANSIONS[skill["id"]]
    story = [Spacer(1, 0.24 * inch)]
    mark_table = Table([[DotXMark()]], colWidths=[CONTENT_WIDTH])
    mark_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.extend([
        mark_table,
        Spacer(1, 0.16 * inch),
        Paragraph(f"Skill {p(skill['code'])}", styles["ChapterKicker"]),
        Paragraph(p(skill["name"]), styles["CoverTitle"]),
        Paragraph(p(skill["publicLabel"]), styles["CoverSub"]),
        summary_table([
            ("Items", str(len(items))),
            ("Levels", "1-5"),
            ("Objective", skill["testableTask"]),
        ], styles, accent=accent),
        Spacer(1, 0.26 * inch),
        Paragraph(f"<b>Essential question.</b> {p(expansion['essential_question'])}", styles["Body"]),
        Paragraph(
            "This PDF is designed for classroom use. It gives teachers a rigorous introduction to the skill, a repeatable solving routine, likely student confusions, a worked example, and the full XiXteen item set with choice-level feedback.",
            styles["Body"],
        ),
        Paragraph(f"Generated from the current XiXteen corpus on {date.today().isoformat()}.", styles["Muted"]),
        PageBreak(),
    ])
    return story


def append_item_bank(story, skill, items, styles):
    current_level = None
    for item in items:
        if item["difficulty"] != current_level:
            current_level = item["difficulty"]
            story.extend(level_heading(current_level, skill, styles))
        story.extend(make_item_flowables(skill, item, styles))


def make_synthesis_cover(styles):
    story = [Spacer(1, 0.25 * inch)]
    mark_table = Table([[DotXMark()]], colWidths=[CONTENT_WIDTH])
    mark_table.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
    story.extend([
        mark_table,
        Spacer(1, 0.18 * inch),
        Paragraph("XiXteen Synthesis", styles["CoverTitle"]),
        Paragraph("The sixteen skills as essential aspects of critical thinking.", styles["CoverSub"]),
        Spacer(1, 0.16 * inch),
        summary_table([
            ("Skills", "16"),
            ("Organizing arcs", "4"),
            ("Purpose", "calibrated judgment"),
        ], styles, accent=TEAL),
        Spacer(1, 0.28 * inch),
        Paragraph(
            "Critical thinking is not one mysterious talent. It is a coordinated set of habits that help a person clarify what is being judged, evaluate the support, handle uncertainty, notice human error, weigh competing goods, and update belief responsibly.",
            styles["Body"],
        ),
        Paragraph(
            "This synthesis paper explains how the sixteen XiXteen skills fit together as a practical model of judgment for everyday thinkers, students, and teachers.",
            styles["Body"],
        ),
        Paragraph(f"Generated from the current XiXteen skill model on {date.today().isoformat()}.", styles["Muted"]),
        PageBreak(),
    ])
    return story


def make_synthesis_front_matter(styles):
    return [
        Paragraph("A Practical Model Of Critical Thinking", styles["H1"]),
        Paragraph(
            "The XiXteen model treats critical thinking as a repeatable movement from clarity to calibration. The learner first identifies the object of judgment, then asks whether the support is relevant, strong, trustworthy, and logically sufficient. From there, the learner handles uncertainty, looks for rival explanations and mental bias, weighs tradeoffs, and changes confidence by the right amount.",
            styles["Body"],
        ),
        Paragraph(
            "The point is not to make students suspicious of everything. The point is to help them become more accurate, fair, and flexible in the presence of claims, evidence, numbers, sources, causes, explanations, choices, and new information.",
            styles["Body"],
        ),
        Paragraph("The Four Arcs", styles["H2"]),
        synthesis_arc_table(styles),
        Spacer(1, 0.14 * inch),
        Paragraph("Why Sixteen Skills?", styles["H2"]),
        Paragraph(
            "Sixteen is enough to cover the core terrain without turning the curriculum into a vocabulary maze. The skills are objective enough to test, friendly enough to practice daily, and broad enough to transfer across school, work, media, personal decisions, and civic life.",
            styles["Body"],
        ),
        Paragraph(
            "Together, the skills form a sequence. A learner can ask: What is the claim? What do the terms mean? What is the argument? What is assumed? What evidence matters? How good is it? Can we trust the source? Does the logic follow? What bad reasoning move or mental bias might be present? How should probability, numbers, causation, alternatives, tradeoffs, and new evidence change judgment?",
            styles["Body"],
        ),
    ]


def synthesis_skill_flowables(skill, styles):
    overview = SYNTHESIS_OVERVIEWS[skill["id"]]
    accent = skill_accent(skill)
    header = Table(
        [[
            Paragraph(f"<b>{p(skill['code'])}</b>", styles["ChapterPublic"]),
            Paragraph(f"<b>{p(skill['publicLabel'])}</b><br/><font color='#637176'>{p(skill['name'])}</font>", styles["BodySmall"]),
            Paragraph(f"<b>Essential aspect:</b><br/>{p(overview['aspect'])}", styles["BodySmall"]),
        ]],
        colWidths=[0.55 * inch, 2.15 * inch, CONTENT_WIDTH - 2.70 * inch],
    )
    header.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, accent),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LINE),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f1eadc")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return [
        CondPageBreak(2.4 * inch),
        header,
        Spacer(1, 0.06 * inch),
        Paragraph(p(overview["overview"]), styles["Body"]),
        Paragraph(f"<b>Practice move.</b> {p(overview['practice'])}", styles["BodySmall"]),
        Paragraph(f"<b>Connection.</b> {p(overview['connection'])}", styles["BodySmall"]),
        Spacer(1, 0.08 * inch),
    ]


def make_synthesis_skill_overviews(styles, skills):
    story = [
        PageBreak(),
        Paragraph("The Sixteen Essential Aspects", styles["H1"]),
        Paragraph(
            "Each skill below names one aspect of critical thinking that students can practice directly. The friendly public names keep the work approachable; the underlying aspects keep the curriculum rigorous.",
            styles["Body"],
        ),
    ]
    for skill in skills:
        story.extend(synthesis_skill_flowables(skill, styles))
    return story


def make_synthesis_teacher_notes(styles):
    return [
        PageBreak(),
        Paragraph("Teaching The Synthesis", styles["H1"]),
        Paragraph(
            "A teacher does not need to teach all sixteen skills at once. The synthesis is most useful as a map: students can locate the kind of thinking a task demands, then practice the specific move. Over time, the moves combine into a general habit of judgment.",
            styles["Body"],
        ),
        Paragraph("Three Classroom Uses", styles["H2"]),
        Paragraph(bold("1.", "Use the four arcs as a unit structure: clarity, support, uncertainty, and judgment."), styles["BodySmall"]),
        Paragraph(bold("2.", "Use the sixteen questions as a discussion protocol for articles, lab claims, historical interpretations, policy proposals, ads, or student essays."), styles["BodySmall"]),
        Paragraph(bold("3.", "Use the daily XiXteen board as retrieval practice, then select one missed item for a short metacognitive discussion."), styles["BodySmall"]),
        Paragraph("The Transfer Goal", styles["H2"]),
        Paragraph(
            "The goal is transfer. A student has not merely learned a critical thinking term when they can pick it on a quiz. They have learned the skill when they spontaneously ask the right kind of question in a new setting: What exactly is being claimed? What does that word mean? What evidence would matter? What else could explain it? How much should this change my confidence?",
            styles["Body"],
        ),
        Paragraph(
            "XiXteen is built to make that transfer concrete. The items give objective practice. The feedback explains why each distractor is weaker. The synthesis shows why the sixteen separate moves belong together as one disciplined way of thinking.",
            styles["Body"],
        ),
    ]


def build_synthesis_pdf(styles, skills):
    story = []
    story.extend(make_synthesis_cover(styles))
    story.extend(make_synthesis_front_matter(styles))
    story.extend(make_synthesis_skill_overviews(styles, skills))
    story.extend(make_synthesis_teacher_notes(styles))
    SYNTHESIS_FILE.parent.mkdir(parents=True, exist_ok=True)
    doc = CurriculumDoc(
        str(SYNTHESIS_FILE),
        title="XiXteen Synthesis: The Sixteen Skills",
        subject="Overview of sixteen critical thinking skills as essential aspects of judgment",
        running_title="XiXteen Synthesis",
    )
    doc.build(story)
    return SYNTHESIS_FILE


def build_master_pdf(styles, skills, by_skill, all_items):
    story = []
    story.extend(make_cover(styles, len(all_items)))
    story.extend(make_front_matter(styles, skills, by_skill))
    for skill in skills:
        items = by_skill[skill["id"]]
        story.extend(chapter_intro(skill, items, styles))
        append_item_bank(story, skill, items, styles)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = CurriculumDoc(str(OUTPUT_FILE))
    doc.build(story)
    return OUTPUT_FILE


def build_skill_pdf(styles, skill, items):
    story = []
    story.extend(make_skill_cover(skill, items, styles))
    story.extend(chapter_intro(skill, items, styles, include_page_break=False))
    append_item_bank(story, skill, items, styles)
    path = skill_pdf_path(skill)
    path.parent.mkdir(parents=True, exist_ok=True)
    title = f"XiXteen Skill {skill['code']}: {skill['name']}"
    doc = CurriculumDoc(
        str(path),
        title=title,
        subject=f"{skill['name']} curriculum and quiz item bank",
        running_title=f"XiXteen Skill {skill['code']}: {skill['publicLabel']}",
    )
    doc.build(story)
    return path


def write_teacher_resource_manifest(skills, by_skill, pdf_paths):
    manifest = {
        "generated": date.today().isoformat(),
        "master": {
            "title": "Complete XiXteen Critical Thinking Curriculum",
            "href": pdf_href(OUTPUT_FILE),
            "description": "Full 16-skill curriculum with all item feedback and classroom commentary.",
        },
        "synthesis": {
            "title": "XiXteen Synthesis Paper",
            "href": pdf_href(SYNTHESIS_FILE),
            "description": "A concise overview of the 16 skills as essential aspects of critical thinking.",
        },
        "skills": [],
    }
    for skill in skills:
        expansion = PEDAGOGY_EXPANSIONS[skill["id"]]
        path = pdf_paths[skill["id"]]
        manifest["skills"].append({
            "id": skill["id"],
            "code": skill["code"],
            "name": skill["name"],
            "publicLabel": skill["publicLabel"],
            "testableTask": skill["testableTask"],
            "essentialQuestion": expansion["essential_question"],
            "itemCount": len(by_skill[skill["id"]]),
            "href": pdf_href(path),
        })
    TEACHER_RESOURCE_FILE.write_text(json.dumps(manifest, indent=2) + "\n")
    return TEACHER_RESOURCE_FILE


def build_pdf():
    styles = build_styles()
    skills, by_skill, all_items = load_data()
    outputs = [
        build_synthesis_pdf(styles, skills),
        build_master_pdf(styles, skills, by_skill, all_items),
    ]
    skill_paths = {}
    for skill in skills:
        items = by_skill[skill["id"]]
        path = build_skill_pdf(styles, skill, items)
        skill_paths[skill["id"]] = path
        outputs.append(path)
    outputs.append(write_teacher_resource_manifest(skills, by_skill, skill_paths))
    for output in outputs:
        print(output)


if __name__ == "__main__":
    build_pdf()

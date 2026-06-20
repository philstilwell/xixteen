#!/usr/bin/env python3
"""Build the XiXteen curriculum PDF from the generated question bank."""

from __future__ import annotations

import json
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
    def __init__(self, filename):
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
            title="XiXteen Critical Thinking Curriculum",
            author="XiXteen",
            subject="Critical thinking curriculum and item bank",
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
        canvas.drawString(MARGIN_X, PAGE_HEIGHT - 0.30 * inch, "XiXteen Critical Thinking Curriculum")
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


def chapter_intro(skill, items, styles):
    accent = skill_accent(skill)
    details = SKILL_CURRICULUM[skill["id"]]
    rows = [
        [Paragraph("<b>Why it matters</b>", styles["Choice"]), Paragraph(p(details["importance"]), styles["BodySmall"])],
        [Paragraph("<b>Method</b>", styles["Choice"]), Paragraph(p(details["method"]), styles["BodySmall"])],
        [Paragraph("<b>Analogy</b>", styles["Choice"]), Paragraph(p(details["analogy"]), styles["BodySmall"])],
        [Paragraph("<b>Related example</b>", styles["Choice"]), Paragraph(p(details["example"]), styles["BodySmall"])],
        [Paragraph("<b>Teacher move</b>", styles["Choice"]), Paragraph(p(details["classroom"]), styles["BodySmall"])],
    ]
    if details.get("resource"):
        rows.append([Paragraph("<b>Resource note</b>", styles["Choice"]), Paragraph(p(details["resource"]), styles["BodySmall"])])
    table = Table(rows, colWidths=[1.18 * inch, CONTENT_WIDTH - 1.18 * inch])
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
    return [
        PageBreak(),
        Paragraph(f"Skill {p(skill['code'])}", styles["ChapterKicker"]),
        Paragraph(p(skill["name"]), styles["ChapterTitle"]),
        Paragraph(p(skill["publicLabel"]), styles["ChapterPublic"]),
        summary_table([
            ("Objective", skill["testableTask"]),
            ("Items", str(len(items))),
            ("Difficulty bands", "Levels 1-5"),
        ], styles, accent=accent),
        Spacer(1, 0.14 * inch),
        table,
        Spacer(1, 0.12 * inch),
        Paragraph("Item Bank", styles["H2"]),
        Paragraph("Items are grouped by level. For each item, read the prompt, predict the answer, choose, and then use the feedback and process commentary to examine the reasoning path.", styles["Body"]),
    ]


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


def build_pdf():
    styles = build_styles()
    skills, by_skill, all_items = load_data()
    story = []
    story.extend(make_cover(styles, len(all_items)))
    story.extend(make_front_matter(styles, skills, by_skill))
    for skill in skills:
        items = by_skill[skill["id"]]
        story.extend(chapter_intro(skill, items, styles))
        current_level = None
        for item in items:
            if item["difficulty"] != current_level:
                current_level = item["difficulty"]
                story.extend(level_heading(current_level, skill, styles))
            story.extend(make_item_flowables(skill, item, styles))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    doc = CurriculumDoc(str(OUTPUT_FILE))
    doc.build(story)
    print(OUTPUT_FILE)


if __name__ == "__main__":
    build_pdf()

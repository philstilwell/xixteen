#!/usr/bin/env python3
"""Build the ready-to-teach PDF, editable Markdown, and ZIP packs from one source.

Uses ReportLab's bundled redistributable TrueType fonts, embedded in every PDF.
No network service, external font download, or paid API is required.
"""

from __future__ import annotations

import argparse
import json
from html import escape
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

import reportlab
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, HRFlowable, KeepTogether, PageBreak,
    PageTemplate, Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/teaching-packs.json"
PDF_DIR = ROOT / "output/pdf/teaching-packs"
EDITABLE_DIR = ROOT / "output/teaching-packs"
PAGE_W, PAGE_H = letter
MARGIN = 46
CONTENT_W = PAGE_W - 2 * MARGIN
TOP = 65
BOTTOM = 48
CONTENT_H = PAGE_H - TOP - BOTTOM
INK = colors.HexColor("#1f2a2e")
TEAL = colors.HexColor("#176969")
MUTED = colors.HexColor("#566568")
LINE = colors.HexColor("#d1d9d6")
PALE = colors.HexColor("#edf3ef")

FONT_DIR = Path(reportlab.__file__).parent / "fonts"
for name, filename in [("XiXPack", "Vera.ttf"), ("XiXPack-Bold", "VeraBd.ttf"),
                       ("XiXPack-Italic", "VeraIt.ttf"),
                       ("XiXPack-BoldItalic", "VeraBI.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(FONT_DIR / filename)))
pdfmetrics.registerFontFamily("XiXPack", normal="XiXPack", bold="XiXPack-Bold",
                             italic="XiXPack-Italic", boldItalic="XiXPack-BoldItalic")
rl_config.canvas_basefontname = "XiXPack"
# Some table/canvas defaults name Helvetica even when cells use embedded fonts.
pdfmetrics.registerFont(TTFont("Helvetica", str(FONT_DIR / "Vera.ttf")))

STYLES = {
    "title": ParagraphStyle("title", fontName="XiXPack-Bold", fontSize=22,
                            leading=27, textColor=INK, spaceAfter=12),
    "subtitle": ParagraphStyle("subtitle", fontName="XiXPack", fontSize=11,
                               leading=16, textColor=MUTED, spaceAfter=12),
    "heading": ParagraphStyle("heading", fontName="XiXPack-Bold", fontSize=12,
                              leading=17, textColor=TEAL, spaceBefore=10,
                              spaceAfter=7, keepWithNext=True),
    "body": ParagraphStyle("body", fontName="XiXPack", fontSize=10,
                           leading=14.6, textColor=INK, spaceAfter=7),
    "small": ParagraphStyle("small", fontName="XiXPack", fontSize=9,
                            leading=12.5, textColor=MUTED, spaceAfter=6),
    "numbered": ParagraphStyle("numbered", fontName="XiXPack", fontSize=10,
                               leading=14.6, textColor=INK, leftIndent=17,
                               firstLineIndent=-17, spaceAfter=7),
    "compact": ParagraphStyle("compact", fontName="XiXPack", fontSize=9.2,
                              leading=13, textColor=INK, spaceAfter=5),
}


def p(text, style="body"):
    return Paragraph(escape(text), STYLES[style])


def labelled(label, text, style="body"):
    return Paragraph(f"<b>{escape(label)}</b> {escape(text)}", STYLES[style])


def bullets(items, compact=False):
    style = "compact" if compact else "body"
    return [p("- " + item, style) for item in items]


def numbered(items):
    return [p(f"{i}. {text}", "numbered") for i, text in enumerate(items, 1)]


class WritingLines(Flowable):
    def __init__(self, height=150):
        super().__init__()
        self.width = CONTENT_W
        self.height = height

    def draw(self):
        self.canv.setStrokeColor(LINE)
        self.canv.setLineWidth(.45)
        y = self.height - 18
        while y > 0:
            self.canv.line(0, y, self.width, y)
            y -= 23


def header(canvas, doc):
    canvas.saveState()
    canvas.setFont("XiXPack-Bold", 10)
    canvas.setFillColor(TEAL)
    canvas.drawString(MARGIN, PAGE_H - 33, "XiXteen")
    canvas.setFont("XiXPack", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 33, doc.role.upper())
    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN, PAGE_H - 43, PAGE_W - MARGIN, PAGE_H - 43)
    canvas.setFont("XiXPack", 7.8)
    canvas.drawString(MARGIN, 28, f"Skill {doc.pack['skillCode']} | {doc.pack['skillLabel']}")
    canvas.drawRightString(PAGE_W - MARGIN, 28, f"xixteen.com | {doc.page}")
    canvas.restoreState()


def make_doc(path, pack, role):
    doc = BaseDocTemplate(str(path), pagesize=letter, title=pack["title"] + " - " + role,
                          author="XiXteen / Phil Stilwell", subject=pack["subtitle"],
                          leftMargin=MARGIN, rightMargin=MARGIN, topMargin=TOP,
                          bottomMargin=BOTTOM, pageCompression=1, invariant=1)
    doc.pack, doc.role = pack, role
    frame = Frame(MARGIN, BOTTOM, CONTENT_W, CONTENT_H, leftPadding=0,
                  rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates(PageTemplate(id="pack", frames=frame, onPage=header))
    return doc


def timing_table(pack):
    rows = [[p(f"{step['minutes']} min", "compact"),
             labelled(step["title"] + ".", step["instructions"], "compact")]
            for step in pack["timeline"]]
    table = Table(rows, colWidths=[52, CONTENT_W - 52], hAlign="LEFT")
    table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEABOVE", (0, 0), (-1, -1), .45, LINE),
        ("FONTNAME", (0, 0), (-1, -1), "XiXPack"),
    ]))
    return table


def estimate_height(flowables):
    total = 0
    for item in flowables:
        total += item.wrap(CONTENT_W, CONTENT_H)[1]
        total += item.getSpaceBefore() + item.getSpaceAfter()
    return total


def student_page(pack, key, index):
    exercise = pack[key]
    label = {"warmup": "Warm-up", "activity": "Main activity", "exitTicket": "Exit ticket"}[key]
    story = [p(f"{label} / {exercise['title']}", "title")]
    if key == "warmup":
        story.extend([p(pack["title"], "subtitle"),
                      p("Name: __________________________  Date: ______________", "small"),
                      p(f"Suggested lesson time: {pack['durationMinutes']} minutes. Work individually, then compare when invited.", "small"),
                      p("Useful words", "heading")])
        story.extend(labelled(v["term"] + ":", v["definition"], "compact") for v in pack["vocabulary"])
    else:
        story.append(p("Name: __________________________", "small"))
    story.extend([p("Read the scenario", "heading"), p(exercise["scenario"]),
                  labelled("Produce:", exercise["output"]), p("Your steps", "heading")])
    story.extend(numbered(exercise["steps"]))
    story.extend([labelled("Before you finish:", exercise["check"]),
                  p("Your response", "heading")])
    # Fill each deliberately separate activity page with ruled writing space.
    # Leave a buffer for layout rounding and adjacent paragraph space collapsing.
    available = CONTENT_H - estimate_height(story) - 14
    if available < 45:
        raise ValueError(f"{pack['slug']}/{key}: insufficient writing room ({available:.1f} pt)")
    story.append(WritingLines(min(available, 300)))
    return story


def instructor_exercise(pack, key):
    exercise = pack[key]
    label = {"warmup": "Warm-up", "activity": "Main activity", "exitTicket": "Exit ticket"}[key]
    story = [p(f"{label} / {exercise['title']}", "title"),
             p("Student task and instructor answer", "small")]
    if key == "warmup":
        story.append(p("Explain these words as needed", "heading"))
        story.extend(labelled(v["term"] + ":", v["definition"], "compact") for v in pack["vocabulary"])
    story.extend([p("Scenario", "heading"), p(exercise["scenario"]),
                  labelled("Student output:", exercise["output"])])
    story.extend(numbered(exercise["steps"]))
    story.extend([labelled("Student success check:", exercise["check"]),
                  p("Model answer", "heading"), p(exercise["modelAnswer"]),
                  labelled("Why this meets the task:", exercise["whyAdequate"])])
    if key == "exitTicket":
        story.extend([p("Check understanding", "heading"),
                      p("Mark each criterion met or needs another attempt. Accept equivalent wording; assess the reasoning, not a memorized phrase.", "small")])
        story.extend(bullets(pack["assessmentCriteria"], compact=True))
    return story


def instructor_story(pack):
    story = [p(pack["title"], "title"), p(pack["subtitle"], "subtitle"),
             p(f"Suggested teaching time: {pack['durationMinutes']} min | Preparation: about {pack['prepMinutes']} min", "small"),
             p(f"{pack['level']} | {pack['audience']} | {pack['format']}", "small"),
             labelled("Prerequisites:", pack["prerequisites"], "small"),
             p("Students will be able to", "heading")]
    story.extend(bullets(pack["objectives"], compact=True))
    story.append(p("Prepare and gather", "heading"))
    story.extend(bullets(pack["materials"], compact=True))
    story.extend(bullets(pack["preparation"], compact=True))
    story.extend([p("Teaching sequence", "heading"), timing_table(pack),
                  p("Timings are suggested starting points, not measured classroom completion times.", "small")])
    if estimate_height(story) > CONTENT_H - 12:
        raise ValueError(f"{pack['slug']}: overview exceeds its page")
    for key in ("warmup", "activity", "exitTicket"):
        story.append(PageBreak())
        section = instructor_exercise(pack, key)
        if estimate_height(section) > CONTENT_H - 10:
            raise ValueError(f"{pack['slug']}/{key}: answer page is too tall")
        story.extend(section)
    story.extend([PageBreak(), p("Discussion and adaptations", "title"),
                  p("Use the supplied guidance to keep the lesson focused on its reasoning skill.", "subtitle"),
                  p("Discussion prompts", "heading")])
    for item in pack["discussion"]:
        story.extend([p(item["prompt"], "body"), labelled("Listen for:", item["guidance"], "small")])
    story.append(p("Common confusions", "heading"))
    for item in pack["misconceptions"]:
        story.append(labelled(item["misconception"], item["response"], "compact"))
    story.append(p("Adapt the lesson", "heading"))
    for item in pack["adaptations"]:
        story.append(labelled(item["label"] + ":", item["instructions"], "compact"))
    story.extend([p("Next practice", "heading"),
                  p("https://xixteen.com" + pack["practiceHref"], "small")])
    for item in pack["articleLinks"]:
        story.append(p(item["title"] + ": https://xixteen.com" + item["href"], "small"))
    return story


def markdown_exercise(exercise, label, answers=False):
    parts = [f"## {label}: {exercise['title']}", "", exercise["scenario"], "",
             "**Produce:** " + exercise["output"], ""]
    parts.extend(f"{i}. {step}" for i, step in enumerate(exercise["steps"], 1))
    parts.extend(["", "**Before you finish:** " + exercise["check"], ""])
    if answers:
        parts.extend(["### Model answer", "", exercise["modelAnswer"], "",
                      "**Why this meets the task:** " + exercise["whyAdequate"], ""])
    else:
        parts.extend(["**Your response:**", "", "[Write here.]", ""])
    return parts


def markdown(pack, instructor=False):
    role = "Instructor guide" if instructor else "Student handout"
    parts = [f"# {pack['title']}", "", f"**XiXteen | {role} | Skill {pack['skillCode']}: {pack['skillLabel']}**", "",
             pack["subtitle"], "", f"Suggested teaching time: {pack['durationMinutes']} minutes. All scenarios and figures are invented for reasoning practice.", ""]
    if instructor:
        parts.extend([f"Preparation: about {pack['prepMinutes']} minutes.", "",
                      f"Level: {pack['level']}. Audience: {pack['audience']}. Prerequisites: {pack['prerequisites']}", ""])
        for key, title in [("objectives", "Learning outcomes"), ("materials", "Materials"), ("preparation", "Preparation")]:
            parts.extend(["## " + title, ""] + ["- " + item for item in pack[key]] + [""])
        parts.extend(["## Teaching sequence", ""])
        parts.extend(f"- **{item['minutes']} min - {item['title']}:** {item['instructions']}" for item in pack["timeline"])
        parts.extend(["", "Timings are suggested starting points, not measured classroom completion times.", ""])
    else:
        parts.extend(["Name: __________________________  Date: ______________", ""])
    parts.extend(["## Useful words", ""])
    parts.extend(f"- **{item['term']}:** {item['definition']}" for item in pack["vocabulary"])
    parts.append("")
    for key, label in [("warmup", "Warm-up"), ("activity", "Main activity"), ("exitTicket", "Exit ticket")]:
        parts.extend(markdown_exercise(pack[key], label, instructor))
    if instructor:
        parts.extend(["## Check understanding", "", "Mark each criterion met or needs another attempt. Accept equivalent wording.", ""])
        parts.extend("- " + item for item in pack["assessmentCriteria"])
        parts.extend(["", "## Discussion prompts", ""])
        for item in pack["discussion"]:
            parts.extend(["**" + item["prompt"] + "**", "", item["guidance"], ""])
        parts.extend(["## Common confusions", ""])
        for item in pack["misconceptions"]:
            parts.extend(["**" + item["misconception"] + "** " + item["response"], ""])
        parts.extend(["## Adaptations", ""])
        parts.extend(f"- **{item['label']}:** {item['instructions']}" for item in pack["adaptations"])
        parts.extend(["", "## Related resources", "", "- Focused practice: https://xixteen.com" + pack["practiceHref"]])
        parts.extend(f"- {item['title']}: https://xixteen.com{item['href']}" for item in pack["articleLinks"])
    parts.extend(["", "Source: adapted from XiXteen's existing guided classroom exercise for this skill, with new introductory and transfer activities. https://xixteen.com", ""])
    return "\n".join(parts)


def validate(pack):
    assert sum(step["minutes"] for step in pack["timeline"]) == pack["durationMinutes"], pack["slug"]
    for key in ("warmup", "activity", "exitTicket"):
        item = pack[key]
        for field in ("title", "scenario", "output", "steps", "check", "modelAnswer", "whyAdequate"):
            assert item[field], f"{pack['slug']}/{key}/{field}"
        assert item["scenario"].startswith("Invented scenario:"), pack["slug"]
    assert len(pack["assessmentCriteria"]) == 3
    assert all(str(value).startswith("/output/") for value in pack["downloads"].values())


def deterministic_zip(path, entries, date):
    year, month, day = map(int, date.split("-"))
    with ZipFile(path, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for name, data in entries:
            info = ZipInfo(name, (year, month, day, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    data = json.loads(SOURCE.read_text())
    for pack in data["packs"]:
        validate(pack)
    if args.validate_only:
        print(f"Validated {len(data['packs'])} teaching packs and their timings.")
        return
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    EDITABLE_DIR.mkdir(parents=True, exist_ok=True)
    for pack in data["packs"]:
        files = []
        for role, instructor in [("student", False), ("instructor", True)]:
            filename = f"{pack['slug']}-{role}"
            pdf = PDF_DIR / (filename + ".pdf")
            if instructor:
                story = instructor_story(pack)
            else:
                story = []
                for index, key in enumerate(("warmup", "activity", "exitTicket")):
                    if index:
                        story.append(PageBreak())
                    story.extend(student_page(pack, key, index))
            make_doc(pdf, pack, "Instructor guide" if instructor else "Student handout").build(story)
            md = EDITABLE_DIR / (filename + ".md")
            md.write_text(markdown(pack, instructor), encoding="utf-8")
            files.extend([pdf, md])
        readme = (f"{pack['title']}\nXiXteen teaching pack\n\n"
                  "Start with the instructor guide for the sequence and model answers.\n"
                  "Give students only the student handout. The instructor guide contains answers.\n"
                  "The Markdown (.md) files are editable plain-text counterparts.\n"
                  f"Suggested duration: {pack['durationMinutes']} minutes. Timings have not been classroom-tested.\n"
                  "All scenarios are invented for reasoning practice.\n"
                  f"Online lesson: https://xixteen.com/instructors/lessons/{pack['slug']}/\n")
        entries = [(file.name, file.read_bytes()) for file in files] + [("READ-ME.txt", readme.encode())]
        deterministic_zip(EDITABLE_DIR / (pack["slug"] + ".zip"), entries, data["updated"])
        print(f"Built {pack['slug']}: student PDF, instructor PDF, two editable sources, complete ZIP.")


if __name__ == "__main__":
    main()

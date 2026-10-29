#!/usr/bin/env python3
"""Check exported teaching packs without replacing visual or content review."""
import json
import re
from pathlib import Path
from zipfile import ZipFile

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / 'data/teaching-packs.json').read_text())
skills = json.loads((ROOT / 'data/skills.json').read_text())
assert {p['skillId'] for p in data['packs']} == {s['id'] for s in skills}
assert len(data['packs']) == len(skills) == 16


def normalized(text):
    return re.sub(r'\s+', ' ', text).strip()


def embedded(font):
    font = font.get_object()
    if font.get('/Subtype') == '/Type0':
        return all(embedded(child) for child in font['/DescendantFonts'])
    descriptor = font.get('/FontDescriptor')
    return bool(descriptor and any(key in descriptor.get_object() for key in ('/FontFile', '/FontFile2', '/FontFile3')))


pages = 0
for pack in data['packs']:
    expected = {}
    for role, count in [('student', 3), ('instructor', 5)]:
        path = ROOT / pack['downloads'][role + 'Pdf'].lstrip('/')
        reader = PdfReader(path)
        assert len(reader.pages) == count, f'{path.name}: expected {count} pages, found {len(reader.pages)}'
        pages += len(reader.pages)
        text = normalized(' '.join(page.extract_text() for page in reader.pages))
        for page in reader.pages:
            fonts = page['/Resources'].get('/Font')
            assert fonts, f'{path.name}: missing font resources'
            for font in fonts.get_object().values():
                assert embedded(font), f'{path.name}: unembedded font'
        for task in [pack['warmup'], pack['activity'], pack['exitTicket']]:
            for field in ['title', 'scenario', 'output', 'check']:
                assert normalized(task[field]) in text, f'{path.name}: missing {field}'
            for step in task['steps']:
                assert normalized(step) in text, f'{path.name}: missing instruction'
            if role == 'instructor':
                assert normalized(task['modelAnswer']) in text, f'{path.name}: missing model answer'
                assert normalized(task['whyAdequate']) in text, f'{path.name}: missing answer explanation'
        for word in pack['vocabulary']:
            assert normalized(word['definition']) in text, f'{path.name}: missing vocabulary'
        if role == 'instructor':
            for field in ['objectives', 'materials', 'preparation', 'assessmentCriteria']:
                for item in pack[field]:
                    assert normalized(item) in text, f'{path.name}: missing {field}'
            for field, value in [('timeline', 'instructions'), ('discussion', 'guidance'), ('misconceptions', 'response'), ('adaptations', 'instructions')]:
                for item in pack[field]:
                    assert normalized(item[value]) in text, f'{path.name}: missing {field}'
        if role == 'student':
            assert 'Model answer' not in text, f'{path.name}: answers in student handout'
        md = ROOT / pack['downloads'][role + 'Markdown'].lstrip('/')
        assert md.exists() and md.stat().st_size > 500
        expected[path.name] = path.read_bytes()
        expected[md.name] = md.read_bytes()
    archive_path = ROOT / pack['downloads']['zip'].lstrip('/')
    with ZipFile(archive_path) as archive:
        assert set(archive.namelist()) == set(expected) | {'READ-ME.txt'}, archive_path.name
        assert archive.testzip() is None, archive_path.name
        for name, content in expected.items():
            assert archive.read(name) == content, f'{archive_path.name}: stale {name}'
print(f'Verified 16 complete packs: 32 PDFs, {pages} pages, all fonts embedded, 32 editable files, and 16 matching ZIPs.')

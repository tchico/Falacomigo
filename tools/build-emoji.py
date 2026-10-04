#!/usr/bin/env python3
"""Writes app/src/ui/supportedEmoji.json: the emoji the target tablets can draw (NFR-13).

That's every emoji up to Emoji 13.1 (2020), without skin tones. Newer ones, like 🪏 (Emoji 16), show up as a box on
the family's tablet. The content tests check every picture in the app and the content packs against this list.

Usage: python3 -m pip install emoji && python3 tools/build-emoji.py
"""
import json
import re
from pathlib import Path

import emoji

MAX_VERSION = 13.1
skin = re.compile('[\U0001F3FB-\U0001F3FF]')
ok = sorted(
    e.replace('️', '')
    for e, d in emoji.EMOJI_DATA.items()
    if d['E'] <= MAX_VERSION and d['status'] == emoji.STATUS['fully_qualified'] and not skin.search(e)
)
out = Path(__file__).resolve().parent.parent / 'app' / 'src' / 'ui' / 'supportedEmoji.json'
out.write_text(json.dumps({'maxVersion': MAX_VERSION, 'emoji': sorted(set(ok))}, ensure_ascii=False) + '\n', encoding='utf8')
print(f'Wrote {out} ({len(set(ok))} emoji up to Emoji {MAX_VERSION})')

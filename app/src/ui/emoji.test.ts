/// <reference types="node" />
// NFR-13: every picture has to draw on the family's tablet. Emoji newer than the tablet's font show as a box (🪏 did),
// so every emoji in the content packs and the app's own code must be on the supported list (tools/build-emoji.py).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import supported from './supportedEmoji.json';

/** Plain text symbols, which every font has. */
const TEXT_SYMBOLS = ['★', '✎'];
const ok = new Set([...supported.emoji, ...TEXT_SYMBOLS]);
const root = join(__dirname, '..', '..', '..');

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p, ext) : ext.test(f) ? [p] : [];
  });
}

/** The emoji in a text, as whole graphemes ("👩‍⚕️" is one), without the emoji-style selector. */
export function emojiIn(text: string): string[] {
  const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
  return [...seg.segment(text)].map((s) => s.segment).filter((g) => /\p{Extended_Pictographic}/u.test(g)).map((g) => g.replace(/️/g, ''));
}

test('emoji: the check finds whole emoji, joined ones included (NFR-13)', () => {
  assert.deepEqual(emojiIn('Olá 👩‍⚕️ e 🐟!'), ['👩\u200d⚕', '🐟']);
  assert.ok(!ok.has('🪏'), 'the shovel is too new');
  assert.ok(ok.has('🪣'));
});

test('emoji: every emoji in the content and the app can be drawn on the tablet (NFR-13)', () => {
  const sources = [...files(join(root, 'content'), /\.json$/), ...files(join(root, 'app', 'src'), /\.tsx?$/), join(root, 'app', 'App.tsx')].filter(
    (f) => !/supportedEmoji|emoji\.test/.test(f),
  );
  const bad: string[] = [];
  for (const f of sources) for (const e of emojiIn(readFileSync(f, 'utf8'))) if (!ok.has(e)) bad.push(`${e} in ${f.slice(root.length + 1)}`);
  assert.deepEqual([...new Set(bad)], []);
});

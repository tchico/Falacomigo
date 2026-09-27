#!/usr/bin/env node
// Builds content/guide.json from docs/parent-guide.md, so the Markdown stays the single source of truth.
// Usage: node tools/build-guide.mjs          (writes the file)
//        node tools/build-guide.mjs --check  (fails if the JSON is out of date; used in CI)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = join(root, 'docs', 'parent-guide.md');
const outPath = join(root, 'content', 'guide.json');

const md = readFileSync(mdPath, 'utf8');
const sections = md.split(/^## /m).slice(1);

const cards = [];
let sources = [];

const parseTable = (lines) =>
  lines
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    .filter((cells, i) => i !== 1); // drop the --- row

for (const section of sections) {
  const [heading, ...rest] = section.split('\n');
  const body = rest.join('\n').trim();

  if (heading.trim() === 'Sources') {
    const rows = parseTable(body.split('\n')).slice(1);
    sources = rows.map(([n, cell, supports]) => {
      const m = cell.match(/^\[(.+)\]\((https?:\/\/[^)]+)\)$/);
      if (!m) throw new Error(`Source ${n} is not a single Markdown link: ${cell}`);
      return { id: Number(n), title: m[1].replace(/\*/g, ''), url: m[2], supports };
    });
    continue;
  }

  const hm = heading.match(/^(\d+)\.\s+(.+)$/);
  if (!hm) continue;

  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const card = {
    id: Number(hm[1]),
    title: hm[2].trim(),
    kind: 'research',
    paragraphs: [],
    bullets: [],
    steps: [],
    table: null,
    tryThisWeek: '',
    refs: [],
  };

  for (let block of blocks) {
    if (block.startsWith('*Practical advice.*')) {
      card.kind = 'practical';
      block = block.replace('*Practical advice.*', '').trim();
    }
    if (block.startsWith('**Try this week:**')) {
      card.tryThisWeek = block.replace('**Try this week:**', '').trim();
    } else if (block.startsWith('|')) {
      const rows = parseTable(block.split('\n'));
      card.table = { header: rows[0], rows: rows.slice(1) };
    } else if (block.startsWith('- ')) {
      card.bullets.push(...block.split('\n').map((l) => l.replace(/^- /, '').trim()));
    } else if (/^\d+\. /.test(block)) {
      card.steps.push(...block.split('\n').map((l) => l.replace(/^\d+\. /, '').trim()));
    } else {
      card.paragraphs.push(block);
    }
  }

  card.refs = [...new Set([...body.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  if (!card.tryThisWeek) throw new Error(`Card ${card.id} has no "Try this week" line`);
  cards.push(card);
}

for (const card of cards) {
  for (const ref of card.refs) {
    if (!sources.some((s) => s.id === ref)) throw new Error(`Card ${card.id} cites [${ref}], which is not in Sources`);
  }
}

const json = JSON.stringify({ generatedFrom: 'docs/parent-guide.md', cards, sources }, null, 2) + '\n';

if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(outPath, 'utf8'); } catch {}
  if (current !== json) {
    console.error('content/guide.json is out of date. Run: node tools/build-guide.mjs');
    process.exit(1);
  }
  console.log(`guide.json is up to date (${cards.length} cards, ${sources.length} sources)`);
} else {
  writeFileSync(outPath, json);
  console.log(`Wrote content/guide.json (${cards.length} cards, ${sources.length} sources)`);
}

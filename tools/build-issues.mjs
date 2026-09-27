#!/usr/bin/env node
// Builds tools/issues.json from the requirement tables in docs/design.md.
// Usage: node tools/build-issues.mjs          (writes the file)
//        node tools/build-issues.mjs --check  (fails if out of date; used in CI)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const design = readFileSync(join(root, 'docs', 'design.md'), 'utf8');
const outPath = join(root, 'tools', 'issues.json');

const MILESTONES = {
  Must: { title: 'MVP', description: 'Phase 1: the Must requirements (design doc §7).' },
  Should: { title: 'Phase 2 — The full trip', description: 'All 8 units, map and album, sibling modes, parent dashboard.' },
  Could: { title: 'Phase 3 — Conversation', description: 'Free conversation, toddler mode and extras.' },
};

// What the first commit already covers, so the issues say where to start.
const STARTED = {
  'FR-03': 'Scene screen only moves forward after a spoken turn (app/src/screens/SceneScreen.tsx).',
  'FR-04': 'Unit 1 content pack and loader (content/units/unit-01.json, app/src/content). Pictures and audio still to add.',
  'FR-07': 'Three-way result and matcher done (app/src/engine/match.ts). Real pt-PT recogniser still to add; the app uses a stub.',
  'FR-08': 'Fuzzy matcher with per-age strictness done and tested (app/src/engine/match.ts).',
  'FR-09': 'Turn rules done and tested (app/src/engine/turn.ts).',
  'FR-10': 'Gui shows the recast after each turn (SceneScreen). Needs audio.',
  'FR-12': 'Long-press on Gui marks "I heard it" (SceneScreen).',
  'FR-13': 'Progress model done (app/src/engine/ladder.ts). Not yet saved to the device.',
  'FR-14': 'Ladder and review intervals done and tested (app/src/engine/ladder.ts).',
  'FR-15': 'dueForReview() done (app/src/engine/ladder.ts). Warm-up screen still to build.',
  'FR-17': 'Mission card screen done (app/src/screens/MissionScreen.tsx). Needs Dad\'s audio.',
  'FR-18': 'Long-press stars done (MissionScreen). PIN option still to add.',
  'FR-20': 'Coins per turn and per star done (in memory).',
  'FR-36': 'content/guide.json is generated from docs/parent-guide.md (tools/build-guide.mjs).',
  'NFR-07': 'Content is plain JSON outside the app code, validated by tests in CI.',
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const rows = design
  .split('\n')
  .filter((l) => /^\| (N?FR-\d+) \|/.test(l))
  .map((l) => l.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));

const issues = rows.map(([id, area, requirement, priority]) => {
  const kind = id.startsWith('NFR') ? 'non-functional' : 'functional';
  const started = STARTED[id];
  const body = [
    `**${id}** · ${area} · Priority: **${priority}**`,
    '',
    `> ${requirement}`,
    '',
    started ? `**Already started:** ${started}\n` : null,
    '### Done when',
    `- [ ] The requirement above works on a tablet in landscape`,
    `- [ ] Engine logic (if any) has tests in \`app/src/**/*.test.ts\``,
    `- [ ] \`npm test\` and \`npm run typecheck\` pass in \`app/\``,
    '',
    `Spec: [docs/design.md](../blob/main/docs/design.md) · requirement ${id}`,
  ].filter((x) => x !== null).join('\n');

  return {
    id,
    title: `${id} · ${area}: ${requirement.length > 90 ? requirement.slice(0, 87).trimEnd() + '…' : requirement}`,
    body,
    labels: ['requirement', kind, `priority: ${priority.toLowerCase()}`, `area: ${slug(area)}`, ...(started ? ['started'] : [])],
    milestone: MILESTONES[priority].title,
  };
});

const labelColors = { requirement: '2456A6', functional: '7CC4B8', 'non-functional': 'B9C3D1', started: '2E8B88', 'priority: must': 'B84A1A', 'priority: should': 'F2B632', 'priority: could': 'E6DFD2' };
const labels = [...new Set(issues.flatMap((i) => i.labels))].sort().map((name) => ({ name, color: labelColors[name] ?? 'FBF4E6' }));

const json = JSON.stringify({ generatedFrom: 'docs/design.md', milestones: Object.values(MILESTONES), labels, issues }, null, 2) + '\n';

if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(outPath, 'utf8'); } catch {}
  if (current !== json) {
    console.error('tools/issues.json is out of date. Run: node tools/build-issues.mjs');
    process.exit(1);
  }
  console.log(`issues.json is up to date (${issues.length} issues)`);
} else {
  writeFileSync(outPath, json);
  console.log(`Wrote tools/issues.json (${issues.length} issues, ${labels.length} labels)`);
}

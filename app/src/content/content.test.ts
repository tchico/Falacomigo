/// <reference types="node" />
// Checks every content pack so a typo in the JSON is caught by CI, not by a child mid-game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guide, units } from './index';
import { normalize } from '../engine/normalize';
import { buildScene } from '../engine/scene';
import { matchAttempt } from '../engine/match';
import type { AgeBand, ChildProfile } from './types';

const children: ChildProfile[] = [
  { id: 'child1', name: 'Ana', age: 8, ageWord: 'oito', sibling: 'irmão' },
  { id: 'child2', name: 'Tomás', age: 6, ageWord: 'seis', sibling: 'irmã' },
];

for (const unit of units) {
  const ids = new Set(unit.phrases.map((p) => p.id));

  test(`${unit.id}: phrase ids are unique`, () => {
    assert.equal(ids.size, unit.phrases.length);
  });

  test(`${unit.id}: accepted versions are already normalised`, () => {
    for (const p of unit.phrases) {
      for (const a of p.accept) assert.equal(normalize(a), a, `${p.id}: "${a}" should be written as "${normalize(a)}"`);
    }
    for (const s of unit.scenes) for (const b of s.beats) for (const a of b.accept ?? []) {
      assert.equal(normalize(a), a, `${s.id}/${b.id}: "${a}" should be written as "${normalize(a)}"`);
    }
  });

  test(`${unit.id}: scenes, warm-up and missions only use phrases that exist`, () => {
    for (const s of unit.scenes) for (const b of s.beats) {
      if (b.expect) assert.ok(ids.has(b.expect), `${s.id}/${b.id} expects ${b.expect}`);
    }
    for (const id of unit.warmup ?? []) assert.ok(ids.has(id), `warm-up uses ${id}`);
    for (const m of unit.missions) for (const age of ['6', '8'] as const) {
      for (const id of m.targets[age]) assert.ok(ids.has(id), `${m.id} targets ${id}`);
    }
  });

  test(`${unit.id}: every spoken beat accepts its own model phrase, for both children`, () => {
    for (const child of children) {
      for (const s of unit.scenes) {
        for (const beat of buildScene(unit, s.id, child)) {
          if (!beat.target || !beat.modelText) continue;
          // Beats with their own accept list (e.g. "o pai") are checked against their first accepted version.
          const said = s.beats.find((b) => b.id === beat.id)?.accept ? beat.target.accept[0] : beat.modelText;
          const result = matchAttempt(said, beat.target, child.age as AgeBand);
          assert.equal(result, 'got-it', `${s.id}/${beat.id} for age ${child.age}: "${said}" gave ${result}`);
        }
      }
    }
  });

  test(`${unit.id}: each child gets at least one speaking beat per scene`, () => {
    for (const child of children) for (const s of unit.scenes) {
      assert.ok(buildScene(unit, s.id, child).some((b) => b.phrase), `${s.id} for age ${child.age}`);
    }
  });
}

test('guide: 8 cards, each with a try-this-week line and valid references', () => {
  assert.equal(guide.cards.length, 8);
  const sourceIds = new Set(guide.sources.map((s) => s.id));
  for (const c of guide.cards) {
    assert.ok(c.tryThisWeek.length > 0);
    for (const r of c.refs) assert.ok(sourceIds.has(r), `card ${c.id} cites ${r}`);
    if (c.kind === 'research') assert.ok(c.refs.length > 0, `research card ${c.id} has no sources`);
  }
  for (const s of guide.sources) assert.match(s.url, /^https:\/\//);
});

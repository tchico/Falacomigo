/// <reference types="node" />
// Checks every content pack so a typo in the JSON is caught by CI, not by a child mid-game.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guide, shop, units } from './index';
import { normalize } from '../engine/normalize';
import { buildScene } from '../engine/scene';
import { matchAnswer, matchAttempt } from '../engine/match';
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
    for (const s of unit.scenes) for (const b of s.beats) for (const a of [...(b.accept ?? []), ...(b.answers ?? []).flatMap((x) => x.accept)]) {
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
          const said = beat.modelText;
          const result = matchAttempt(said, beat.target, child.age as AgeBand);
          assert.equal(result, 'got-it', `${s.id}/${beat.id} for age ${child.age}: "${said}" gave ${result}`);
        }
      }
    }
  });

  test(`${unit.id}: every other answer to an open question gets its own reply, not the expected answer's`, () => {
    for (const child of children) {
      for (const s of unit.scenes) {
        for (const beat of buildScene(unit, s.id, child)) {
          for (const answer of beat.answers.slice(1)) {
            for (const said of answer.target.accept) {
              const got = matchAnswer(said, beat.answers, child.age as AgeBand);
              assert.equal(got.result, 'got-it', `${s.id}/${beat.id}: "${said}" gave ${got.result}`);
              assert.equal(got.answer.recast, answer.recast, `${s.id}/${beat.id}: "${said}" got the reply "${got.answer.recast}"`);
            }
          }
        }
      }
    }
  });

  test(`${unit.id}: every speaker is Gui or one of the unit's characters`, () => {
    for (const s of unit.scenes) for (const b of s.beats) {
      assert.ok(b.say.speaker === 'gui' || unit.characters?.[b.say.speaker], `${s.id}/${b.id}: unknown speaker ${b.say.speaker}`);
    }
  });

  test(`${unit.id}: each child gets at least one speaking beat per scene`, () => {
    for (const child of children) for (const s of unit.scenes) {
      assert.ok(buildScene(unit, s.id, child).some((b) => b.phrase), `${s.id} for age ${child.age}`);
    }
  });
}

test('content: from Unit 6 on, scenes are built for speaking (FR-38, FR-42)', () => {
  // At least 6 spoken turns per scene for the 8-year-old and 4 for the 6-year-old, and an open turn with several
  // right answers. Units 1 to 5 were written before this rule and get revised separately.
  const need: Record<AgeBand, number> = { 8: 6, 6: 4 };
  for (const unit of units.filter((u) => u.unit >= 6)) for (const s of unit.scenes) {
    for (const child of children) {
      const spoken = buildScene(unit, s.id, child).filter((b) => b.phrase).length;
      assert.ok(spoken >= need[child.age as AgeBand], `${s.id} has ${spoken} spoken turns for age ${child.age}`);
    }
    assert.ok(s.beats.some((b) => (b.answers ?? []).length > 0), `${s.id} has no open turn`);
  }
});

test('content: phrase ids are unique across units, so progress can be keyed by phrase', () => {
  const all = units.flatMap((u) => u.phrases.map((p) => p.id));
  assert.equal(new Set(all).size, all.length);
});

test('content: the MVP has Units 1 and 2 with about 30 phrases (FR-30)', () => {
  assert.deepEqual(units.map((u) => u.id).slice(0, 2), ['unit-01', 'unit-02']);
  const n = units.slice(0, 2).reduce((sum, u) => sum + u.phrases.length, 0);
  assert.ok(n >= 25 && n <= 35, `${n} phrases`);
});

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

test('shop: items have unique ids, sensible prices, and accept their own phrase (FR-22)', () => {
  const ids = shop.items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const item of shop.items) {
    assert.ok(item.price > 0, `${item.id} has a price`);
    for (const a of item.accept) assert.equal(normalize(a), a, `${item.id}: "${a}" should be written as "${normalize(a)}"`);
    for (const age of [6, 8] as const) {
      assert.equal(matchAttempt(item.say, item, age), 'got-it', `${item.id}: "${item.say}" for age ${age}`);
      assert.equal(matchAttempt(item.name, item, age), 'got-it', `${item.id}: just "${item.name}" for age ${age}`);
    }
  }
});

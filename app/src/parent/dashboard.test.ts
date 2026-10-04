/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guide, units } from '../content';
import { newProgress, record, type PhraseProgress } from '../engine/ladder';
import { memoryDb } from '../store/testDb';
import { Store } from '../store/store';
import { childDashboard, tipOfWeek } from './dashboard';

const prog = (id: string, rung: number, outcomes: ('success' | 'failure' | 'nearly')[] = []): PhraseProgress =>
  outcomes.reduce((p, o, i) => record(p, o, `2026-10-0${i + 1}`), newProgress(id, rung));

test('dashboard: phrases per rung, turns on every day, missions and stars (FR-27)', async () => {
  const store = new Store(memoryDb(), () => 1_000);
  await store.init();
  const a = await store.createMission('child1', 'unit-01', 'M1');
  await store.createMission('child1', 'unit-01', 'M2');
  await store.createMission('child2', 'unit-01', 'M1');
  await store.approveMission(a.id, 3, 60);

  const d = childDashboard({
    progress: { P01: prog('P01', 3), P02: prog('P02', 3), P13: prog('P13', 1) },
    units,
    turnsPerDay: [{ day: '2026-10-02', turns: 12 }, { day: '2026-10-04', turns: 30 }],
    missions: await store.missionsFor('child1'),
    today: '2026-10-04',
    days: 4,
  });
  assert.deepEqual(d.perRung, [1, 0, 2, 0, 0]);
  assert.deepEqual(d.days, [
    { day: '2026-10-01', turns: 0 },
    { day: '2026-10-02', turns: 12 },
    { day: '2026-10-03', turns: 0 },
    { day: '2026-10-04', turns: 30 },
  ]);
  assert.equal(d.missionsDone, 1);
  assert.equal(d.missionsOpen, 1);
  assert.equal(d.averageStars, 3);
});

test('dashboard: struggling phrases are the ones going wrong, hardest first, not the nearly ones', () => {
  const d = childDashboard({
    progress: {
      P01: prog('P01', 3, ['success', 'success']),
      P13: prog('P13', 3, ['failure']),
      P14: prog('P14', 3, ['failure', 'failure']),
      P15: prog('P15', 3, ['nearly', 'nearly', 'nearly']),
      P16: prog('P16', 3, ['failure', 'failure', 'success', 'failure', 'success']),
    },
    units,
    turnsPerDay: [],
    missions: [],
    today: '2026-10-04',
  });
  assert.deepEqual(d.struggling.map((s) => s.phraseId), ['P14', 'P13', 'P16']);
  assert.equal(d.struggling[0].text, 'Tenho sede!');
  assert.equal(d.averageStars, null);
});

test('tip of the week: one guide card a week, in order, round and round (FR-34)', () => {
  const n = guide.cards.length;
  assert.equal(tipOfWeek(n, '2026-01-05'), 0);
  assert.equal(tipOfWeek(n, '2026-01-11'), 0, 'the same card all week');
  assert.equal(tipOfWeek(n, '2026-01-12'), 1);
  assert.equal(tipOfWeek(n, '2026-03-02'), 0, `${n} weeks later it starts again`);
  assert.ok(tipOfWeek(n, '2025-12-31') >= 0);
});

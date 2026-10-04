/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guide } from '../content';
import { bump, daysOf, doneDays, parseWeek, planRows, toggleTick, weekOf } from './weeklyPlan';

test('weekly plan: card 5\'s rows get the number of days it suggests, and the app\'s own rows tick themselves (FR-37)', () => {
  const card = guide.cards.find((c) => c.id === 5)!;
  const rows = planRows(card.table!.rows);
  assert.deepEqual(rows.map((r) => r.target), [2, 7, 5, 1, 2, null]);
  assert.deepEqual(rows.map((r) => r.auto), ['sessions', 'missions', undefined, undefined, undefined, undefined]);
});

test('weekly plan: weeks start on Monday (FR-37)', () => {
  assert.equal(weekOf('2026-10-04'), '2026-09-28', 'a Sunday');
  assert.equal(weekOf('2026-09-28'), '2026-09-28', 'a Monday');
  assert.equal(weekOf('2026-10-01'), '2026-09-28');
  assert.deepEqual(daysOf('2026-09-28').slice(-1), ['2026-10-04']);
});

test('weekly plan: ticks toggle, the counter never goes below nothing, and bad data starts afresh (FR-37)', () => {
  let w = parseWeek(null);
  w = toggleTick(w, 2, '2026-09-30');
  w = toggleTick(w, 2, '2026-09-29');
  assert.deepEqual(w.ticks[2], ['2026-09-29', '2026-09-30']);
  w = toggleTick(w, 2, '2026-09-30');
  assert.deepEqual(w.ticks[2], ['2026-09-29']);
  w = bump(bump(w, 'ana', 1), 'ana', 1);
  assert.equal(w.unprompted.ana, 2);
  assert.equal(bump(bump(w, 'rui', -1), 'rui', 1).unprompted.rui, 1);
  assert.deepEqual(parseWeek(JSON.stringify(w)), w);
  assert.deepEqual(parseWeek('{oops'), { ticks: {}, unprompted: {} });
  assert.equal(doneDays(w, 2, new Set(['2026-09-29', '2026-10-01'])).size, 2, 'a day both ticked and seen counts once');
});

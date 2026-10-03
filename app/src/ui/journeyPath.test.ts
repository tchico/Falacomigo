/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { journey } from '../content';
import { trail } from './journeyPath';

test('journey map: dots run from stop to stop, in order along the journey', () => {
  const dots = trail([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }], 4);
  assert.deepEqual(dots.map((d) => d.at), [0.25, 0.5, 0.75, 1.25, 1.5, 1.75]);
  assert.deepEqual(dots[1], { x: 0.5, y: 0, at: 0.5 });
  assert.deepEqual(dots[4], { x: 1, y: 0.5, at: 1.5 });
});

test('journey map: every stop is placed on the map, from the garden in Ireland to Lisbon', () => {
  for (const s of journey.stops) assert.ok(s.x > 0 && s.x < 1 && s.y > 0 && s.y < 1, s.id);
  assert.equal(journey.stops[0].id, 'garden');
  assert.equal(journey.stops[journey.stops.length - 1].id, 'lisboa');
});

/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { units } from '../content';
import { recordingList } from './recordings';
import type { ChildProfile } from '../content/types';

const kids: ChildProfile[] = [
  { id: 'child1', name: 'Ana', age: 8, ageWord: 'oito', sibling: 'irmão' },
  { id: 'child2', name: 'Tomás', age: 6, ageWord: 'seis', sibling: 'irmã' },
];

test('recordings: personal phrases get one clip per child, others one clip', () => {
  const slots = recordingList(units, kids);
  const keys = slots.map((s) => s.key);
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  assert.ok(keys.includes('unit-01/P01.m4a'));
  assert.ok(keys.includes('unit-01/P03-child1.m4a'));
  assert.ok(keys.includes('unit-01/P03-child2.m4a'));
  assert.equal(slots.find((s) => s.key === 'unit-01/P03-child1.m4a')?.text, 'Chamo-me Ana.');
  // P04 is only for the 8-year-old, and isn't personal.
  assert.equal(keys.filter((k) => k.startsWith('unit-01/P04')).length, 1);
});

test('recordings: mission lines per age band, or per child when they use the name', () => {
  const keys = recordingList(units, kids).map((s) => s.key);
  assert.ok(keys.includes('unit-01/M2-8.m4a'));
  assert.ok(keys.includes('unit-01/M2-6.m4a'));
  assert.ok(keys.includes('unit-01/M1-child1.m4a'));
});

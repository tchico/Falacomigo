/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDay, nextMission, nextScene } from './episode';
import type { Unit } from '../content/types';

const unit = (id: string, scenes: string[]) => ({ id, scenes: scenes.map((s) => ({ id: s })) }) as unknown as Unit;
const units = [unit('u1', ['a', 'b']), unit('u2', ['c'])];

test('episode: a new child starts at the first scene', () => {
  assert.deepEqual(nextScene(units, []), { unitId: 'u1', sceneId: 'a', replay: false });
});

test('episode: scenes go in order, then on to the next unit', () => {
  assert.equal(nextScene(units, [{ unitId: 'u1', sceneId: 'a', lastAt: 1 }]).sceneId, 'b');
  const played = [{ unitId: 'u1', sceneId: 'a', lastAt: 1 }, { unitId: 'u1', sceneId: 'b', lastAt: 2 }];
  assert.deepEqual(nextScene(units, played), { unitId: 'u2', sceneId: 'c', replay: false });
});

test('episode: when everything is played, the oldest scene comes back as a replay', () => {
  const played = [
    { unitId: 'u1', sceneId: 'a', lastAt: 5 },
    { unitId: 'u1', sceneId: 'b', lastAt: 2 },
    { unitId: 'u2', sceneId: 'c', lastAt: 9 },
  ];
  assert.deepEqual(nextScene(units, played), { unitId: 'u1', sceneId: 'b', replay: true });
});

test('localDay uses the local calendar date', () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});

const mission = (id: string, targets: string[], bonus = false) => ({ id, bonus, targets: { '6': targets, '8': targets } });

test('episode: missions go in order and then come round again', () => {
  const u = { missions: [mission('M1', []), mission('M2', [])] } as unknown as Unit;
  assert.equal(nextMission(u, [], 8).id, 'M1');
  assert.equal(nextMission(u, ['M1'], 8).id, 'M2');
  assert.equal(nextMission(u, ['M1', 'M2'], 8).id, 'M1');
  assert.equal(nextMission(u, ['M1', 'M2', 'M1'], 8).id, 'M2');
});

test('episode: the mission uses the phrases just practised (FR-17)', () => {
  const u = { missions: [mission('M1', ['P01']), mission('M2', ['P02']), mission('M3', ['P07', 'P05'])] } as unknown as Unit;
  assert.equal(nextMission(u, [], 8, ['P07']).id, 'M3');
  assert.equal(nextMission(u, ['M3'], 8, ['P07']).id, 'M1', 'no overlap left, so the unit order decides');
});

test('episode: bonus missions wait until the others have been given', () => {
  const u = { missions: [mission('M1', ['P01']), mission('M7', ['P01', 'P10'], true)] } as unknown as Unit;
  assert.equal(nextMission(u, [], 8, ['P01', 'P10']).id, 'M1');
  assert.equal(nextMission(u, ['M1'], 8, ['P01', 'P10']).id, 'M7');
});

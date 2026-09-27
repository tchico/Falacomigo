/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clipKey, missionClipFile, phraseClipFile, pickSource } from './clips';

const child = { id: 'child1', name: 'Ana', ageWord: 'oito', sibling: 'irmão' };

test('clips: per-child clips are filled in for the child', () => {
  assert.equal(phraseClipFile({ id: 'P03', audio: { dad: 'P03-{childId}.m4a' } }, child), 'P03-child1.m4a');
  assert.equal(phraseClipFile({ id: 'P01' }, child), 'P01.m4a');
  const say = { '6': 'Olá, pai! Chamo-me {name}.', '8': 'Bom dia, pai!' };
  assert.equal(missionClipFile({ id: 'M2', say }, { id: 'child1', age: 8 }), 'M2-8.m4a');
  assert.equal(missionClipFile({ id: 'M2', say }, { id: 'child2', age: 6 }), 'M2-child2.m4a');
});

test("clips: Dad's in-app recording wins, then the bundled clip, then text-to-speech", () => {
  const key = clipKey('unit-01', 'P01.m4a');
  const none = { recorded: () => null, bundled: {} };
  assert.deepEqual(pickSource(key, 'Olá!', none), { kind: 'tts', text: 'Olá!' });
  assert.deepEqual(pickSource(key, 'Olá!', { ...none, bundled: { [key]: 7 } }), { kind: 'bundled', asset: 7 });
  assert.deepEqual(pickSource(key, 'Olá!', { recorded: () => 'file:///r.m4a', bundled: { [key]: 7 } }), { kind: 'recording', uri: 'file:///r.m4a' });
});

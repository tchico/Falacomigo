/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memoryDb } from '../store/testDb';
import { Store } from '../store/store';
import { defaultSettings, readSettings, settingsKey } from './childSettings';

test('child settings: subtitles follow the age band until Dad changes them, and listen back starts off (FR-29)', () => {
  assert.deepEqual(defaultSettings(8, 12), { subtitles: true, sessionMinutes: 12, listenBack: false });
  assert.deepEqual(defaultSettings(6, 12), { subtitles: false, sessionMinutes: 12, listenBack: false });
});

test('child settings: saved values win, and anything missing or broken falls back (FR-29)', () => {
  assert.deepEqual(readSettings(JSON.stringify({ subtitles: true, sessionMinutes: 15 }), 6, 12), { subtitles: true, sessionMinutes: 15, listenBack: false });
  assert.deepEqual(readSettings('{nope', 8, 12), defaultSettings(8, 12));
  assert.equal(readSettings(JSON.stringify({ sessionMinutes: 600 }), 8, 12).sessionMinutes, 12);
});

test('child settings: each child keeps their own (FR-29)', async () => {
  const store = new Store(memoryDb());
  await store.init();
  await store.setSetting(settingsKey('child1'), JSON.stringify({ listenBack: true }));
  assert.equal(readSettings(await store.getSetting(settingsKey('child1')), 8, 12).listenBack, true);
  assert.equal(readSettings(await store.getSetting(settingsKey('child2')), 6, 12).listenBack, false);
});

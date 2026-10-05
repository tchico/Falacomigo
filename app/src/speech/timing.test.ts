/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTiming, KEEP, parseTimings, summarize, withTimingLog, type SpeechTiming } from './timing';
import type { RecognitionResult, SpeechRecognizer } from './types';

const t = (ms: number, offline = false): SpeechTiming => ({ at: 0, ms, offline });

test('timing: 9 in 10 within 2 seconds meets NFR-01', () => {
  const s = summarize([...Array(9)].map(() => t(1200)).concat(t(2600)));
  assert.equal(s.turns, 10);
  assert.equal(s.inTime, 9);
  assert.equal(s.meetsTarget, true);
  assert.equal(s.medianMs, 1200);
  assert.equal(s.p90Ms, 1200);
  assert.equal(s.slowestMs, 2600);
});

test('timing: an offline fallback never counts as in time', () => {
  const s = summarize([...Array(8)].map(() => t(900)).concat(t(1500, true), t(1500, true)));
  assert.equal(s.inTime, 8);
  assert.equal(s.offline, 2);
  assert.equal(s.meetsTarget, false);
});

test('timing: too few turns to tell yet', () => {
  assert.equal(summarize([t(500), t(700)]).meetsTarget, null);
  assert.equal(summarize([]).turns, 0);
});

test('timing: the log keeps the latest turns and survives bad data', () => {
  let list: SpeechTiming[] = [];
  for (let i = 0; i < KEEP + 5; i++) list = addTiming(list, t(i));
  assert.equal(list.length, KEEP);
  assert.equal(list[0].ms, 5);
  assert.deepEqual(parseTimings(JSON.stringify(list)), list);
  assert.deepEqual(parseTimings('not json'), []);
  assert.deepEqual(parseTimings(JSON.stringify([{ at: 1 }, t(3)])), [t(3)]);
});

test('timing: the wrapped recogniser logs each answer it waited for', async () => {
  const results: RecognitionResult[] = [{ transcript: 'ola', voicedMs: 900, waitMs: 1300 }, { transcript: '', voicedMs: 100 }, { transcript: '', voicedMs: 1200, offline: true, waitMs: 5000 }];
  const inner: SpeechRecognizer = {
    name: 'fake',
    listen: () => {
      const result = Promise.resolve(results.shift()!);
      return { result, release: () => {}, ended: Promise.resolve() };
    },
  };
  const logged: SpeechTiming[] = [];
  const r = withTimingLog(inner, (x) => logged.push(x), () => 42);
  for (let i = 0; i < 3; i++) await r.listen({ locale: 'pt-PT', expectedText: 'Olá', maxDurationMs: 6000 }).result;
  await new Promise((done) => setTimeout(done, 0));
  assert.deepEqual(logged, [{ at: 42, ms: 1300, offline: false }, { at: 42, ms: 5000, offline: true }]);
});

/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from './normalize';
import { matchAttempt, similarity } from './match';
import { applyAttempt, applyOfflineAttempt, ladderOutcome, newTurn, parentOverride } from './turn';
import { dueForReview, newProgress, record, startRungFor } from './ladder';
import { coinsForStars } from './rewards';
import { fillEn } from './template';

test('normalize strips accents, punctuation and turns digits into words', () => {
  assert.equal(normalize('Olá, Gui!'), 'ola gui');
  assert.equal(normalize('Chamo-me Ana.'), 'chamo me ana');
  assert.equal(normalize('Tenho 8 anos'), 'tenho oito anos');
  assert.equal(normalize('  Até   amanhã… '), 'ate amanha');
});

test('similarity is 1 for equal strings and lower for different ones', () => {
  assert.equal(similarity('ola', 'ola'), 1);
  assert.ok(similarity('obrigado', 'obrigada') > 0.8);
  assert.ok(similarity('ola', 'adeus') < 0.3);
});

const water = { accept: ['quero agua', 'eu quero agua', 'quero a agua'], keywords: ['quero', 'agua'] };

test('an exact or close answer is "got it"', () => {
  assert.equal(matchAttempt('Quero água', water, 8), 'got-it');
  assert.equal(matchAttempt('eu quero água por favor', water, 8), 'got-it');
  assert.equal(matchAttempt('kero agua', water, 6), 'got-it');
});

test('a partial answer is "nearly"', () => {
  assert.equal(matchAttempt('água', water, 8), 'nearly');
});

test('silence or something unrelated is "not heard"', () => {
  assert.equal(matchAttempt('', water, 8), 'not-heard');
  assert.equal(matchAttempt('banana', water, 8), 'not-heard');
});

test('the younger child gets a looser match', () => {
  const t = { accept: ['chamo me ana'], keywords: ['chamo', 'ana'] };
  assert.equal(matchAttempt('chama ana', t, 6), 'got-it');
  assert.equal(matchAttempt('chama ana', t, 8), 'nearly');
});

test('numbers must be said exactly: a different age is "nearly", not "got it"', () => {
  const age = { accept: ['tenho oito anos', 'eu tenho oito anos', 'oito anos', 'tenho oito'], keywords: ['tenho', 'anos', 'oito'] };
  for (const band of [6, 8] as const) {
    assert.equal(matchAttempt('tenho 8 anos', age, band), 'got-it');
    assert.equal(matchAttempt('Eu tenho oito anos, e tu?', age, band), 'got-it');
    assert.equal(matchAttempt('tenho 150 anos', age, band), 'nearly');
    assert.equal(matchAttempt('tenho cento e cinquenta anos', age, band), 'nearly');
    assert.equal(matchAttempt('tenho nove anos', age, band), 'nearly');
  }
  // "um"/"uma" are mostly articles, so they don't count as numbers.
  const cake = { accept: ['quero um bolo'], keywords: ['bolo'] };
  assert.equal(matchAttempt('quero o bolo', cake, 8), 'got-it');
});

test('turn: model plays after two misses, third attempt with speech is accepted', () => {
  let t = newTurn();
  t = applyAttempt(t, { result: 'not-heard', durationMs: 1200 });
  assert.equal(t.playModel, false);
  t = applyAttempt(t, { result: 'not-heard', durationMs: 1200 });
  assert.equal(t.playModel, true);
  assert.equal(t.done, false);
  t = applyAttempt(t, { result: 'not-heard', durationMs: 1200 });
  assert.equal(t.done, true);
  assert.equal(t.outcome, 'accepted-attempt');
});

test('turn: a silent third attempt is not accepted', () => {
  let t = newTurn();
  for (let i = 0; i < 3; i++) t = applyAttempt(t, { result: 'not-heard', durationMs: 200 });
  assert.equal(t.done, false);
});

test('turn: parent override ends the turn', () => {
  const t = parentOverride(newTurn());
  assert.equal(t.done, true);
  assert.equal(t.outcome, 'parent-override');
});

test('ladder: two successes on different days move a phrase up a rung', () => {
  let p = newProgress('P01', 2);
  p = record(p, 'success', '2026-10-01');
  p = record(p, 'success', '2026-10-01');
  assert.equal(p.rung, 2, 'same day does not count twice');
  p = record(p, 'success', '2026-10-03');
  assert.equal(p.rung, 3);
});

test('ladder: two failures in a row move a phrase down a rung', () => {
  let p = newProgress('P01', 3);
  p = record(p, 'failure', '2026-10-01');
  assert.equal(p.rung, 3);
  p = record(p, 'failure', '2026-10-01');
  assert.equal(p.rung, 2);
});

test('ladder: review intervals grow 1, 2, 4 days and reset after a failure', () => {
  let p = newProgress('P01', 2);
  p = record(p, 'success', '2026-10-01');
  assert.equal(p.nextReview, '2026-10-02');
  p = record(p, 'success', '2026-10-02');
  assert.equal(p.nextReview, '2026-10-04');
  p = record(p, 'success', '2026-10-04');
  assert.equal(p.nextReview, '2026-10-08');
  p = record(p, 'failure', '2026-10-08');
  assert.equal(p.nextReview, '2026-10-09');
});

test('ladder: a phrase never goes below rung 1 or above rung 5', () => {
  let p = newProgress('P01', 1);
  p = record(record(p, 'failure', '2026-10-01'), 'failure', '2026-10-01');
  assert.equal(p.rung, 1);
  let q = newProgress('P02', 5);
  q = record(record(q, 'success', '2026-10-01'), 'success', '2026-10-02');
  assert.equal(q.rung, 5);
});

test('dueForReview returns up to 5 phrases, most overdue first', () => {
  const ps = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ ...newProgress(id, 2), nextReview: `2026-10-0${i + 1}` }));
  const due = dueForReview(ps, '2026-10-09');
  assert.deepEqual(due.map((p) => p.phraseId), ['a', 'b', 'c', 'd', 'e']);
});

test('ladder: the 6-year-old starts a phrase one rung lower, never below 1', () => {
  assert.equal(startRungFor(3, 8), 3);
  assert.equal(startRungFor(3, 6), 2);
  assert.equal(startRungFor(1, 6), 1);
});

test('turn outcomes map onto the ladder', () => {
  assert.equal(ladderOutcome('got-it'), 'success');
  assert.equal(ladderOutcome('parent-override'), 'success');
  assert.equal(ladderOutcome('nearly'), 'nearly');
  assert.equal(ladderOutcome('accepted-attempt'), 'failure');
});

test('coins: stars pay 20 each, clamped to 0–3 stars', () => {
  assert.equal(coinsForStars(2), 40);
  assert.equal(coinsForStars(5), 60);
  assert.equal(coinsForStars(-1), 0);
});

test('turn: offline, a second of voice counts and a short sound does not (NFR-02)', () => {
  let t = applyOfflineAttempt(newTurn(), 400);
  assert.equal(t.done, false);
  t = applyOfflineAttempt(t, 1100);
  assert.equal(t.done, true);
  assert.equal(t.outcome, 'offline-voice');
  assert.equal(ladderOutcome('offline-voice'), 'nearly');
});

test('template: English lines get the age in digits', () => {
  const vars = { id: 'c', name: 'Ana', ageWord: 'oito', sibling: 'irmão', age: 8 };
  assert.equal(fillEn("I'm {age} years old.", vars), "I'm 8 years old.");
});

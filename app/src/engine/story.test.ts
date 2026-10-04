/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyGame } from '../content';
import { normalize } from './normalize';
import { judgeSentence, sentence, tellerFor } from './story';

const { stories } = storyGame;

test('story: stories have unique ids, normalised keywords, and options that each have their own words (FR-25)', () => {
  assert.equal(new Set(stories.map((s) => s.id)).size, stories.length);
  for (const s of stories) for (const step of s.steps) {
    const all = step.options.flatMap((o) => o.keywords);
    for (const k of all) assert.equal(normalize(k), k, `${s.id}: "${k}"`);
    assert.equal(new Set(all).size, all.length, `${s.id}: "${step.ask}" shares a keyword between options`);
  }
});

test('story: saying a picture\'s sentence, or just its word, picks that picture at both ages (FR-25)', () => {
  for (const s of stories) for (const step of s.steps) for (const o of step.options) for (const age of [6, 8] as const) {
    for (const said of [o.text, o.keywords[0]]) {
      const told = judgeSentence(said, step, age);
      assert.equal(told.kind, 'option', `${s.id}: "${said}" for age ${age}`);
      if (told.kind === 'option') assert.equal(told.option.text, o.text, `${s.id}: "${said}" picked "${told.option.text}"`);
    }
  }
});

test('story: a sentence of their own counts, and only silence asks again (FR-25)', () => {
  const step = stories[0].steps[0];
  assert.deepEqual(judgeSentence('morava numa casa amarela', step, 6), { kind: 'own', text: 'Morava numa casa amarela.' });
  assert.equal(judgeSentence('hum', step, 8).kind, 'not-heard');
  assert.equal(judgeSentence('', step, 8).kind, 'not-heard');
  assert.equal(judgeSentence('num castel', step, 6).kind, 'option', 'a near miss on the word counts');
  assert.equal(judgeSentence('foram ao café comer um bolo', stories[0].steps[1], 6).kind, 'own', '"ao" isn\'t "pão"');
});

test('story: sentences are tidied, and turns alternate, the first teller swapping each story (FR-25)', () => {
  assert.equal(sentence('  era uma  vez '), 'Era uma vez.');
  assert.equal(sentence('Que medo!'), 'Que medo!');
  assert.deepEqual([0, 1, 2, 3].map((i) => tellerFor(i, 0)), [0, 1, 0, 1]);
  assert.deepEqual([0, 1, 2, 3].map((i) => tellerFor(i, 1)), [1, 0, 1, 0]);
});

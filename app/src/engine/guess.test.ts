/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessGame } from '../content';
import { normalize } from './normalize';
import { cardsFor, fillGuess, judgeClue, judgeGuess, newRound, OPTIONS } from './guess';

const { cards } = guessGame;

test('guess: cards have unique ids, normalised words, and no clue gives the name away (FR-24)', () => {
  assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
  for (const c of cards) {
    for (const w of [...c.accept, ...c.clueWords]) assert.equal(normalize(w), w, `${c.id}: "${w}"`);
    for (const clue of c.clues) assert.ok(!c.accept.some((a) => normalize(clue.text).split(' ').includes(a)), `${c.id}: "${clue.text}" says the name`);
  }
});

test('guess: every clue counts for both children, and the name itself is a "psst" (FR-24)', () => {
  for (const c of cards) for (const age of [6, 8] as const) {
    for (const clue of c.clues) assert.equal(judgeClue(clue.text, c, age), 'got-it', `${c.id}: "${clue.text}" for age ${age}`);
    assert.equal(judgeClue(c.say, c, age), 'named-it', c.id);
  }
  assert.notEqual(judgeClue('é frio e doce', cards.find((c) => c.id === 'gelado')!, 8), 'not-heard', 'a clue of their own');
  assert.equal(judgeClue('não sei', cards.find((c) => c.id === 'gelado')!, 8), 'not-heard');
});

test('guess: each picture is found by its guess or its name, among all the others (FR-24)', () => {
  for (const c of cards) for (const age of [6, 8] as const) {
    for (const said of [c.say, c.name, `acho que é ${c.name}`]) {
      const got = judgeGuess(said, cards, age);
      assert.equal(got.result, 'got-it', `${c.id}: "${said}" for age ${age}`);
      assert.equal(got.card.id, c.id, `${c.id}: "${said}" found ${got.card.id}`);
    }
  }
  assert.equal(judgeGuess('é um', cards, 8).result, 'not-heard', '"é um" alone names nothing');
  assert.equal(judgeGuess('é um bolo', cards, 6).card.id, 'bola', 'a near miss on the word counts');
});

test('guess: a round has the secret among different pictures, and secrets don\'t repeat (FR-24)', () => {
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const used: string[] = [];
  const pool = cardsFor(cards, 4);
  for (let i = 0; i < pool.length; i++) {
    const r = newRound(pool, used, random);
    assert.equal(r.options.length, OPTIONS);
    assert.equal(new Set(r.options.map((o) => o.id)).size, OPTIONS);
    assert.ok(r.options.includes(r.secret));
    assert.ok(!used.includes(r.secret.id));
    used.push(r.secret.id);
  }
});

test('guess: only words from units both children have reached, and always enough to choose from (FR-24)', () => {
  assert.ok(cardsFor(cards, 1).every((c) => c.unit === 1));
  assert.ok(cardsFor(cards, 1).length >= OPTIONS * 2);
  assert.ok(cardsFor(cards, 3).some((c) => c.unit === 3) && cardsFor(cards, 3).every((c) => c.unit <= 3));
});

test('guess: Gui\'s lines get the children\'s names', () => {
  assert.equal(fillGuess(guessGame.lines.guesserTurn, { guesser: 'Tomás' }), 'Tomás, o que é?');
  assert.equal(fillGuess('{a} {b}', { a: 1 }), '1 {b}');
});

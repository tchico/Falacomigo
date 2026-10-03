/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shop, sounds, units } from '../content';
import { helpFor, troubleWord, wordsOf } from './pronounce';

test('truque: every Portuguese word a child is asked to say has its pieces and English reading', () => {
  const said = new Set<string>();
  const add = (text: string) => wordsOf(text.replace(/\{[^}]*\}/g, ' ')).forEach((w) => said.add(w));
  for (const u of units) {
    for (const p of u.phrases) p.text.split(' / ').forEach(add);
    for (const s of u.scenes) for (const b of s.beats) if (b.model) add(b.model);
    for (const v of u.vocab ?? []) add(v.pt);
  }
  for (const item of shop.items) add(item.say);
  for (const ageWord of ['seis', 'sete', 'oito', 'nove', 'irmão', 'irmã']) said.add(ageWord);
  const missing = [...said].filter((w) => !sounds.words[w]);
  assert.deepEqual(missing, [], 'add these to content/sounds.json');
});

test('truque: each word\'s pieces spell it, line up with the English reading, and mark the stress', () => {
  for (const [word, { pt, en }] of Object.entries(sounds.words)) {
    assert.equal(pt.join(''), word.replace(/-/g, ''), word);
    assert.equal(pt.length, en.length, word);
    if (en.length > 1) assert.ok(en.some((piece) => /[A-Z]/.test(piece)), `${word}: which piece is stressed?`);
  }
  for (const t of sounds.tips) assert.doesNotThrow(() => new RegExp(t.match), t.match);
});

test('truque: the word is built up from its end, and gets the tip for its hardest sound', () => {
  const h = helpFor('obrigado', sounds)!;
  assert.deepEqual(h.en, ['oh', 'bree', 'GAH', 'doo']);
  assert.deepEqual(h.buildUp, ['do', 'gado', 'brigado', 'obrigado']);
  assert.equal(helpFor('cão', sounds)?.tip?.emoji, '🐄');
  assert.equal(helpFor('vermelho', sounds)?.tip?.emoji, '💰');
  assert.equal(helpFor('tenho', sounds)?.tip?.emoji, '🏜️');
  assert.equal(helpFor('anos', sounds)?.tip?.emoji, '🐍');
  assert.deepEqual(helpFor('pão', sounds)?.buildUp, ['pão']);
  assert.equal(helpFor('Ana', sounds), null, 'names have no help');
});

test('truque: the stuck word is the one missed on both tries', () => {
  assert.equal(troubleWord('Obrigado!', ['oh bri', 'o pi'], 8, sounds)?.word, 'obrigado');
  assert.equal(troubleWord('Tenho fome!', ['tenho mmm', 'tenho fu'], 8, sounds)?.word, 'fome');
  assert.equal(troubleWord('Chamo-me Ana.', ['xx ana', 'zz ana'], 8, sounds)?.word, 'chamo-me');
  assert.equal(troubleWord('Tenho fome!', ['', ''], 8, sounds), null, 'nothing said: just play the phrase');
  assert.equal(troubleWord('Chamo-me Ana.', ['chamo me rita', 'chamo me rita'], 8, sounds), null, 'a name is not a sound problem');
});

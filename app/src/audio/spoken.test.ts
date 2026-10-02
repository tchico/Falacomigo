/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { units } from '../content';
import { forSpeech } from './spoken';

test('spoken: "hmm" becomes "hum", which a Portuguese voice can say', () => {
  assert.equal(forSpeech('Eu tenho… hmm… cem anos!'), 'Eu tenho… hum… cem anos!');
  assert.equal(forSpeech('Hmm? Outra vez!'), 'Hum? Outra vez!');
  assert.equal(forSpeech('Hmmm! Prova!'), 'Hum! Prova!');
});

test('spoken: sound effects and giggles are left out, and the line still reads well', () => {
  assert.equal(forSpeech('Brrr… tenho frio! Como estás tu?'), 'Tenho frio! Como estás tu?');
  assert.equal(forSpeech('Isto? É polvo! Hehe, parece um monstro!'), 'Isto? É polvo! Parece um monstro!');
  assert.equal(forSpeech('Ahh, é a tua mãe!'), 'Ah, é a tua mãe!');
});

test('spoken: ordinary lines are untouched', () => {
  for (const t of ['Ai, ai, ai… onde estou?', 'Ufa, que calor!', 'Olá! Como te chamas?', 'Bom dia!']) assert.equal(forSpeech(t), t);
});

test('spoken: no content line is left with letters a voice would spell out', () => {
  for (const u of units) for (const s of u.scenes) for (const b of s.beats) {
    for (const t of [b.say.spoken ?? b.say.text, b.recast ?? '']) {
      assert.doesNotMatch(forSpeech(t), /\b(hm{2,}|b?r{3,}|z{3,})\b/i, `${u.id} ${s.id}/${b.id}: "${t}"`);
    }
  }
});

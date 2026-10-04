/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyFamilyEdits, familyPhrases, getUnit, guiLines, journey, units } from '../content';
import type { ChildProfile } from '../content/types';
import { customToPhrase, editedAccept, emptyEdits, familyUnit, nextCustomId, readEdits } from './family';
import { matchAttempt } from './match';
import { buildScene } from './scene';
import { fill } from './template';
import { buildWarmup } from './warmup';

const ana: ChildProfile = { id: 'child1', name: 'Ana', age: 8, ageWord: 'oito', sibling: 'irmão' };
const tomas: ChildProfile = { id: 'child2', name: 'Tomás', age: 6, ageWord: 'seis', sibling: 'irmã' };

test('family: saved edits are read safely, normalised, and a damaged entry changes nothing (FR-28)', () => {
  assert.deepEqual(readEdits(null), emptyEdits());
  assert.deepEqual(readEdits('{oops'), emptyEdits());
  const e = readEdits(JSON.stringify({ names: { granny: ' avó Rosa ', village: '' }, accept: { P13: { add: ['Tou com fome!'], remove: ['fome'] } }, phrases: [{ id: 'F01', text: 'Vamos à praia!', en: "Let's go!", accept: ['Bora à praia'] }, { id: 'F02', text: '  ' }] }));
  assert.equal(e.names.granny, 'avó Rosa');
  assert.equal(e.names.village, 'a aldeia', 'an empty name keeps the default');
  assert.deepEqual(e.accept.P13, { add: ['tou com fome'], remove: ['fome'] });
  assert.deepEqual(e.phrases.map((p) => [p.id, p.accept]), [['F01', ['bora a praia']]]);
});

test('family: added versions count, removed ones are gone, nothing twice', () => {
  assert.deepEqual(editedAccept(['tenho fome', 'fome'], { add: ['tou com fome', 'tenho fome'], remove: ['fome'] }), ['tenho fome', 'tou com fome']);
  assert.deepEqual(editedAccept(['a'], undefined), ['a']);
  assert.deepEqual(editedAccept(['tenho fome', 'fome'], { add: [], remove: ['tenho fome', 'fome'] }), ['tenho fome'], 'the phrase itself always counts');
  assert.equal(nextCustomId([{ id: 'F01', text: '', en: '', accept: [] }, { id: 'F03', text: '', en: '', accept: [] }]), 'F02');
});

test("family: Dad's phrase accepts its own words for both children, and gets a beat with Gui's line", () => {
  const p = customToPhrase({ id: 'F01', text: 'Vamos ao parque, pai!', en: "Let's go to the park, Dad!", accept: [] });
  assert.equal(p.startRung, 1);
  for (const age of [6, 8] as const) assert.equal(matchAttempt('Vamos ao parque, pai!', p, age), 'got-it');
  const unit = familyUnit({ ...emptyEdits(), phrases: [{ id: 'F01', text: 'Vamos ao parque, pai!', en: '', accept: [] }] }, guiLines.family);
  const [beat] = buildScene(unit, 'F', tomas);
  assert.equal(beat.line, guiLines.family.say);
  assert.equal(beat.modelText, 'Vamos ao parque, pai!');
});

test("family: edits are laid over the content, the warm-up brings in two new phrases, names fill in", () => {
  const edits = emptyEdits();
  edits.names = { granny: 'avó Rosa', grandad: 'avô Zé', village: 'Tomar' };
  edits.accept.P13 = { add: ['tou com fome'], remove: [] };
  edits.phrases = ['Bom dia, avó!', 'Vamos à praia!', 'Que fixe!'].map((text, i) => ({ id: `F0${i + 1}`, text, en: '', accept: [] }));
  try {
    applyFamilyEdits(edits);
    const p13 = units[1].phrases.find((p) => p.id === 'P13')!;
    assert.ok(p13.accept.includes('tou com fome'));
    assert.equal(journey.stops.find((s) => s.id === 'village')?.name, 'Tomar');
    assert.equal(fill('Liga à {granny}! {Granny}, olá!', ana), 'Liga à avó Rosa! Avó Rosa, olá!');
    assert.equal(getUnit('family').phrases.length, 3);

    const warm = buildWarmup([...units, familyPhrases()], {}, '2026-10-04', ana, 'Olá!', undefined, familyPhrases());
    assert.deepEqual(warm.slice(1).map((b) => b.phrase?.id), ['F01', 'F02']);
  } finally {
    applyFamilyEdits(emptyEdits());
  }
  assert.ok(!units[1].phrases.find((p) => p.id === 'P13')!.accept.includes('tou com fome'), 'back to the pack');
  assert.equal(journey.stops.find((s) => s.id === 'village')?.name, 'A aldeia');
});

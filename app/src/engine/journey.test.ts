/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guiLines, journey, units } from '../content';
import type { ChildProfile } from '../content/types';
import { buildAlbum, focusStop, hereIndex, postcardCount } from './album';
import { newProgress, type PhraseProgress } from './ladder';
import { isSleepy } from './session';
import { buildWarmup, WARMUP_SIZE } from './warmup';
import { findWord, saidInEnglish, targetFor, wordsUpTo } from './comoSeDiz';
import { matchAttempt } from './match';

const ana: ChildProfile = { id: 'c', name: 'Ana', age: 8, ageWord: 'oito', sibling: 'irmão' };
const rui: ChildProfile = { ...ana, name: 'Rui', age: 6, ageWord: 'seis' };
const due = (id: string, nextReview: string | null): PhraseProgress => ({ ...newProgress(id, 3), nextReview });
const byId = (ps: PhraseProgress[]) => Object.fromEntries(ps.map((p) => [p.phraseId, p]));

test('warm-up: nothing due means no warm-up (FR-15)', () => {
  assert.deepEqual(buildWarmup(units, {}, '2026-10-03', ana, 'Vamos aquecer!'), []);
  assert.deepEqual(buildWarmup(units, byId([due('P01', '2026-10-04')]), '2026-10-03', ana, 'Vamos aquecer!'), []);
});

test('warm-up: due phrases come back, most overdue first, asked the way their scene asked them (FR-15)', () => {
  const beats = buildWarmup(units, byId([due('P05', '2026-10-03'), due('P03', '2026-10-01'), due('P13', '2026-10-02')]), '2026-10-03', ana, 'Vamos aquecer!');
  assert.equal(beats[0].line, 'Vamos aquecer!');
  assert.equal(beats[0].phrase, null);
  assert.deepEqual(beats.slice(1).map((b) => b.phrase?.id), ['P03', 'P13', 'P05']);
  assert.equal(beats[1].line, 'Olá! Como te chamas?');
  assert.equal(beats[1].modelText, 'Chamo-me Ana.');
  assert.equal(beats[2].unitId, 'unit-02', 'a warm-up mixes units');
  assert.equal(new Set(beats.map((b) => b.id)).size, beats.length);
});

test('warm-up: at most 5 phrases, and only beats for the child\'s age (FR-15)', () => {
  const all = units.flatMap((u) => u.phrases.map((p) => due(p.id, '2026-10-01')));
  for (const child of [ana, rui]) {
    const beats = buildWarmup(units, byId(all), '2026-10-03', child, 'Vamos aquecer!');
    assert.equal(beats.length, WARMUP_SIZE + 1);
    for (const b of beats.slice(1)) assert.ok(b.target && b.answers.length, b.id);
  }
});

test('album: each finished scene is a postcard, and only a full stop opens the next (FR-21)', () => {
  const fresh = buildAlbum(units, journey.stops, []);
  assert.equal(fresh.length, journey.stops.length);
  assert.deepEqual(fresh.map((s) => s.state).slice(0, 3), ['current', 'locked', 'soon']);
  assert.deepEqual(postcardCount(fresh), { got: 0, total: units.reduce((n, u) => n + u.scenes.length, 0) });

  const some = buildAlbum(units, journey.stops, [{ unitId: 'unit-01', sceneId: 'S1.1' }, { unitId: 'unit-01', sceneId: 'S1.2' }]);
  assert.equal(some[0].state, 'current');
  assert.deepEqual(some[0].postcards.map((p) => p.got), [true, true, false]);

  const full = buildAlbum(units, journey.stops, units[0].scenes.map((s) => ({ unitId: 'unit-01', sceneId: s.id })));
  assert.deepEqual(full.map((s) => s.state).slice(0, 3), ['done', 'current', 'soon']);
  assert.equal(focusStop(full).stop.id, 'ferry');
});

test('album: every unit has its stop on the journey map', () => {
  for (const u of units) assert.ok(journey.stops.some((s) => s.id === u.stop.id), `${u.id} stop ${u.stop.id}`);
});

test('session: Gui gets sleepy once the session has run its time (FR-16)', () => {
  const start = 1_000_000;
  assert.equal(isSleepy(start, start + 5 * 60_000, guiLines.session.aimMinutes), false);
  assert.equal(isSleepy(start, start + guiLines.session.aimMinutes * 60_000, guiLines.session.aimMinutes), true);
  assert.ok(guiLines.session.aimMinutes >= 10 && guiLines.session.aimMinutes <= 15, 'aim for 10–15 minutes');
});

test('como se diz: the English word is found in what was heard, from the units reached so far (FR-11)', () => {
  const first = wordsUpTo(units, 'unit-01');
  const both = wordsUpTo(units, 'unit-02');
  assert.ok(first.length < both.length);
  assert.equal(findWord('Dog.', first)?.pt, 'o cão');
  assert.equal(findWord('the dog', first)?.pt, 'o cão');
  assert.equal(findWord('How do you say dog?', first)?.pt, 'o cão');
  assert.equal(findWord('6', first)?.pt, 'seis');
  assert.equal(findWord('Orange juice.', both)?.pt, 'o sumo de laranja');
  assert.equal(findWord('Ice cream', both)?.pt, 'o gelado');
  assert.equal(findWord('Granny!', first)?.pt, 'a avó');
  assert.equal(findWord('bread', first), null, 'not reached yet');
  assert.equal(findWord('elephant', both), null);
  assert.equal(findWord('', both), null);
});

test('como se diz: a reply that is just an English word from the list is spotted (FR-11)', () => {
  const words = wordsUpTo(units, 'unit-02');
  assert.equal(saidInEnglish('Water!', words)?.pt, 'a água');
  assert.equal(saidInEnglish('Quero água', words), null);
  assert.equal(saidInEnglish('sim', words), null);
});

test('como se diz: saying the word back counts with or without its article (FR-11)', () => {
  assert.deepEqual(targetFor({ pt: 'o cão', en: 'dog' }).accept, ['o cao', 'cao']);
  assert.deepEqual(targetFor({ pt: 'seis', en: 'six' }).accept, ['seis']);
  for (const w of wordsUpTo(units, 'unit-02')) {
    assert.equal(matchAttempt(w.pt, targetFor(w), 6), 'got-it', w.pt);
    assert.equal(matchAttempt(w.pt, targetFor(w), 8), 'got-it', w.pt);
  }
});

test('journey map: Gui is at the stop being played, and stays at the last one when everything is done', () => {
  assert.equal(hereIndex(buildAlbum(units, journey.stops, [])), 0);
  const unit1 = units[0].scenes.map((s) => ({ unitId: 'unit-01', sceneId: s.id }));
  assert.equal(hereIndex(buildAlbum(units, journey.stops, unit1)), 1);
  const all = units.flatMap((u) => u.scenes.map((s) => ({ unitId: u.id, sceneId: s.id })));
  assert.equal(hereIndex(buildAlbum(units, journey.stops, all)), units.length - 1);
});

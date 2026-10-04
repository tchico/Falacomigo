/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { units } from '../content';
import { pictureFor, whereFor } from './pictures';

test('pictures: content image names become stand-in pictures', () => {
  assert.deepEqual(pictureFor('food:bread-soup-fish'), ['🍞', '🍲', '🐟']);
  assert.deepEqual(pictureFor('photo:dad'), ['👨']);
  assert.deepEqual(pictureFor('unknown:thing'), []);
  assert.deepEqual(pictureFor(undefined), []);
});

test('pictures: "where is it?" pictures say what is where, and every one in the content can be drawn', () => {
  assert.deepEqual(whereFor('where:map-under-chair'), { thing: '🗺️', where: 'under', place: '🪑' });
  assert.equal(whereFor('where:map-beside-chair'), null);
  assert.equal(whereFor('food:bread'), null);
  for (const u of units) for (const s of u.scenes) for (const b of s.beats) {
    if (!b.image) continue;
    assert.ok(b.image.startsWith('where:') ? whereFor(b.image) : pictureFor(b.image).length, `${s.id}/${b.id}: ${b.image}`);
  }
});

/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pictureFor } from './pictures';

test('pictures: content image names become stand-in pictures', () => {
  assert.deepEqual(pictureFor('food:bread-soup-fish'), ['🍞', '🍲', '🐟']);
  assert.deepEqual(pictureFor('photo:dad'), ['👨']);
  assert.deepEqual(pictureFor('unknown:thing'), []);
  assert.deepEqual(pictureFor(undefined), []);
});

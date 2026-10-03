/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shop } from '../content';
import { coinsShort, wearFor } from './shop';

test('shop: the outfit becomes what Gui wears, ignoring unknown or mismatched items', () => {
  assert.deepEqual(wearFor({ head: 'crown', eyes: 'sunglasses' }, shop.items), { head: 'crown', eyes: 'sunglasses' });
  assert.deepEqual(wearFor({ head: 'no-such-item', neck: 'crown' }, shop.items), {});
});

test('shop: how many coins short', () => {
  const crown = shop.items.find((i) => i.id === 'crown')!;
  assert.equal(coinsShort(100, crown), 50);
  assert.equal(coinsShort(500, crown), 0);
});

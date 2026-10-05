/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { units } from '../content';
import { placeFor } from './placeFor';

test('scenery: settings in the content map to a place, its props and the time of day', () => {
  assert.deepEqual({ ...placeFor('ferry-kitchen-evening'), props: undefined }, { kind: 'ferry', evening: true, props: undefined });
  assert.equal(placeFor('kitchen-window-photo').kind, 'kitchen');
  assert.ok(placeFor('garden-trampoline').props.has('trampoline'));
  assert.equal(placeFor(undefined).kind, 'garden');
  assert.deepEqual({ ...placeFor('beach-evening'), props: undefined }, { kind: 'beach', evening: true, props: undefined });
  assert.equal(placeFor('porto-street-evening').kind, 'porto');
  assert.ok(placeFor('porto-river').props.has('river'));
  assert.equal(placeFor('coimbra-evening').kind, 'coimbra');
  assert.equal(placeFor('clinic').kind, 'clinic');
  assert.ok(placeFor('train-station').props.has('station'));
  assert.deepEqual({ ...placeFor('train-evening'), props: undefined }, { kind: 'train', evening: true, props: undefined });
  assert.equal(placeFor('village').kind, 'village');
  assert.equal(placeFor('village-kitchen-evening').kind, 'kitchen', 'the avós\' kitchen');
});

test('scenery: every scene in the content has a setting the app can draw', () => {
  for (const u of units) for (const s of u.scenes) {
    assert.ok(s.setting, `${u.id} ${s.id} has no setting`);
    assert.ok(['garden', 'kitchen', 'ferry', 'beach', 'porto', 'coimbra', 'clinic', 'train', 'village'].includes(placeFor(s.setting).kind));
  }
});

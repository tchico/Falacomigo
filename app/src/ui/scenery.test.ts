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
});

test('scenery: every scene in the content has a setting the app can draw', () => {
  for (const u of units) for (const s of u.scenes) {
    assert.ok(s.setting, `${u.id} ${s.id} has no setting`);
    assert.ok(['garden', 'kitchen', 'ferry', 'beach'].includes(placeFor(s.setting).kind));
  }
});

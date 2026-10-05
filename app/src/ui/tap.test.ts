/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// NFR-12: every tap shows something within 300 ms. Children's buttons go through Tap, which sinks on touch, so a
// plain Pressable on a child's screen is a button that might look ignored while its sound or picture loads.
test('tap: no screen a child sees uses a bare Pressable', () => {
  const dirs = ['screens', 'ui'].map((d) => join(__dirname, '..', d));
  const bare = dirs.flatMap((dir) =>
    readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && f !== 'Tap.tsx')
      .filter((f) => /<Pressable\b/.test(readFileSync(join(dir, f), 'utf8')))
      .map((f) => join(dir, f)),
  );
  assert.deepEqual(bare, [], 'use ui/Tap instead');
});

test('tap: the scene and the hold-to-talk hook show thinking as soon as listening ends', () => {
  for (const f of ['screens/SceneScreen.tsx', 'speech/useHoldToTalk.ts']) {
    assert.match(readFileSync(join(__dirname, '..', f), 'utf8'), /\.ended\.then\(\(\) => setMic/, f);
  }
});

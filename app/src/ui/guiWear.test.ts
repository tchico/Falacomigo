/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shop } from '../content';
import { DRAWN_WEAR } from './guiWearIds';

test('gui wear: every shop item has a drawing on Gui, in its own slot', () => {
  for (const item of shop.items) {
    assert.equal(DRAWN_WEAR[item.id as keyof typeof DRAWN_WEAR], item.slot, `${item.id} needs a drawing in GuiWear.tsx`);
  }
});

/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseInline } from './inline';

test('inline: bold runs and references are split out', () => {
  assert.deepEqual(parseInline('**Say it back:** "Queres água?" Then wait [4][5].'), [
    { kind: 'text', text: 'Say it back:', bold: true },
    { kind: 'text', text: ' "Queres água?" Then wait ' },
    { kind: 'ref', id: 4 },
    { kind: 'ref', id: 5 },
    { kind: 'text', text: '.' },
  ]);
  assert.deepEqual(parseInline('plain'), [{ kind: 'text', text: 'plain' }]);
});

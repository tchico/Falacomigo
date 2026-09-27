/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Endpointer, encodeWav, resample, rms, toBase64 } from './pcm';

test('pcm: loudness is 0 for silence and higher for a louder signal', () => {
  assert.equal(rms(new Int16Array(160)), 0);
  assert.ok(rms(new Int16Array(160).fill(8000)) > rms(new Int16Array(160).fill(800)));
});

test('endpointer: keeps listening through silence before the child speaks', () => {
  const e = new Endpointer();
  for (let t = 0; t < 3000; t += 100) assert.equal(e.push(0, 100), false);
});

test('endpointer: stops after a pause once voice was heard, and counts the voice', () => {
  const e = new Endpointer();
  for (let t = 0; t < 1500; t += 100) assert.equal(e.push(0.1, 100), false);
  let stopped = false;
  for (let t = 0; t < 1200 && !stopped; t += 100) stopped = e.push(0, 100);
  assert.equal(stopped, true);
  assert.equal(e.voicedMs, 1500);
});

test('endpointer: stops at 6 seconds whatever happens (FR-06)', () => {
  const e = new Endpointer();
  let stopped = false;
  let t = 0;
  while (!stopped) { stopped = e.push(0.1, 100); t += 100; }
  assert.equal(t, 6000);
});

test('wav: header describes 16 kHz mono 16-bit PCM', () => {
  const wav = encodeWav([new Int16Array([1, -1]), new Int16Array([2])]);
  const view = new DataView(wav.buffer);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
  assert.equal(view.getUint32(24, true), 16000);
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(40, true), 6);
  assert.equal(view.getInt16(46, true), -1);
  assert.equal(wav.length, 50);
});

test('base64 matches Node for every padding length', () => {
  for (const n of [0, 1, 2, 3, 4, 5, 100]) {
    const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37) % 256);
    assert.equal(toBase64(bytes), Buffer.from(bytes).toString('base64'));
  }
});

test('resample: 48 kHz down to 16 kHz keeps a third of the samples', () => {
  const src = Int16Array.from({ length: 480 }, (_, i) => i);
  const out = resample(src, 48000);
  assert.equal(out.length, 160);
  assert.equal(out[1], 3);
  assert.equal(resample(src, 16000), src);
});

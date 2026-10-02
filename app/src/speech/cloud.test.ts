/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CloudRecognizer, type MicSource } from './cloud';

const request = { locale: 'pt-PT' as const, expectedText: 'Olá!', maxDurationMs: 6000 };
const loud = () => new Int16Array(1600).fill(6000); // 100 ms of voice at 16 kHz
const quiet = () => new Int16Array(1600);

/** A microphone that plays a script of 100 ms chunks, then waits to be stopped. */
function fakeMic(script: Int16Array[]): MicSource & { stopped: boolean } {
  const mic = {
    stopped: false,
    async start(onChunk: (s: Int16Array, rate: number) => void) {
      setTimeout(() => { for (const c of script) onChunk(c, 16000); }, 0);
      return { stop: async () => { mic.stopped = true; } };
    },
  };
  return mic;
}

const okFetch = (transcript: string, seen: unknown[] = []) =>
  (async (_url: string, init: RequestInit) => {
    seen.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ transcript }), { status: 200 });
  }) as unknown as typeof fetch;

test('cloud: stops on a pause after speech and returns the transcript', async () => {
  const seen: { expected: string; audio: string }[] = [];
  const mic = fakeMic([...Array(10)].map(loud).concat([...Array(12)].map(quiet)));
  const r = new CloudRecognizer({ url: 'https://proxy', appKey: 'k' }, mic, okFetch('olá gui', seen));
  const result = await r.listen(request).result;
  assert.deepEqual(result, { transcript: 'olá gui', voicedMs: 1000 });
  assert.equal(mic.stopped, true);
  assert.equal(seen[0].expected, 'Olá!');
  assert.ok(seen[0].audio.startsWith('UklGR'), 'sends a base64 WAV');
});

test('cloud: letting go of the button stops listening', async () => {
  const mic = fakeMic([loud(), loud(), loud()]);
  const r = new CloudRecognizer({ url: 'https://proxy', appKey: 'k' }, mic, okFetch('ola'));
  const l = r.listen(request);
  setTimeout(() => l.release(), 20);
  assert.equal((await l.result).voicedMs, 300);
});

test('cloud: silence is not sent to the service', async () => {
  let calls = 0;
  const fetchFn = (async () => { calls++; return new Response('{}'); }) as unknown as typeof fetch;
  const r = new CloudRecognizer({ url: 'https://proxy', appKey: 'k' }, fakeMic([quiet(), quiet()]), fetchFn);
  const l = r.listen(request);
  setTimeout(() => l.release(), 20);
  assert.deepEqual(await l.result, { transcript: '', voicedMs: 0 });
  assert.equal(calls, 0);
});

test('cloud: no connection falls back with the length of the voice (NFR-02)', async () => {
  const fetchFn = (async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch;
  const r = new CloudRecognizer({ url: 'https://proxy', appKey: 'k' }, fakeMic([...Array(12)].map(loud).concat([...Array(12)].map(quiet))), fetchFn);
  assert.deepEqual(await r.listen(request).result, { transcript: '', voicedMs: 1200, offline: true });
});

test('cloud: a slow proxy counts as offline', async () => {
  const fetchFn = ((_u: string, init: RequestInit) =>
    new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
  const r = new CloudRecognizer({ url: 'https://proxy', appKey: 'k', timeoutMs: 30 }, fakeMic([...Array(5)].map(loud).concat([...Array(12)].map(quiet))), fetchFn);
  assert.equal((await r.listen(request).result).offline, true);
});

test('cloud: the default fetch works when called detached, as browsers require', async () => {
  const realFetch = globalThis.fetch;
  let thisArg: unknown = 'unset';
  globalThis.fetch = (function (this: unknown) {
    thisArg = this;
    return Promise.resolve(new Response(JSON.stringify({ transcript: 'ola' })));
  }) as unknown as typeof fetch;
  try {
    const r = new CloudRecognizer({ url: 'https://proxy', appKey: 'k' }, fakeMic([...Array(5)].map(loud).concat([...Array(12)].map(quiet))));
    assert.equal((await r.listen(request).result).transcript, 'ola');
    assert.notEqual(thisArg, r, 'fetch must not be called with the recogniser as this');
  } finally {
    globalThis.fetch = realFetch;
  }
});

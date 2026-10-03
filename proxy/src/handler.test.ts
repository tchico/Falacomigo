import { test } from 'node:test';
import assert from 'node:assert/strict';
import { azureRequest, checkReply, handle, parseAzure, type Env } from './handler';

const wavB64 = Buffer.from('RIFF....WAVEfmt ').toString('base64');

function kv() {
  const m = new Map<string, string>();
  return { store: m, get: async (k: string) => m.get(k) ?? null, put: async (k: string, v: string) => void m.set(k, v) };
}

const env = (over: Partial<Env> = {}): Env => ({ AZURE_SPEECH_KEY: 'azure', AZURE_SPEECH_REGION: 'westeurope', APP_KEY: 'secret', ...over });

const post = (body: unknown, key = 'secret', path = '/recognize') =>
  new Request(`https://proxy.example${path}`, { method: 'POST', headers: { 'X-App-Key': key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

const good = { locale: 'pt-PT', expected: 'Olá!', audio: wavB64 };

function azure(body: unknown, status = 200) {
  const calls: Request[] = [];
  const fetchFn = (async (req: Request) => {
    calls.push(req);
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, deps: { fetch: fetchFn, now: () => new Date('2026-10-01T10:00:00Z') } };
}

const success = { RecognitionStatus: 'Success', DisplayText: 'Olá.', NBest: [{ Display: 'Olá, Gui.', AccuracyScore: 90, CompletenessScore: 100, PronScore: 88 }] };

test('proxy: forwards the audio to Azure pt-PT and returns the transcript', async () => {
  const { calls, deps } = azure(success);
  const res = await handle(post(good), env(), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { transcript: 'Olá, Gui.', scores: { accuracy: 90, completeness: 100, pronunciation: 88 } });
  const req = calls[0];
  assert.match(req.url, /^https:\/\/westeurope\.stt\.speech\.microsoft\.com\/.*language=pt-PT/);
  assert.equal(req.headers.get('Ocp-Apim-Subscription-Key'), 'azure');
  assert.match(req.headers.get('Content-Type')!, /samplerate=16000/);
  const assessment = JSON.parse(Buffer.from(req.headers.get('Pronunciation-Assessment')!, 'base64').toString('utf8'));
  assert.equal(assessment.ReferenceText, 'Olá!');
});

test('proxy: rejects a wrong app key, other paths and other languages', async () => {
  const { calls, deps } = azure(success);
  assert.equal((await handle(post(good, 'nope'), env(), deps)).status, 401);
  assert.equal((await handle(post(good, 'secret', '/other'), env(), deps)).status, 404);
  assert.equal((await handle(post({ ...good, locale: 'pt-BR' }), env(), deps)).status, 400);
  assert.equal((await handle(post({ ...good, audio: 'x'.repeat(400_000) }), env(), deps)).status, 413);
  assert.equal(calls.length, 0);
});

test('proxy: nothing recognised gives an empty transcript', () => {
  assert.deepEqual(parseAzure({ RecognitionStatus: 'NoMatch' }), { transcript: '' });
  assert.deepEqual(parseAzure({ RecognitionStatus: 'InitialSilenceTimeout' }), { transcript: '' });
});

test('proxy: a speech service error is a 502, so the app falls back', async () => {
  const { deps } = azure({ error: 'x' }, 500);
  assert.equal((await handle(post(good), env(), deps)).status, 502);
});

test('proxy: caps recognitions per day (NFR-06)', async () => {
  const usage = kv();
  const { calls, deps } = azure(success);
  const e = env({ USAGE: usage, DAILY_LIMIT: '2' });
  assert.equal((await handle(post(good), e, deps)).status, 200);
  assert.equal((await handle(post(good), e, deps)).status, 200);
  assert.equal((await handle(post(good), e, deps)).status, 429);
  assert.equal(calls.length, 2);
  assert.equal(usage.store.get('usage:2026-10-01'), '2');
});

test('proxy: the reference text survives accents', () => {
  const req = azureRequest(env(), 'Até amanhã!', new Uint8Array([1]));
  const assessment = JSON.parse(Buffer.from(req.headers.get('Pronunciation-Assessment')!, 'base64').toString('utf8'));
  assert.equal(assessment.ReferenceText, 'Até amanhã!');
});

test('proxy: answers the browser preflight and allows cross-site calls, for the web build', async () => {
  const { deps } = azure(success);
  const pre = await handle(new Request('https://proxy.example/recognize', { method: 'OPTIONS' }), env(), deps);
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get('Access-Control-Allow-Origin'), '*');
  assert.match(pre.headers.get('Access-Control-Allow-Headers')!, /X-App-Key/);
  const res = await handle(post(good), env(), deps);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
});

// Gui's smart replies (/reply)

const ask = { question: 'Brrr… tenho frio! Como estás tu?', expected: 'Estou bem!', heard: 'Estou cansado', age: 8 };
const gemini = (out: unknown, finishReason = 'STOP') => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] }, finishReason }] });

test('reply: off unless a Gemini key is set, and the app key is still checked', async () => {
  const { calls, deps } = azure({});
  assert.equal((await handle(post(ask, 'secret', '/reply'), env(), deps)).status, 501);
  assert.equal((await handle(post(ask, 'nope', '/reply'), env({ GEMINI_API_KEY: 'g' }), deps)).status, 401);
  assert.equal(calls.length, 0);
});

test('reply: sends only the text to Gemini, with Gui\'s instructions and strict safety, and returns the checked reply', async () => {
  const { calls, deps } = azure(gemini({ understood: true, reply: 'Estás cansado? Eu também! Estou cansado.' }));
  const res = await handle(post(ask, 'secret', '/reply'), env({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-test' }), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { understood: true, reply: 'Estás cansado? Eu também! Estou cansado.' });
  const req = calls[0];
  assert.match(req.url, /models\/gemini-test:generateContent$/);
  assert.equal(req.headers.get('x-goog-api-key'), 'g');
  const sent = await req.json();
  assert.match(sent.systemInstruction.parts[0].text, /European Portuguese/);
  assert.deepEqual(JSON.parse(sent.contents[0].parts[0].text), ask);
  assert.ok(sent.safetySettings.every((s: { threshold: string }) => s.threshold === 'BLOCK_LOW_AND_ABOVE'));
});

test('reply: rejects bad input before calling the model', async () => {
  const { calls, deps } = azure({});
  const e = env({ GEMINI_API_KEY: 'g' });
  assert.equal((await handle(post({ ...ask, heard: '' }, 'secret', '/reply'), e, deps)).status, 400);
  assert.equal((await handle(post({ ...ask, heard: 'x'.repeat(300) }, 'secret', '/reply'), e, deps)).status, 400);
  assert.equal((await handle(post({ ...ask, age: 30 }, 'secret', '/reply'), e, deps)).status, 400);
  assert.equal(calls.length, 0);
});

test('reply: anything odd from the model comes back as not understood', () => {
  const none = { understood: false, reply: '' };
  assert.deepEqual(checkReply(gemini({ understood: false, reply: '' })), none);
  assert.deepEqual(checkReply(gemini({ understood: true, reply: 'Olá' }, 'SAFETY')), none);
  assert.deepEqual(checkReply({ candidates: [] }), none);
  assert.deepEqual(checkReply({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }), none);
  // Too long, a link or emoji, or Brazilian Portuguese.
  assert.deepEqual(checkReply(gemini({ understood: true, reply: 'muito '.repeat(20) })), none);
  assert.deepEqual(checkReply(gemini({ understood: true, reply: 'Vê em https://exemplo.pt' })), none);
  assert.deepEqual(checkReply(gemini({ understood: true, reply: 'Que bom! 😀' })), none);
  assert.deepEqual(checkReply(gemini({ understood: true, reply: 'E você, está bem?' })), none);
  assert.deepEqual(checkReply(gemini({ understood: true, reply: 'Que bom, {nome}! Eu também.' })), { understood: true, reply: 'Que bom, {nome}! Eu também.' });
});

test('reply: has its own daily cap', async () => {
  const usage = kv();
  const { deps } = azure(gemini({ understood: true, reply: 'Que bom!' }));
  const e = env({ GEMINI_API_KEY: 'g', USAGE: usage });
  usage.store.set('reply:2026-10-01', '300');
  assert.equal((await handle(post(ask, 'secret', '/reply'), e, deps)).status, 429);
  assert.equal(usage.store.get('usage:2026-10-01'), undefined);
});

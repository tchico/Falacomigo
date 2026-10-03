/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProxySmartReplies, replyUrl, withName, withoutName } from './smartReply';

const ask = { question: 'Como estás tu?', expected: 'Estou bem!', heard: 'Estou cansado, sou a Ana', age: 8 as const };

function proxy(body: unknown, status = 200, delayMs = 0) {
  const sent: { url: string; body: Record<string, unknown> }[] = [];
  const fetchFn = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    if (delayMs) await new Promise((r, reject) => {
      const t = setTimeout(r, delayMs);
      init.signal?.addEventListener('abort', () => (clearTimeout(t), reject(new Error('aborted'))));
    });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { sent, fetchFn };
}

test('smart reply: the name never leaves the tablet, and comes back in the reply', async () => {
  const { sent, fetchFn } = proxy({ understood: true, reply: 'Estás cansada, {nome}? Eu também!' });
  const r = await new ProxySmartReplies('https://p/reply', 'k', fetchFn).ask(ask, 'Ana');
  assert.equal(r, 'Estás cansada, Ana? Eu também!');
  assert.equal(sent[0].body.heard, 'Estou cansado, sou a {nome}');
  assert.ok(!JSON.stringify(sent[0].body).includes('Ana'));
});

test('smart reply: not understood, an error or a slow answer all give null, so the script takes over', async () => {
  assert.equal(await new ProxySmartReplies('u', 'k', proxy({ understood: false, reply: '' }).fetchFn).ask(ask, 'Ana'), null);
  assert.equal(await new ProxySmartReplies('u', 'k', proxy({}, 501).fetchFn).ask(ask, 'Ana'), null);
  assert.equal(await new ProxySmartReplies('u', 'k', proxy({ understood: true, reply: 'Olá' }, 200, 200).fetchFn, 20).ask(ask, 'Ana'), null);
});

test('smart reply: name swapping only touches the whole name', () => {
  assert.equal(withoutName('Ana, a Anabela e a ana', 'Ana'), '{nome}, a Anabela e a {nome}');
  assert.equal(withName('Olá, {nome}!', 'Tomás'), 'Olá, Tomás!');
  assert.equal(replyUrl('https://x.workers.dev/recognize'), 'https://x.workers.dev/reply');
});

// The speech proxy (design doc §5). It holds the speech service key so it never ships in the app, checks the app's
// key, caps daily use (NFR-06), and forwards one short WAV to Azure Speech's pt-PT recogniser, with the expected
// phrase as the pronunciation-assessment reference text (FR-07).
//
// Privacy (NFR-05): the audio is only held in memory for this one request. Nothing is logged or stored, and
// Azure's short-audio REST API doesn't keep the audio unless logging is turned on for a custom endpoint, which we don't use.

export interface Env {
  AZURE_SPEECH_KEY: string;
  /** e.g. "westeurope" */
  AZURE_SPEECH_REGION: string;
  /** Shared key the app sends in X-App-Key. */
  APP_KEY: string;
  /** Recognitions allowed per day across the family. Defaults to DEFAULT_DAILY_LIMIT. */
  DAILY_LIMIT?: string;
  /** Optional KV namespace for the daily counter. Without it there's no cap. */
  USAGE?: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> };
}

export const DEFAULT_DAILY_LIMIT = 400;
/** Six seconds of 16 kHz 16-bit mono is 192 KB, which is 256 KB in base64. Leave some room. */
export const MAX_AUDIO_BASE64 = 300_000;

export interface Deps {
  fetch: typeof fetch;
  now: () => Date;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function sameKey(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const toBase64Text = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));

export function azureRequest(env: Env, expected: string, wav: Uint8Array<ArrayBuffer>): Request {
  const url = `https://${env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=pt-PT&format=detailed&profanity=raw`;
  const assessment = { ReferenceText: expected, GradingSystem: 'HundredMark', Granularity: 'Word', Dimension: 'Comprehensive', EnableMiscue: true };
  return new Request(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
      'Pronunciation-Assessment': toBase64Text(JSON.stringify(assessment)),
    },
    body: wav,
  });
}

interface AzureResult {
  RecognitionStatus?: string;
  DisplayText?: string;
  NBest?: { Display?: string; AccuracyScore?: number; CompletenessScore?: number; PronScore?: number }[];
}

export function parseAzure(body: AzureResult): { transcript: string; scores?: { accuracy?: number; completeness?: number; pronunciation?: number } } {
  if (body.RecognitionStatus !== 'Success') return { transcript: '' };
  const best = body.NBest?.[0];
  return {
    transcript: best?.Display ?? body.DisplayText ?? '',
    scores: best ? { accuracy: best.AccuracyScore, completeness: best.CompletenessScore, pronunciation: best.PronScore } : undefined,
  };
}

async function underDailyLimit(env: Env, day: string): Promise<boolean> {
  if (!env.USAGE) return true;
  const key = `usage:${day}`;
  const used = Number((await env.USAGE.get(key)) ?? 0);
  if (used >= Number(env.DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT)) return false;
  await env.USAGE.put(key, String(used + 1), { expirationTtl: 3 * 24 * 3600 });
  return true;
}

export async function handle(request: Request, env: Env, deps: Deps): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (request.method !== 'POST' || path !== '/recognize') return json(404, { error: 'not found' });
  if (!sameKey(request.headers.get('X-App-Key') ?? '', env.APP_KEY)) return json(401, { error: 'unauthorised' });

  let body: { locale?: unknown; expected?: unknown; audio?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'bad json' });
  }
  const { locale, expected, audio } = body;
  if (locale !== 'pt-PT') return json(400, { error: 'only pt-PT' });
  if (typeof expected !== 'string' || expected.length > 200) return json(400, { error: 'bad expected text' });
  if (typeof audio !== 'string' || !audio.length || audio.length > MAX_AUDIO_BASE64) return json(413, { error: 'audio missing or too long' });

  let wav: Uint8Array<ArrayBuffer>;
  try {
    wav = base64ToBytes(audio);
  } catch {
    return json(400, { error: 'bad audio' });
  }

  if (!(await underDailyLimit(env, deps.now().toISOString().slice(0, 10)))) return json(429, { error: 'daily limit reached' });

  const res = await deps.fetch(azureRequest(env, expected, wav));
  if (!res.ok) return json(502, { error: `speech service ${res.status}` });
  return json(200, parseAzure((await res.json()) as AzureResult));
}

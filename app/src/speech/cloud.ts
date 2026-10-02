// The real recogniser (FR-06, FR-07, NFR-01, NFR-02). It listens to the microphone, stops after 6 seconds or a pause,
// and sends the audio as a 16 kHz WAV to the proxy, which asks a pt-PT speech service with the expected phrase as a hint.
// If the proxy can't be reached in time, it reports how long the child spoke so the game can fall back (NFR-02).
// The audio only lives in memory for this one request (NFR-05).

import { DEFAULT_ENDPOINTER, Endpointer, encodeWav, resample, rms, SAMPLE_RATE, toBase64 } from './pcm';
import type { Listening, RecognitionRequest, RecognitionResult, SpeechRecognizer } from './types';

/** Where the microphone's audio comes from. The app uses expo-audio (mic.ts); tests use a fake. */
export interface MicSource {
  start(onChunk: (samples: Int16Array, sampleRate: number) => void): Promise<{ stop(): Promise<void> }>;
}

export interface ProxyConfig {
  url: string;
  /** Shared key the proxy expects, so it isn't an open door to the speech service. */
  appKey: string;
  /** Give up on the proxy after this long and use the offline fallback. */
  timeoutMs?: number;
}

/** Less voice than this is a cough or a tap, not an attempt, so it isn't worth sending. */
const MIN_VOICE_TO_SEND_MS = 250;

export class CloudRecognizer implements SpeechRecognizer {
  readonly name = 'cloud';

  constructor(
    private readonly config: ProxyConfig,
    private readonly mic: MicSource,
    // Wrapped so fetch isn't called as a method of this object: browsers reject that ("Illegal invocation").
    private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init),
  ) {}

  listen(request: RecognitionRequest, onLevel?: (level: number) => void): Listening {
    const chunks: Int16Array[] = [];
    const endpointer = new Endpointer({ ...DEFAULT_ENDPOINTER, maxMs: request.maxDurationMs });
    let finish!: () => void;
    const ended = new Promise<void>((r) => (finish = r));

    const session = this.mic.start((raw, rate) => {
      const samples = resample(raw, rate, SAMPLE_RATE);
      chunks.push(samples);
      const level = rms(samples);
      onLevel?.(level);
      if (endpointer.push(level, (samples.length / SAMPLE_RATE) * 1000)) finish();
    });

    const result = (async (): Promise<RecognitionResult> => {
      const mic = await session;
      await ended;
      await mic.stop();
      const voicedMs = endpointer.voicedMs;
      if (voicedMs < MIN_VOICE_TO_SEND_MS) return { transcript: '', voicedMs };
      try {
        const transcript = await this.send(encodeWav(chunks), request);
        return { transcript, voicedMs };
      } catch (e) {
        console.warn('Speech service not reached, using the offline fallback', e);
        return { transcript: '', voicedMs, offline: true };
      }
    })();

    // If the mic never started, don't leave anyone waiting on the release.
    session.catch(() => finish());
    return { result, release: finish };
  }

  private async send(wav: Uint8Array, request: RecognitionRequest): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 5_000);
    try {
      const res = await this.fetchFn(this.config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-App-Key': this.config.appKey },
        body: JSON.stringify({ locale: request.locale, expected: request.expectedText, audio: toBase64(wav) }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      const body = (await res.json()) as { transcript?: unknown };
      return typeof body.transcript === 'string' ? body.transcript : '';
    } finally {
      clearTimeout(timer);
    }
  }
}

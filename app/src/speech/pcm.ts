// Pure helpers for the microphone (FR-06): loudness, when to stop listening, and packing the audio
// as a 16 kHz mono WAV for the speech service. No device APIs here, so it's all tested in Node.

export const SAMPLE_RATE = 16_000;
/** Recording stops after this long even if the child keeps talking (FR-06). */
export const MAX_LISTEN_MS = 6_000;

/** Loudness of a chunk of 16-bit samples, 0..1. */
export function rms(samples: Int16Array): number {
  if (!samples.length) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] / 32768;
    sum += s * s;
  }
  return Math.sqrt(sum / samples.length);
}

export interface EndpointerOptions {
  /** Loudness above which a chunk counts as voice. Kids' voices on a tablet mic sit well above this. */
  voiceLevel: number;
  /** Stop after this much quiet, once the child has said something. */
  silenceMs: number;
  maxMs: number;
}

export const DEFAULT_ENDPOINTER: EndpointerOptions = { voiceLevel: 0.02, silenceMs: 1_200, maxMs: MAX_LISTEN_MS };

/**
 * Decides when to stop listening: after the maximum time, or after a pause once some voice has been heard.
 * Also adds up how long voice was heard, which the offline fallback and the third-try rule use (FR-09, NFR-02).
 */
export class Endpointer {
  elapsedMs = 0;
  voicedMs = 0;
  private quietMs = 0;

  constructor(private readonly opts: EndpointerOptions = DEFAULT_ENDPOINTER) {}

  /** Feeds one chunk. Returns true when it's time to stop. */
  push(level: number, chunkMs: number): boolean {
    this.elapsedMs += chunkMs;
    if (level >= this.opts.voiceLevel) {
      this.voicedMs += chunkMs;
      this.quietMs = 0;
    } else {
      this.quietMs += chunkMs;
    }
    if (this.elapsedMs >= this.opts.maxMs) return true;
    return this.voicedMs > 0 && this.quietMs >= this.opts.silenceMs;
  }
}

/** Packs 16-bit mono chunks into a WAV file. */
export function encodeWav(chunks: Int16Array[], sampleRate = SAMPLE_RATE): Uint8Array {
  const samples = chunks.reduce((n, c) => n + c.length, 0);
  const dataBytes = samples * 2;
  const out = new Uint8Array(44 + dataBytes);
  const view = new DataView(out.buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) out[offset + i] = text.charCodeAt(i);
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  let offset = 44;
  for (const c of chunks) {
    for (let i = 0; i < c.length; i++, offset += 2) view.setInt16(offset, c[i], true);
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 without relying on btoa or Buffer, which differ between Hermes, the web and Node. */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += B64[n >> 18] + B64[(n >> 12) & 63] + '==';
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

/** Linear resampling, for devices that won't capture at 16 kHz. */
export function resample(samples: Int16Array, from: number, to: number = SAMPLE_RATE): Int16Array {
  if (from === to || !samples.length) return samples;
  const out = new Int16Array(Math.max(1, Math.round((samples.length * to) / from)));
  const step = from / to;
  for (let i = 0; i < out.length; i++) {
    const x = i * step;
    const j = Math.floor(x);
    const a = samples[Math.min(j, samples.length - 1)];
    const b = samples[Math.min(j + 1, samples.length - 1)];
    out[i] = Math.round(a + (b - a) * (x - j));
  }
  return out;
}

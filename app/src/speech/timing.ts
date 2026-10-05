// NFR-01: speech results come back within 2 seconds for 90% of turns on home Wi-Fi. The app keeps a short log of how
// long each answer took after the child stopped talking, so Dad can see in the parent zone whether his Wi-Fi and
// proxy meet it. Only times are kept: no words, no audio.

import type { Listening, RecognitionRequest, SpeechRecognizer } from './types';

/** Setting key for the log, a JSON list of timings, oldest first. */
export const TIMINGS_KEY = 'speech-timings';
/** How many turns the log keeps. */
export const KEEP = 200;
/** NFR-01's numbers. */
export const TARGET_MS = 2000;
export const TARGET_SHARE = 0.9;
/** Fewer turns than this and there isn't enough to say yet. */
export const ENOUGH = 10;

export interface SpeechTiming {
  /** When, in ms since 1970. */
  at: number;
  /** From the end of the child's turn to the answer, or to giving up on the speech service. */
  ms: number;
  /** The speech service wasn't reached in time, so the game fell back (NFR-02). */
  offline: boolean;
}

export function parseTimings(raw: string | null): SpeechTiming[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((t): t is SpeechTiming => typeof t?.at === 'number' && typeof t?.ms === 'number' && typeof t?.offline === 'boolean');
  } catch {
    return [];
  }
}

export const addTiming = (list: SpeechTiming[], t: SpeechTiming): SpeechTiming[] => [...list, t].slice(-KEEP);

export interface TimingSummary {
  turns: number;
  /** Turns whose answer came back within 2 seconds. A turn that fell back offline never does. */
  inTime: number;
  share: number;
  medianMs: number;
  /** 9 turns in 10 came back within this. */
  p90Ms: number;
  slowestMs: number;
  offline: number;
  /** null while there aren't enough turns to tell. */
  meetsTarget: boolean | null;
}

/** The value below which `q` of the sorted list falls (nearest rank). */
const quantile = (sorted: number[], q: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] : 0);

export function summarize(list: SpeechTiming[]): TimingSummary {
  const sorted = list.map((t) => t.ms).sort((a, b) => a - b);
  const inTime = list.filter((t) => !t.offline && t.ms <= TARGET_MS).length;
  const share = list.length ? inTime / list.length : 0;
  return {
    turns: list.length,
    inTime,
    share,
    medianMs: quantile(sorted, 0.5),
    p90Ms: quantile(sorted, 0.9),
    slowestMs: sorted.at(-1) ?? 0,
    offline: list.filter((t) => t.offline).length,
    meetsTarget: list.length < ENOUGH ? null : share >= TARGET_SHARE,
  };
}

/** The same recogniser, telling `log` how long each answer took. Turns too short to send aren't timed. */
export function withTimingLog(recognizer: SpeechRecognizer, log: (t: SpeechTiming) => void, now: () => number = Date.now): SpeechRecognizer {
  return {
    name: recognizer.name,
    listen(request: RecognitionRequest, onLevel?: (level: number) => void): Listening {
      const l = recognizer.listen(request, onLevel);
      l.result.then(
        (r) => {
          if (r.waitMs !== undefined) log({ at: now(), ms: r.waitMs, offline: !!r.offline });
        },
        () => {},
      );
      return l;
    },
  };
}

/** Where the log is kept: the store's settings. */
export interface SettingsStore {
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

let saving = Promise.resolve();

/** Adds a timing to the log. One at a time, so two quick turns don't overwrite each other. */
export function saveTiming(settings: SettingsStore, t: SpeechTiming): Promise<void> {
  saving = saving
    .then(async () => settings.setSetting(TIMINGS_KEY, JSON.stringify(addTiming(parseTimings(await settings.getSetting(TIMINGS_KEY)), t))))
    .catch((e) => console.warn('Could not save the speech timing', e));
  return saving;
}

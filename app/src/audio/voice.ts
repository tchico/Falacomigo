// Plays model phrases and Gui's lines (FR-05, NFR-03). Dad's voice when there's a recording of him,
// otherwise a pt-PT text-to-speech voice. Only one thing plays at a time.

import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { bundledClips } from '../content/audioClips';
import { pickSource, type ClipSource } from './clips';
import { recordingUri } from './recordings';
import { forSpeech } from './spoken';
import { duckMusic } from './music';

let ptVoice: string | undefined;
let ready: Promise<void> | null = null;
/** Ends the clip that's playing, so whoever is waiting on it carries on straight away. */
let finishCurrent: (() => void) | null = null;
/** How loud voices play, 0..1, from the child's settings (NFR-10). */
let voiceVolume = 1;

export function setVoiceVolume(v: number): void {
  voiceVolume = Math.max(0.1, Math.min(1, v));
}

/** Sets the audio session up for playing and recording, and finds a European Portuguese voice. */
export function initVoice(): Promise<void> {
  ready ??= (async () => {
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true, interruptionMode: 'duckOthers' }).catch(() => {});
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const pt = voices.filter((v) => /^pt[-_]PT$/i.test(v.language));
      ptVoice = (pt.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? pt[0])?.identifier;
    } catch {
      ptVoice = undefined;
    }
  })();
  return ready;
}

export const sourceFor = (key: string, text: string): ClipSource => pickSource(key, text, { recorded: recordingUri, bundled: bundledClips });

export async function stop(): Promise<void> {
  finishCurrent?.();
  await Speech.stop().catch(() => {});
}

/** Voices still talking. A stopped voice can report back after the next one has started, hence a count. */
let voices = 0;

/** Runs while a voice is talking, with the music dipped under it. */
async function talking(go: () => Promise<void>): Promise<void> {
  voices++;
  duckMusic(true);
  try {
    await go();
  } finally {
    voices--;
    duckMusic(voices > 0);
  }
}

function speak(text: string, pitch: number, rate = 0.9): Promise<void> {
  return talking(
    () =>
      new Promise((resolve) => {
        // The bubble keeps "Hmm…" and "Brrr…"; the voice gets something it can say (NFR-03).
        Speech.speak(forSpeech(text), {
          language: 'pt-PT',
          voice: ptVoice,
          rate,
          pitch,
          volume: voiceVolume,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: () => resolve(),
        });
      }),
  );
}

function playFile(src: string | number): Promise<void> {
  return talking(() => new Promise((resolve) => {
    const p = createAudioPlayer(src);
    p.volume = voiceVolume;
    let finished = false;
    // Never leave the game waiting on a clip that doesn't report back.
    const timer = setTimeout(done, 15_000);
    const sub = p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish || s.error) done();
    });
    function done() {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      sub.remove();
      p.pause();
      p.remove();
      if (finishCurrent === done) finishCurrent = null;
      resolve();
    }
    finishCurrent = done;
    p.play();
  }));
}

/** Plays a clip and resolves when it has finished (or was stopped). */
export async function play(source: ClipSource): Promise<void> {
  await initVoice();
  await stop();
  if (source.kind === 'tts') return speak(source.text, 1);
  return playFile(source.kind === 'recording' ? source.uri : source.asset);
}

/** Gui's lines: text-to-speech in a slightly higher, seagull-ish voice, so every instruction is heard (NFR-03). */
export async function sayAsGui(text: string): Promise<void> {
  await initVoice();
  await stop();
  return speak(text, 1.3);
}

/** Gui saying a word or part of one slowly, for the "Truque!" help and the 🐢 button. */
export async function saySlowly(text: string): Promise<void> {
  await initVoice();
  await stop();
  return speak(text, 1.3, 0.5);
}

/** A local character's line: a lower, steadier voice than Gui's, so the kids can tell them apart. */
export async function sayAs(speaker: string, text: string): Promise<void> {
  if (speaker === 'gui') return sayAsGui(text);
  await initVoice();
  await stop();
  return speak(text, 0.9);
}

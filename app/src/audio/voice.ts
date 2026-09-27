// Plays model phrases and Gui's lines (FR-05, NFR-03). Dad's voice when there's a recording of him,
// otherwise a pt-PT text-to-speech voice. Only one thing plays at a time.

import * as Speech from 'expo-speech';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { bundledClips } from '../content/audioClips';
import { pickSource, type ClipSource } from './clips';

let ptVoice: string | undefined;
let ready: Promise<void> | null = null;
/** Ends the clip that's playing, so whoever is waiting on it carries on straight away. */
let finishCurrent: (() => void) | null = null;

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

/** Dad's in-app recordings live in the app's documents folder, keyed like the bundled clips. */
export function recordingFile(key: string): File {
  return new File(Paths.document, 'recordings', ...key.split('/'));
}

const recordedUri = (key: string): string | null => {
  try {
    const f = recordingFile(key);
    return f.exists ? f.uri : null;
  } catch {
    return null;
  }
};

export const sourceFor = (key: string, text: string): ClipSource => pickSource(key, text, { recorded: recordedUri, bundled: bundledClips });

export async function stop(): Promise<void> {
  finishCurrent?.();
  await Speech.stop().catch(() => {});
}

function speak(text: string, pitch: number): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'pt-PT',
      voice: ptVoice,
      rate: 0.9,
      pitch,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: () => resolve(),
    });
  });
}

function playFile(src: string | number): Promise<void> {
  return new Promise((resolve) => {
    const p = createAudioPlayer(src);
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
  });
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

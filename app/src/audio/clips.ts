// Where each model clip comes from (FR-05): Dad's recording made in the app, then a clip shipped in
// content/audio, then a pt-PT text-to-speech voice. Pure logic, so it can be tested without a device.

import type { Phrase } from '../content/types';
import { fill, type TemplateVars } from '../engine/template';

export type ClipSource =
  | { kind: 'recording'; uri: string }
  | { kind: 'bundled'; asset: number }
  | { kind: 'tts'; text: string };

/** "unit-01/P03-child1.m4a": how a clip is keyed on disk and in the bundle. */
export const clipKey = (unitId: string, file: string) => `${unitId}/${file}`;

/** Dad's clip for a phrase, filled in for this child (P03, P05 and P07 are recorded per child). */
export function phraseClipFile(phrase: Pick<Phrase, 'id' | 'audio'>, child: TemplateVars): string {
  return fill(phrase.audio?.dad ?? `${phrase.id}.m4a`, child);
}

/** Dad's clip for a mission card, per age band because the 6- and 8-year-old say different things. */
export const missionClipFile = (missionId: string, age: number) => `${missionId}-${age}.m4a`;

export interface ClipLookup {
  /** URI of Dad's in-app recording for this key, or null. */
  recorded: (key: string) => string | null;
  bundled: Record<string, number>;
}

export function pickSource(key: string, text: string, lookup: ClipLookup): ClipSource {
  const uri = lookup.recorded(key);
  if (uri) return { kind: 'recording', uri };
  const asset = lookup.bundled[key];
  if (asset !== undefined) return { kind: 'bundled', asset };
  return { kind: 'tts', text };
}

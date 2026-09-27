// Where each model clip comes from (FR-05): Dad's recording made in the app, then a clip shipped in
// content/audio, then a pt-PT text-to-speech voice. Pure logic, so it can be tested without a device.

import type { ChildProfile, Mission, Phrase } from '../content/types';
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

const PERSONAL = /\{(name|age|sibling)\}/;

/** True when a line is filled in per child (their name, age or sibling), so Dad records it once per child. */
export const isPersonal = (text: string) => PERSONAL.test(text);

/**
 * Dad's clip for a mission card. The 6- and 8-year-old say different things, so it's per age band,
 * or per child when the line has their name in it ("M1-child1.m4a").
 */
export function missionClipFile(mission: Pick<Mission, 'id' | 'say'>, child: Pick<ChildProfile, 'id' | 'age'>): string {
  const say = mission.say[String(child.age) as '6' | '8'];
  return isPersonal(say) ? `${mission.id}-${child.id}.m4a` : `${mission.id}-${child.age}.m4a`;
}

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

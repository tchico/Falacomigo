// Builds a playable scene for one child: filters beats by age and fills in their name, age and sibling.

import type { AgeBand, Beat, ChildProfile, Phrase, Unit } from '../content/types';
import { fill } from './template';
import type { MatchTarget } from './match';

export interface PlayableBeat {
  id: string;
  speaker: string;
  line: string;
  lineEn?: string;
  /** null for story beats that just need a tap. */
  phrase: Phrase | null;
  /** The phrase as the child should say it, e.g. "Chamo-me Ana." */
  modelText: string | null;
  /** True when the beat has its own model line, so Dad's clip for the phrase doesn't fit it. */
  ownModel: boolean;
  target: MatchTarget | null;
  recast: string | null;
  cliffhanger: boolean;
}

const forAge = (beat: Beat, age: AgeBand) => !beat.ages || beat.ages.includes(age);

export function buildScene(unit: Unit, sceneId: string, child: ChildProfile): PlayableBeat[] {
  const scene = unit.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Unknown scene ${sceneId} in ${unit.id}`);
  const f = (t: string) => fill(t, child);

  return scene.beats.filter((b) => forAge(b, child.age)).map((b) => {
    const phrase = b.expect ? unit.phrases.find((p) => p.id === b.expect) ?? null : null;
    if (b.expect && !phrase) throw new Error(`Beat ${sceneId}/${b.id} expects unknown phrase ${b.expect}`);
    return {
      id: b.id,
      speaker: b.say.speaker,
      line: f(b.say.text),
      lineEn: b.say.en ? f(b.say.en) : undefined,
      phrase,
      modelText: phrase ? f(b.model ?? firstOption(phrase.text)) : null,
      ownModel: !!b.model,
      target: phrase
        ? { accept: (b.accept ?? phrase.accept).map(f), keywords: (b.keywords ?? phrase.keywords).map(f) }
        : null,
      recast: b.recast ? f(b.recast) : null,
      cliffhanger: !!b.cliffhanger,
    };
  });
}

/** "Bom dia! / Boa tarde!" → "Bom dia!" — the first option is used as the spoken model. */
export function firstOption(text: string): string {
  return text.split(' / ')[0].trim();
}

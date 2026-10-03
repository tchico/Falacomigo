// The warm-up before a scene (design doc §2, FR-15): Gui brings back up to 5 phrases that are due for review.
// Each phrase is asked the way it was first met, with the same line from its scene, so the child knows what to say.

import type { ChildProfile, Unit } from '../content/types';
import { dueForReview, type PhraseProgress } from './ladder';
import { buildScene, type PlayableBeat } from './scene';

export const WARMUP_SIZE = 5;

/** The beat that first asks for a phrase in its unit, for this child's age. */
function firstBeatFor(unit: Unit, phraseId: string, child: ChildProfile): PlayableBeat | null {
  for (const scene of unit.scenes) {
    const beat = buildScene(unit, scene.id, child).find((b) => b.phrase?.id === phraseId);
    if (beat) return beat;
  }
  return null;
}

/**
 * The warm-up beats for today: Gui's opening line, then one beat per phrase due for review, most overdue first.
 * Empty when nothing is due (a first session, or everything reviewed), so the episode goes straight to its scene.
 */
export function buildWarmup(units: Unit[], progress: Record<string, PhraseProgress>, day: string, child: ChildProfile, intro: string, introEn?: string): PlayableBeat[] {
  const beats: PlayableBeat[] = [];
  // Look further than 5 in case some due phrases have no beat for this child's age.
  for (const due of dueForReview(Object.values(progress), day, Number.MAX_SAFE_INTEGER)) {
    if (beats.length === WARMUP_SIZE) break;
    const unit = units.find((u) => u.phrases.some((p) => p.id === due.phraseId));
    const beat = unit && firstBeatFor(unit, due.phraseId, child);
    if (beat) beats.push({ ...beat, id: `warmup-${beat.id}-${due.phraseId}`, cliffhanger: false });
  }
  if (!beats.length) return [];
  const opening: PlayableBeat = {
    id: 'warmup-intro',
    unitId: beats[0].unitId,
    speaker: 'gui',
    line: intro,
    lineEn: introEn,
    phrase: null,
    modelText: null,
    ownModel: false,
    target: null,
    recast: null,
    answers: [],
    freeReply: false,
    cliffhanger: false,
  };
  return [opening, ...beats];
}

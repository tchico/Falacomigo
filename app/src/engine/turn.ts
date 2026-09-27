// One spoken turn in a scene (FR-09, FR-10, FR-12).
// After 2 failed attempts the model phrase plays, and the 3rd attempt is accepted if any speech is heard.

import type { MatchResult } from './match';
import type { Outcome } from './ladder';

export interface TurnState {
  attempts: number;
  /** True once the game should play the model phrase before the next try. */
  playModel: boolean;
  done: boolean;
  outcome: MatchResult | 'accepted-attempt' | 'offline-voice' | 'parent-override' | null;
}

export const newTurn = (): TurnState => ({ attempts: 0, playModel: false, done: false, outcome: null });

export interface Attempt {
  result: MatchResult;
  /** How long voice was heard, used for the "anything at all" rule. */
  durationMs: number;
}

export const MIN_SPEECH_MS = 1000;

export function applyAttempt(turn: TurnState, attempt: Attempt): TurnState {
  if (turn.done) return turn;
  const attempts = turn.attempts + 1;

  if (attempt.result === 'got-it' || attempt.result === 'nearly') {
    return { attempts, playModel: false, done: true, outcome: attempt.result };
  }
  // Third try: any real speech counts, so no child gets stuck.
  if (attempts >= 3 && attempt.durationMs >= MIN_SPEECH_MS) {
    return { attempts, playModel: false, done: true, outcome: 'accepted-attempt' };
  }
  return { attempts, playModel: attempts >= 2, done: false, outcome: 'not-heard' };
}

/**
 * With no connection to the speech service, any voice for a second or more counts (NFR-02).
 * Shorter than that, the child is asked again, and the parent override still works.
 */
export function applyOfflineAttempt(turn: TurnState, voicedMs: number): TurnState {
  if (turn.done) return turn;
  const attempts = turn.attempts + 1;
  if (voicedMs >= MIN_SPEECH_MS) return { attempts, playModel: false, done: true, outcome: 'offline-voice' };
  return { attempts, playModel: attempts >= 2, done: false, outcome: 'not-heard' };
}

/** Dad's hidden long-press: "I heard it". */
export function parentOverride(turn: TurnState): TurnState {
  return { ...turn, done: true, playModel: false, outcome: 'parent-override' };
}

/** Did this turn count as the child successfully saying the phrase, for the learning engine? */
export function countsAsSuccess(outcome: TurnState['outcome']): boolean {
  return outcome === 'got-it' || outcome === 'parent-override';
}

/**
 * How a finished turn counts on the support ladder. A near miss is not a failure. Needing the model and a third try
 * counts as a failure, so the phrase gets more support next time, but the child never sees it as one.
 */
export function ladderOutcome(outcome: TurnState['outcome']): Outcome {
  if (countsAsSuccess(outcome)) return 'success';
  // Unjudged offline speech neither climbs nor drops the ladder.
  if (outcome === 'nearly' || outcome === 'offline-voice') return 'nearly';
  return 'failure';
}

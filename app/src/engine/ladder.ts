// The support ladder and spaced review (design doc §3, FR-13 and FR-14).
// A phrase moves up one rung after 2 successes on different days, and down one after 2 failures in a row.
// Review intervals grow 1, 2, 4, 8, 16 days with each success and reset after a failure.

import type { AgeBand, Rung } from '../content/types';

export const REVIEW_INTERVALS_DAYS = [1, 2, 4, 8, 16] as const;

export interface PhraseProgress {
  phraseId: string;
  rung: Rung;
  successes: number;
  failures: number;
  /** Failures in a row since the last success. */
  failStreak: number;
  /** Distinct days (YYYY-MM-DD) with a success since the last rung change. */
  successDays: string[];
  reviewStep: number;
  lastSeen: string | null;
  nextReview: string | null;
}

const clampRung = (r: number): Rung => Math.min(5, Math.max(1, r)) as Rung;

export function newProgress(phraseId: string, startRung: number): PhraseProgress {
  return {
    phraseId,
    rung: clampRung(startRung),
    successes: 0,
    failures: 0,
    failStreak: 0,
    successDays: [],
    reviewStep: 0,
    lastSeen: null,
    nextReview: null,
  };
}

/**
 * Where a phrase starts for this child. Content gives the rung for the 8-year-old; the 6-year-old starts one lower
 * (design doc §4: rungs 1–2 for the 6-year-old, 2–3 for the 8-year-old).
 */
export function startRungFor(startRung: number, age: AgeBand): Rung {
  return clampRung(age === 6 ? startRung - 1 : startRung);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export type Outcome = 'success' | 'nearly' | 'failure';

/** Records one attempt on `day` (YYYY-MM-DD) and returns the updated progress. */
export function record(p: PhraseProgress, outcome: Outcome, day: string): PhraseProgress {
  const next: PhraseProgress = { ...p, successDays: [...p.successDays], lastSeen: day };

  if (outcome === 'success') {
    next.successes += 1;
    next.failStreak = 0;
    if (!next.successDays.includes(day)) next.successDays.push(day);
    next.nextReview = addDays(day, REVIEW_INTERVALS_DAYS[Math.min(next.reviewStep, REVIEW_INTERVALS_DAYS.length - 1)]);
    next.reviewStep += 1;
    if (next.successDays.length >= 2 && next.rung < 5) {
      next.rung = clampRung(next.rung + 1);
      next.successDays = [];
    }
    return next;
  }

  if (outcome === 'nearly') {
    // Not a failure, but not enough to climb. Review again soon.
    next.failStreak = 0;
    next.nextReview = addDays(day, 1);
    return next;
  }

  next.failures += 1;
  next.failStreak += 1;
  next.reviewStep = 0;
  next.nextReview = addDays(day, 1);
  if (next.failStreak >= 2 && next.rung > 1) {
    next.rung = clampRung(next.rung - 1);
    next.failStreak = 0;
    next.successDays = [];
  }
  return next;
}

/** Phrases due for review on `day`, most overdue first, at most `limit` (FR-15). */
export function dueForReview(all: PhraseProgress[], day: string, limit = 5): PhraseProgress[] {
  return all
    .filter((p) => p.nextReview !== null && p.nextReview <= day)
    .sort((a, b) => (a.nextReview! < b.nextReview! ? -1 : 1))
    .slice(0, limit);
}

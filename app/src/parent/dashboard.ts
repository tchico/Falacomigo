// What the parent Overview shows for each child (FR-27) and which guide card is this week's tip (FR-34).
// Plain functions over what the store already keeps, so they can be tested without a database.

import type { Unit } from '../content/types';
import { addDays, type PhraseProgress } from '../engine/ladder';
import type { MissionRow } from '../store/store';

export const RUNG_NAMES = ['Echo', 'Pick & say', 'Fill the gap', 'Prompted', 'Free'] as const;

export interface StrugglingPhrase {
  phraseId: string;
  text: string;
  en: string;
  rung: number;
  /** Failures in a row right now. */
  failStreak: number;
  failures: number;
  successes: number;
}

export interface ChildDashboard {
  /** How many phrases sit on each rung, 1 to 5. */
  perRung: number[];
  /** Spoken turns on each of the last `days` days, oldest first, including days with none. */
  days: { day: string; turns: number }[];
  missionsDone: number;
  missionsOpen: number;
  /** Average stars Dad gave, or null before any. */
  averageStars: number | null;
  /** Phrases worth a little help at home, hardest first. */
  struggling: StrugglingPhrase[];
}

/**
 * A phrase is a struggle when its last tries went wrong, or when it has gone wrong more often than right.
 * "Nearly" counts as neither, so a child who's close isn't flagged.
 */
const struggles = (p: PhraseProgress) => p.failStreak >= 1 || (p.failures >= 2 && p.failures > p.successes);

export function childDashboard(opts: {
  progress: Record<string, PhraseProgress>;
  units: Unit[];
  turnsPerDay: { day: string; turns: number }[];
  missions: MissionRow[];
  today: string;
  days?: number;
  maxStruggling?: number;
}): ChildDashboard {
  const { progress, units, turnsPerDay, missions, today, days = 14, maxStruggling = 5 } = opts;
  const perRung = [0, 0, 0, 0, 0];
  for (const p of Object.values(progress)) perRung[p.rung - 1] += 1;

  const byDay = new Map(turnsPerDay.map((d) => [d.day, d.turns]));
  const span = Array.from({ length: days }, (_, i) => addDays(today, i - days + 1)).map((day) => ({ day, turns: byDay.get(day) ?? 0 }));

  const done = missions.filter((m) => m.approvedAt !== null);
  const stars = done.map((m) => m.stars ?? 0);

  const phrases = new Map(units.flatMap((u) => u.phrases.map((p) => [p.id, p] as const)));
  const struggling = Object.values(progress)
    .filter((p) => phrases.has(p.phraseId) && struggles(p))
    .sort((a, b) => b.failures - b.successes - (a.failures - a.successes) || b.failStreak - a.failStreak)
    .slice(0, maxStruggling)
    .map((p) => {
      const phrase = phrases.get(p.phraseId)!;
      return { phraseId: p.phraseId, text: phrase.text.split(' / ')[0], en: phrase.en, rung: p.rung, failStreak: p.failStreak, failures: p.failures, successes: p.successes };
    });

  return {
    perRung,
    days: span,
    missionsDone: done.length,
    missionsOpen: missions.length - done.length,
    averageStars: stars.length ? Math.round((stars.reduce((a, b) => a + b, 0) / stars.length) * 10) / 10 : null,
    struggling,
  };
}

/** Monday 5 January 2026: week 0 of the tips. */
const FIRST_WEEK = '2026-01-05';

/** The guide card for this week's tip (FR-34): one card a week, in order, round and round. */
export function tipOfWeek(cardCount: number, today: string): number {
  const days = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${FIRST_WEEK}T00:00:00Z`)) / 86_400_000);
  const week = Math.floor(days / 7);
  return ((week % cardCount) + cardCount) % cardCount;
}

// The weekly plan from guide card 5, ticked off day by day, and the unprompted-Portuguese counter from card 8 (FR-37).
// Each week is one JSON setting keyed by its Monday, so past weeks stay to compare with.

import { addDays } from '../engine/ladder';

export interface PlanRow {
  label: string;
  time: string;
  /** How many days a week the plan suggests, or null when it doesn't say ("cartoons, 3–5 h"). */
  target: number | null;
  /** Rows the app can tick itself, from what it already knows. */
  auto?: 'sessions' | 'missions';
}

/** How often a row of card 5 suggests doing it: "2 × 12 min" is 2, "daily" 7, "4–5 times" 5, "once a week" 1. */
export function targetFor(label: string): number | null {
  if (/daily|every day/i.test(label)) return 7;
  const range = label.match(/(\d+)\s*[–-]\s*(\d+)\s*times/i);
  if (range) return Number(range[2]);
  const times = label.match(/(\d+)\s*(?:×|times)/i);
  if (times) return Number(times[1]);
  if (/once a week/i.test(label)) return 1;
  return null;
}

/** Card 5's table rows as plan rows. */
export function planRows(rows: string[][]): PlanRow[] {
  return rows.map(([label, time]) => ({
    label,
    time,
    target: targetFor(label),
    auto: /fala comigo/i.test(label) ? 'sessions' : /missions? to dad/i.test(label) ? 'missions' : undefined,
  }));
}

/** The Monday of the week `day` is in. */
export function weekOf(day: string): string {
  const weekday = (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -weekday);
}

/** The seven days of the week starting `monday`. */
export const daysOf = (monday: string): string[] => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

export const weekKey = (monday: string) => `week:${monday}`;

export interface WeekRecord {
  /** Days ticked for each plan row, by row number. */
  ticks: Record<number, string[]>;
  /** Times each child spoke Portuguese without being asked, by child id. */
  unprompted: Record<string, number>;
}

export const emptyWeek = (): WeekRecord => ({ ticks: {}, unprompted: {} });

export function parseWeek(raw: string | null): WeekRecord {
  if (!raw) return emptyWeek();
  try {
    const v = JSON.parse(raw) as Partial<WeekRecord>;
    return { ticks: v.ticks ?? {}, unprompted: v.unprompted ?? {} };
  } catch {
    return emptyWeek();
  }
}

export function toggleTick(rec: WeekRecord, row: number, day: string): WeekRecord {
  const days = rec.ticks[row] ?? [];
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
  return { ...rec, ticks: { ...rec.ticks, [row]: next } };
}

/** One more (or one fewer) time a child spoke Portuguese unprompted. Never below nothing. */
export function bump(rec: WeekRecord, childId: string, by: 1 | -1): WeekRecord {
  return { ...rec, unprompted: { ...rec.unprompted, [childId]: Math.max(0, (rec.unprompted[childId] ?? 0) + by) } };
}

/** The days a row counts as done: those Dad ticked, and those the app saw for itself. */
export function doneDays(rec: WeekRecord, row: number, auto: ReadonlySet<string> = new Set()): Set<string> {
  return new Set([...(rec.ticks[row] ?? []), ...auto]);
}

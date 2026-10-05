// NFR-11: fewer than 1 in 5 correct answers from each child is rejected. The speech check in the parent zone goes
// through the phrases of the units built so far with one child at a time. The child says each one, Dad confirms it
// was said right, and the game's own matching decides whether it would have been taken. Only the words the speech
// service heard are kept, never audio (NFR-05).
//
// A check can be saved as a report in content/speech-checks/. The content tests judge every report again with
// the current accepted answers, so a change that makes the game miss real children's answers fails the tests.

import type { AgeBand, ChildProfile, Unit } from '../content/types';
import { matchAnswer } from '../engine/match';
import { normalize } from '../engine/normalize';
import { buildScene, type BeatAnswer } from '../engine/scene';

/** NFR-11's aim: fewer than this share of correct answers missed. */
export const MISS_LIMIT = 0.2;
/** Fewer answers than this and there isn't enough to say yet. */
export const ENOUGH = 10;

export const checkKey = (childId: string) => `speech-check:${childId}`;

export interface CheckItem {
  /** unit/scene/beat. */
  key: string;
  unitId: string;
  /** The phrase as this child should say it. */
  say: string;
  en?: string;
  /** Phrase id, for Dad's recording of it when he made one. */
  phraseId: string;
  /** True when the beat has its own model line, so the phrase's clip doesn't fit. */
  ownModel: boolean;
  answers: BeatAnswer[];
}

/** Every spoken turn of the units for this child, each phrase once (the first scene that asks for it). */
export function checkItems(units: Unit[], child: ChildProfile): CheckItem[] {
  const seen = new Set<string>();
  const items: CheckItem[] = [];
  for (const unit of units) {
    for (const scene of unit.scenes) {
      for (const beat of buildScene(unit, scene.id, child)) {
        if (!beat.target || !beat.modelText || !beat.phrase) continue;
        const said = normalize(beat.modelText);
        if (seen.has(said)) continue;
        seen.add(said);
        items.push({
          key: `${unit.id}/${scene.id}/${beat.id}`,
          unitId: unit.id,
          say: beat.modelText,
          en: beat.phrase.en,
          phraseId: beat.phrase.id,
          ownModel: beat.ownModel,
          answers: beat.answers,
        });
      }
    }
  }
  return items;
}

/** Whether the game would take it: got it, a near miss (taken, with a recast), or missed. */
export type Verdict = 'got-it' | 'nearly' | 'missed';

export function judgeCheck(heard: string, item: Pick<CheckItem, 'answers'>, age: AgeBand): Verdict {
  const { result } = matchAnswer(heard, item.answers, age);
  return result === 'not-heard' ? 'missed' : result;
}

export interface CheckResult {
  key: string;
  /** What the child was asked to say. */
  say: string;
  /** What the speech service heard. */
  heard: string;
  verdict: Verdict;
  /** When, in ms since 1970. */
  at: number;
}

/** One child's check: the latest result for each item, by key. */
export type ChildCheck = Record<string, CheckResult>;

export function parseCheck(raw: string | null): ChildCheck {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return Object.fromEntries(
      Object.entries(v as Record<string, CheckResult>).filter(
        ([, r]) => typeof r?.key === 'string' && typeof r?.say === 'string' && typeof r?.heard === 'string' && ['got-it', 'nearly', 'missed'].includes(r?.verdict),
      ),
    );
  } catch {
    return {};
  }
}

export interface CheckSummary {
  said: number;
  gotIt: number;
  nearly: number;
  missed: number;
  missedShare: number;
  /** null while there aren't enough answers to tell. */
  meetsTarget: boolean | null;
}

export function checkSummary(results: CheckResult[]): CheckSummary {
  const count = (v: Verdict) => results.filter((r) => r.verdict === v).length;
  const missed = count('missed');
  const missedShare = results.length ? missed / results.length : 0;
  return {
    said: results.length,
    gotIt: count('got-it'),
    nearly: count('nearly'),
    missed,
    missedShare,
    meetsTarget: results.length < ENOUGH ? null : missedShare < MISS_LIMIT,
  };
}

/** A check saved for the content tests: who the child is (for the phrases with their name in) and what was heard. */
export interface CheckReport {
  child: { name: string; age: AgeBand; ageWord: string; sibling: string };
  date: string;
  results: { key: string; say: string; heard: string }[];
}

export function reportFor(child: ChildProfile, check: ChildCheck, date: string): CheckReport {
  return {
    child: { name: child.name, age: child.age, ageWord: child.ageWord, sibling: child.sibling },
    date,
    results: Object.values(check)
      .sort((a, b) => a.at - b.at)
      .map(({ key, say, heard }) => ({ key, say, heard })),
  };
}

/** The report as JSON, one result to a line, so it's short enough to copy from a tablet and reads well in a diff. */
export const reportJson = (r: CheckReport): string =>
  `{"child": ${JSON.stringify(r.child)}, "date": ${JSON.stringify(r.date)}, "results": [\n${r.results.map((x) => `  ${JSON.stringify(x)}`).join(',\n')}\n]}\n`;

/**
 * Judges a saved report again with today's content. Turns that no longer exist (a beat renamed or removed) are
 * left out and listed, so a stale report doesn't quietly pass.
 */
export function rejudge(report: CheckReport, units: Unit[]): { results: CheckResult[]; gone: string[] } {
  const child: ChildProfile = { id: 'report', ...report.child };
  const items = new Map<string, CheckItem>();
  for (const unit of units) {
    for (const scene of unit.scenes) {
      for (const beat of buildScene(unit, scene.id, child)) {
        if (beat.target) items.set(`${unit.id}/${scene.id}/${beat.id}`, { key: '', unitId: unit.id, say: '', phraseId: '', ownModel: false, answers: beat.answers });
      }
    }
  }
  const gone: string[] = [];
  const results: CheckResult[] = [];
  for (const r of report.results) {
    const item = items.get(r.key);
    if (!item) gone.push(r.key);
    else results.push({ ...r, verdict: judgeCheck(r.heard, item, child.age), at: 0 });
  }
  return { results, gone };
}

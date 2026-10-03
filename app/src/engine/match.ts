// Generous matching of what the child said against a target phrase (design doc §5, FR-07 and FR-08).
// We never judge accent. We only check whether the child made a real attempt at the phrase.

import type { AgeBand } from '../content/types';
import { normalize, tokens } from './normalize';

export type MatchResult = 'got-it' | 'nearly' | 'not-heard';

export interface MatchTarget {
  /** Accepted versions, with placeholders already filled in. */
  accept: string[];
  keywords: string[];
}

/**
 * How close each spoken word must be to the target word to count as the same word (allowing for a child's
 * pronunciation and for recogniser slips like "kero" for "quero"). Looser for the younger child.
 */
export const STRICTNESS: Record<AgeBand, number> = { 6: 0.6, 8: 0.7 };

/** Extra words (an "olá" first, a "por favor" after) are fine, up to this many beyond the phrase's own length. */
const EXTRA_WORDS = 2;

/** Similarity between two short strings, 0..1, based on edit distance over characters. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length);
}

// Number words (after normalize()). "um" and "uma" are left out because they are mostly "a"/"an".
const NUMBERS = new Set(
  'zero dois duas tres quatro cinco seis sete oito nove dez onze doze treze catorze quatorze quinze dezasseis dezassete dezoito dezanove vinte trinta quarenta cinquenta sessenta setenta oitenta noventa cem cento duzentos trezentos mil'.split(' '),
);
const isNumber = (word: string) => NUMBERS.has(word) || /^\d+$/.test(word);

/** Whether a spoken word is the target word. Numbers carry the meaning, so they must be exact. */
function sameWord(target: string, heard: string, age: AgeBand): boolean {
  if (target === heard) return true;
  if (isNumber(target) || isNumber(heard)) return false;
  return similarity(target, heard) >= STRICTNESS[age];
}

interface Alignment {
  /** Target words that were said (or close enough). */
  matched: number;
  /** Target words missing or said as a different word. */
  misses: string[];
  /** Spoken words that aren't part of the phrase. */
  extras: string[];
}

/**
 * Lines up the whole of what was said against the whole phrase, word by word and in order, and finds the
 * reading with the fewest wrong or missing words (then the fewest extra words).
 */
function align(target: string[], heard: string[], age: AgeBand): Alignment {
  const m = target.length;
  const n = heard.length;
  // best[i][j]: the best alignment of target[i..] with heard[j..].
  const best: Alignment[][] = Array.from({ length: m + 1 }, () => new Array<Alignment>(n + 1));
  const better = (a: Alignment, b: Alignment) =>
    a.misses.length !== b.misses.length ? a.misses.length < b.misses.length : a.extras.length <= b.extras.length;
  for (let i = m; i >= 0; i--) {
    for (let j = n; j >= 0; j--) {
      if (i === m) {
        best[i][j] = { matched: 0, misses: [], extras: heard.slice(j) };
        continue;
      }
      // The target word is missing...
      const next = best[i + 1][j];
      let pick: Alignment = { ...next, misses: [target[i], ...next.misses] };
      if (j < n) {
        // ...or the spoken word is extra...
        const skip = best[i][j + 1];
        const extra = { ...skip, extras: [heard[j], ...skip.extras] };
        if (better(extra, pick)) pick = extra;
        // ...or it is the target word (or a different word in its place).
        const on = best[i + 1][j + 1];
        const pair = sameWord(target[i], heard[j], age)
          ? { ...on, matched: on.matched + 1 }
          : { ...on, misses: [target[i], ...on.misses] };
        if (better(pair, pick)) pick = pair;
      }
      best[i][j] = pick;
    }
  }
  return best[0][0];
}

/**
 * "Got it" when the whole phrase was said: every word, in order, close enough to count. Extra words around it
 * are fine, but a different number never is. The six-year-old may also drop or slur one short word ("chama
 * Ana" for "Chamo-me Ana") in a phrase of three or more words.
 */
function saidWhole(a: Alignment, target: string[], age: AgeBand): boolean {
  if (a.extras.some(isNumber)) return false;
  if (a.extras.length > EXTRA_WORDS + target.length) return false;
  if (a.misses.length === 0) return true;
  return age === 6 && target.length >= 3 && a.misses.length === 1 && a.misses[0].length <= 3 && !isNumber(a.misses[0]);
}

function keywordHeard(transcriptWords: string[], keyword: string): boolean {
  const k = normalize(keyword);
  return transcriptWords.some((w) => w === k || (k.length >= 4 && !isNumber(k) && similarity(w, k) >= 0.75));
}

interface Judged {
  result: MatchResult;
  coverage: number;
  /** For "got it": the fewest words said beyond an accepted version. Fewer means a closer fit. */
  extras: number;
}

function judge(words: string[], target: MatchTarget, age: AgeBand): Judged {
  if (words.length === 0) return { result: 'not-heard', coverage: 0, extras: 0 };

  let coverage = 0;
  let whole: number | null = null;
  for (const variant of target.accept.map(normalize).filter(Boolean)) {
    const vWords = variant.split(' ');
    const a = align(vWords, words, age);
    // "Não" turns an answer around ("não estou bem"), so it must be there in both or in neither.
    const sameSense = words.includes('nao') === vWords.includes('nao');
    if (sameSense && saidWhole(a, vWords, age)) whole = Math.min(whole ?? Infinity, a.extras.length);
    coverage = Math.max(coverage, a.matched / vWords.length);
  }
  if (whole !== null) return { result: 'got-it', coverage: 1, extras: whole };

  // Part of it, or the key words: a near miss, so the character says it back the right way (a recast).
  const heard = target.keywords.filter((k) => keywordHeard(words, k)).length;
  if (heard > 0 || coverage >= 0.5) return { result: 'nearly', coverage, extras: 0 };

  return { result: 'not-heard', coverage, extras: 0 };
}

export function matchAttempt(transcript: string, target: MatchTarget, age: AgeBand): MatchResult {
  return judge(tokens(transcript), target, age).result;
}

/**
 * For a question with several real answers (FR-10): which one the child gave, and how well. Of the answers said
 * whole, the one that fits most closely wins: "tenho pouca sede" is the "pouca sede" answer, not "tenho sede" with an
 * extra word. Otherwise the result is the best of them, and the answer is the one closest to what was said (the
 * first on a tie), so the character's reply fits.
 */
export function matchAnswer<T extends { target: MatchTarget }>(transcript: string, answers: T[], age: AgeBand): { result: MatchResult; answer: T } {
  const words = tokens(transcript);
  const judged = answers.map((answer) => ({ answer, ...judge(words, answer.target, age) }));
  const rank = { 'got-it': 2, nearly: 1, 'not-heard': 0 } as const;
  const closer = (a: Judged, b: Judged) =>
    rank[b.result] !== rank[a.result] ? rank[b.result] > rank[a.result] : b.result === 'got-it' ? b.extras < a.extras : b.coverage > a.coverage;
  const best = judged.reduce((a, b) => (closer(a, b) ? b : a));
  return { result: best.result, answer: best.answer };
}

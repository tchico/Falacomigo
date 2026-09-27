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

/** How close a transcript must be to count as "got it". Looser for the younger child. */
export const STRICTNESS: Record<AgeBand, number> = { 6: 0.6, 8: 0.72 };

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

/** Best similarity of `variant` against any run of words in the transcript, so extra words around it don't hurt. */
function bestWindowSimilarity(transcriptWords: string[], variant: string): number {
  const vWords = variant.split(' ');
  let best = 0;
  for (let len = Math.max(1, vWords.length - 1); len <= vWords.length + 1; len++) {
    for (let start = 0; start + len <= transcriptWords.length; start++) {
      const window = transcriptWords.slice(start, start + len).join(' ');
      best = Math.max(best, similarity(window, variant));
    }
  }
  return best;
}

function keywordHeard(transcriptWords: string[], keyword: string): boolean {
  const k = normalize(keyword);
  return transcriptWords.some((w) => w === k || (k.length >= 4 && similarity(w, k) >= 0.75));
}

export function matchAttempt(transcript: string, target: MatchTarget, age: AgeBand): MatchResult {
  const words = tokens(transcript);
  if (words.length === 0) return 'not-heard';

  const threshold = STRICTNESS[age];
  const variants = target.accept.map(normalize).filter(Boolean);
  const best = Math.max(0, ...variants.map((v) => bestWindowSimilarity(words, v)));
  if (best >= threshold) return 'got-it';

  const heard = target.keywords.filter((k) => keywordHeard(words, k)).length;
  if (heard > 0) return 'nearly';

  return 'not-heard';
}

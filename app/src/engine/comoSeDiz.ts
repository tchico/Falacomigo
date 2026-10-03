// "Como se diz?" (design doc §3, FR-11): the child says a word in English and Gui gives it back in Portuguese from the
// word lists of the units they've reached. It counts once they say the Portuguese word themselves.

import type { Unit } from '../content/types';
import type { MatchTarget } from './match';
import { normalize } from './normalize';
import { similarity } from './match';

export interface Word {
  pt: string;
  en: string;
}

const DIGITS: Record<string, string> = { '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine' };
const ARTICLES = new Set(['the', 'a', 'an', 'my']);

/** English as plain words: lower case, no punctuation, digits as words ("6" → "six"). */
function plainEnglish(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/[-']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => DIGITS[w] ?? w);
}

/** Every word the child has reached: this unit's list and the ones before it. */
export function wordsUpTo(units: Unit[], unitId: string): Word[] {
  const upTo = units.findIndex((u) => u.id === unitId);
  return units.slice(0, upTo < 0 ? units.length : upTo + 1).flatMap((u) => u.vocab ?? []);
}

/**
 * The word the child asked about, from what the recogniser heard: "dog", "the dog" or "how do you say dog?".
 * Longer entries win ("orange juice" over "orange"). A close single word ("dogg") still counts.
 */
export function findWord(heard: string, words: Word[]): Word | null {
  const said = plainEnglish(heard).filter((w) => !ARTICLES.has(w));
  if (!said.length) return null;
  const text = ` ${said.join(' ')} `;
  const byLength = [...words].sort((a, b) => b.en.length - a.en.length);
  const exact = byLength.find((w) => text.includes(` ${plainEnglish(w.en).join(' ')} `));
  if (exact) return exact;
  let best: Word | null = null;
  let bestScore = 0.75;
  for (const w of words) {
    const en = plainEnglish(w.en).join(' ');
    for (const s of said) {
      const score = similarity(en, s);
      if (score >= bestScore) {
        best = w;
        bestScore = score;
      }
    }
  }
  return best;
}

/** Whether a whole utterance is just an English word from the list, so Gui can treat it as "Como se diz?". */
export function saidInEnglish(heard: string, words: Word[]): Word | null {
  const said = plainEnglish(heard).filter((w) => !ARTICLES.has(w)).join(' ');
  if (!said) return null;
  return words.find((w) => plainEnglish(w.en).join(' ') === said && normalize(w.pt) !== said && !normalize(w.pt).endsWith(` ${said}`)) ?? null;
}

/** What the child should say back: the word with or without its article ("o cão", "cão"). */
export function targetFor(word: Word): MatchTarget {
  const full = normalize(word.pt);
  const bare = full.replace(/^(o|a|os|as) /, '');
  return { accept: [...new Set([full, bare])], keywords: [] };
}

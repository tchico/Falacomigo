// Help with saying a hard word (the "Truque!" card). When the same word of the phrase is missed on two tries, Gui
// shows it in pieces, as an English speaker would read them, says it slowly, builds it up from the end
// ("doo… gah-doo… bree-gah-doo… obrigado"), and links its hardest sound to one in an English word the child knows.

import type { AgeBand, SoundGuide } from '../content/types';
import { missedWords } from './match';
import { normalize } from './normalize';

export interface WordHelp {
  /** The word as written in the phrase, e.g. "obrigado". */
  word: string;
  /** Syllables as written: ["o", "bri", "ga", "do"]. */
  pt: string[];
  /** The same, the English way: ["oh", "bree", "GAH", "doo"]. The stressed one is in capitals. */
  en: string[];
  /** What Gui says, slowly, to build the word up from its end. Just the word for one syllable. */
  buildUp: string[];
  tip: { text: string; emoji: string } | null;
}

/** The words of a phrase as written, lower case, without punctuation: "Chamo-me Ana." → ["chamo-me", "ana"]. */
export function wordsOf(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/[^\p{L}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function helpFor(word: string, guide: SoundGuide): WordHelp | null {
  const entry = guide.words[word.toLowerCase()];
  if (!entry) return null;
  const buildUp = entry.pt.length > 1 ? entry.pt.map((_, i) => entry.pt.slice(entry.pt.length - 1 - i).join('')) : [word];
  const tip = guide.tips.find((t) => new RegExp(t.match).test(word.toLowerCase()));
  return { word, pt: entry.pt, en: entry.en, buildUp, tip: tip ? { text: tip.tip, emoji: tip.emoji } : null };
}

/**
 * The word the child is stuck on: a word of the phrase missed in the last try and, when there's an earlier try,
 * missed there too. Only words the guide knows count (not names). null when nothing was said, or nothing fits.
 */
export function troubleWord(phrase: string, transcripts: string[], age: AgeBand, guide: SoundGuide): WordHelp | null {
  const tries = transcripts.filter((t) => t.trim());
  if (!tries.length) return null;
  const missed = tries.map((t) => new Set(missedWords(phrase, t, age)));
  // "chamo-me" is two words to the matcher: missing either part counts.
  const missedIn = (m: Set<string>, w: string) => normalize(w).split(' ').some((part) => m.has(part));
  const stuck = (w: string) => missed.every((m) => missedIn(m, w));
  const lastOnly = (w: string) => missedIn(missed[missed.length - 1], w);
  const words = wordsOf(phrase).filter((w) => guide.words[w]);
  // A longer word first: that's where the trouble usually is ("obrigado" before "o").
  const byLength = [...words].sort((a, b) => b.length - a.length);
  const word = byLength.find(stuck) ?? byLength.find(lastOnly);
  return word ? helpFor(word, guide) : null;
}

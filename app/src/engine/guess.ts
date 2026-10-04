// Describe and guess, for the two older children (FR-24). One sees a secret picture and gives clues in Portuguese,
// then passes the tablet; the other says what it is. They play as a team: a guess that isn't it just asks for
// another clue, and every round ends with the picture found.

import type { AgeBand, GuessCard } from '../content/types';
import { matchAttempt, similarity, STRICTNESS, type MatchResult } from './match';
import { normalize, tokens } from './normalize';

/** Pictures the guesser chooses from. */
export const OPTIONS = 4;
/** Coins each for finding the picture, on top of the coins for every spoken turn. */
export const GUESS_BONUS = 5;

/** The cards from units both children have reached, so the younger one knows the words too. */
export function cardsFor(cards: GuessCard[], reachedUnit: number): GuessCard[] {
  const ok = cards.filter((c) => c.unit <= reachedUnit);
  return ok.length >= OPTIONS * 2 ? ok : [...cards].sort((a, b) => a.unit - b.unit).slice(0, Math.max(ok.length, OPTIONS * 2));
}

function shuffle<T>(xs: T[], random: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface GuessRound {
  secret: GuessCard;
  /** The pictures to choose from, the secret among them, in a random order. */
  options: GuessCard[];
}

/** A new round: a secret not used yet this game (while there are any left), and some others to choose from. */
export function newRound(cards: GuessCard[], used: string[], random: () => number = Math.random): GuessRound {
  const fresh = cards.filter((c) => !used.includes(c.id));
  const pool = fresh.length ? fresh : cards;
  const secret = pool[Math.floor(random() * pool.length)];
  const others = shuffle(cards.filter((c) => c.id !== secret.id), random).slice(0, OPTIONS - 1);
  return { secret, options: shuffle([secret, ...others], random) };
}

/** The little words around a guess: "é um gelado", "acho que é a bola". */
const FILLER = new Set(['e', 'um', 'uma', 'o', 'a', 'acho', 'que', 'gui', 'hum', 'isso', 'sera']);

/**
 * Which picture the guesser named, if any: the one whose word is closest to a word they said, when it's close enough
 * for their age. "É um…" with no word names nothing.
 */
export function judgeGuess(transcript: string, options: GuessCard[], age: AgeBand): { result: MatchResult; card: GuessCard } {
  const said = tokens(transcript).filter((w) => !FILLER.has(w));
  const scored = options.map((card) => ({ card, score: Math.max(0, ...card.accept.flatMap((a) => said.map((w) => similarity(w, a)))) }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  return { result: best.score >= STRICTNESS[age] ? 'got-it' : 'not-heard', card: best.card };
}

/** A clue counts if it's one of the card's or uses its words. Saying the picture's own name is "named-it". */
export function judgeClue(transcript: string, card: GuessCard, age: AgeBand): MatchResult | 'named-it' {
  const words = tokens(transcript);
  if (card.accept.some((a) => words.includes(a))) return 'named-it';
  return matchAttempt(transcript, { accept: card.clues.map((c) => normalize(c.text)), keywords: card.clueWords }, age);
}

/** "{describer}, é a tua vez!" with the names filled in. */
export const fillGuess = (line: string, names: Record<string, string | number>): string =>
  line.replace(/\{(\w+)\}/g, (m, k: string) => (k in names ? String(names[k]) : m));

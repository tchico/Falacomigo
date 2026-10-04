// Build a story together, for two children (FR-25). Gui starts it, then the children take turns adding a sentence
// out loud. Each turn offers three pictures with a sentence each to help, but any sentence of their own counts too:
// it's their story, so there's no wrong answer, only "say it again" when nothing was heard.

import type { AgeBand, StoryStep } from '../content/types';
import { similarity, STRICTNESS } from './match';
import { tokens } from './normalize';

/** Coins each for finishing a story, on top of the coins for every sentence. */
export const STORY_BONUS = 5;
/** Words it takes to count as a sentence of their own. */
export const OWN_WORDS = 2;

export type StoryOption = StoryStep['options'][number];

export type Told =
  /** They said (something like) one of the pictures' sentences. */
  | { kind: 'option'; option: StoryOption }
  /** A sentence of their own: it goes in the story as they said it. */
  | { kind: 'own'; text: string }
  | { kind: 'not-heard' };

/** What a child added to the story: the picture whose words they used, or their own sentence. */
export function judgeSentence(transcript: string, step: StoryStep, age: AgeBand): Told {
  const said = tokens(transcript);
  // Short words like "pão" have to be said as they are, or "ao" and "não" would pick them.
  const close = (w: string, k: string) => (k.length <= 3 ? (w === k ? 1 : 0) : similarity(w, k));
  const scored = step.options.map((option) => ({ option, score: Math.max(0, ...option.keywords.flatMap((k) => said.map((w) => close(w, k)))) }));
  const best = scored.reduce((a, b) => (b.score > a.score ? b : a));
  if (best.score >= STRICTNESS[age]) return { kind: 'option', option: best.option };
  if (said.length >= OWN_WORDS) return { kind: 'own', text: sentence(transcript) };
  return { kind: 'not-heard' };
}

/** "era uma vez um cão" → "Era uma vez um cão." */
export function sentence(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  const s = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(s) ? s : `${s}.`;
}

/** Whose turn it is for step `i`: they take turns, and whoever went second last story goes first this time. */
export const tellerFor = (i: number, storyNo: number): 0 | 1 => ((i + storyNo) % 2) as 0 | 1;

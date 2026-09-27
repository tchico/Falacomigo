// Types for the content packs in /content. See content/schema/unit.schema.json.

export type AgeBand = 6 | 8;
export type Rung = 1 | 2 | 3 | 4 | 5;

export interface Phrase {
  id: string;
  text: string;
  en: string;
  /** Accepted versions, already normalised (lower case, no accents or punctuation). May contain {name}, {age}, {sibling}. */
  accept: string[];
  /** Hearing some of these gives a "nearly" result. */
  keywords: string[];
  ages: AgeBand[];
  startRung: number;
  audio?: { dad?: string; ttsFallback?: boolean };
}

export interface Line {
  speaker: string;
  text: string;
  en?: string;
}

export interface Beat {
  id: string;
  ages?: AgeBand[];
  say: Line;
  /** Phrase the child should say, or null for a story beat. */
  expect: string | null;
  accept?: string[];
  keywords?: string[];
  recast?: string;
  image?: string;
  cliffhanger?: boolean;
  unlocks?: string;
  note?: string;
}

export interface Scene {
  id: string;
  title: string;
  titleEn?: string;
  setting?: string;
  beats: Beat[];
}

export interface Mission {
  id: string;
  day: number;
  bonus?: boolean;
  siblings?: boolean;
  card: { text: string; en: string; image?: string };
  say: Record<'6' | '8', string>;
  targets: Record<'6' | '8', string[]>;
  when: string;
}

export interface Unit {
  id: string;
  unit: number;
  title: string;
  titleEn?: string;
  stop: { id: string; name: string; nameEn?: string };
  phrases: Phrase[];
  vocab?: { pt: string; en: string }[];
  warmup?: string[];
  scenes: Scene[];
  missions: Mission[];
}

export interface GuideCard {
  id: number;
  title: string;
  kind: 'research' | 'practical';
  paragraphs: string[];
  bullets: string[];
  steps: string[];
  table: { header: string[]; rows: string[][] } | null;
  tryThisWeek: string;
  refs: number[];
}

export interface GuideSource {
  id: number;
  title: string;
  url: string;
  supports: string;
}

export interface Guide {
  cards: GuideCard[];
  sources: GuideSource[];
}

/** What the game knows about the child playing, used to fill {name}, {age} and {sibling}. */
export interface ChildProfile {
  id: string;
  name: string;
  age: AgeBand;
  /** Word for their age in Portuguese, e.g. "oito". */
  ageWord: string;
  /** How they'd name a sibling, e.g. "irmão" or the sibling's name. */
  sibling: string;
}

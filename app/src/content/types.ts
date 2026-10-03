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
  /** What the voice says, when the written line has sounds text-to-speech can't do ("a minha barriga faz rrrr"). */
  spoken?: string;
}

export interface Beat {
  id: string;
  ages?: AgeBand[];
  say: Line;
  /** Phrase the child should say, or null for a story beat. */
  expect: string | null;
  /** What the child should say here, when it differs from the phrase text. */
  model?: string;
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

export interface Character {
  name: string;
  role?: string;
  roleEn?: string;
  /** Stand-in picture until there's an illustration. */
  emoji: string;
  color?: string;
}

export interface Unit {
  id: string;
  unit: number;
  title: string;
  titleEn?: string;
  stop: { id: string; name: string; nameEn?: string };
  /** Local characters by speaker id. Gui ("gui") is always there and isn't listed. */
  characters?: Record<string, Character>;
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

/** Something Gui can wear, bought in his shop by saying it in Portuguese (FR-22). See content/shop.json. */
export interface ShopItem {
  id: string;
  /** With its article, e.g. "o boné". */
  name: string;
  en: string;
  slot: 'head' | 'eyes' | 'neck';
  price: number;
  /** Stand-in picture until there's an illustration. */
  emoji: string;
  /** What the child says to buy it, e.g. "Quero o boné!". */
  say: string;
  /** Accepted versions, already normalised. */
  accept: string[];
  keywords: string[];
}

export interface Shop {
  title: string;
  titleEn?: string;
  items: ShopItem[];
}

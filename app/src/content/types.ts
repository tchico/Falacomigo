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
  /**
   * Other real answers to an open question ("Como estás?" → "Estou mal"), each with the character's own reply,
   * so Gui never answers "Que bom!" to a child who said they're sad.
   */
  answers?: { accept: string[]; recast: string }[];
  /** When the child says something real the script doesn't cover, Gui may answer with a smart reply (if Dad turned them on). */
  freeReply?: boolean;
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

/** One stop on the journey map, whether or not its unit exists yet (FR-21). See content/journey.json. */
export interface JourneyStop {
  id: string;
  name: string;
  nameEn?: string;
  emoji: string;
  /** Where it is on the journey map, as fractions of the map's width and height. */
  x: number;
  y: number;
}

export interface Journey {
  stops: JourneyStop[];
}

/** Gui's own lines outside the scenes. See content/gui.json. */
export interface GuiLines {
  warmup: { title: string; intro: string; introEn: string };
  /** Gui's line before one of Dad's own phrases (FR-28). */
  family: { say: string; sayEn: string; recast: string };
  session: { aimMinutes: number; listenBack: string; more: string; moreEn: string; moreButton: string; sleepy: string; sleepyEn: string; bye: string };
  album: { title: string; titleEn: string; button: string; newPostcard: string; newPostcardEn: string; newStop: string; newStopEn: string; soon: string; locked: string };
  truque: { title: string; go: string };
  comoSeDiz: { button: string; ask: string; askEn: string; answer: string; yourTurn: string; praise: string; again: string; unknown: string; unknownEn: string; back: string };
}

/** Help with saying a word (see content/sounds.json). */
export interface SoundGuide {
  words: Record<string, { pt: string[]; en: string[] }>;
  tips: { match: string; tip: string; anchor?: string; emoji: string }[];
}

/** A picture to describe and guess (FR-24). See content/guess.json. */
export interface GuessCard {
  id: string;
  /** Used once both children have reached this unit. */
  unit: number;
  emoji: string;
  /** With its article, e.g. "o gelado". */
  name: string;
  /** The guess as the guesser says it, e.g. "É um gelado!". */
  say: string;
  /** The word and its other forms, normalised. */
  accept: string[];
  clues: { text: string; en: string }[];
  /** Hearing any of these, normalised, counts as a clue. */
  clueWords: string[];
}

export interface GuessGame {
  title: string;
  titleEn?: string;
  rounds: number;
  lines: Record<string, string>;
  cards: GuessCard[];
}

// Dad's own touches to the content (FR-28): the family's names (granny, grandad, their village), other ways of
// saying a phrase that should count, and phrases of his own. Saved on the tablet as one settings entry and laid
// over the content packs when the app starts, so the packs themselves never change.

import type { Phrase, Unit } from '../content/types';
import { normalize } from './normalize';

export interface FamilyNames {
  /** What the children call their grandmother, e.g. "avó Rosa". */
  granny: string;
  grandad: string;
  /** The grandparents' village or town, e.g. "Tomar". */
  village: string;
}

export interface CustomPhrase {
  id: string;
  text: string;
  en: string;
  /** Other ways of saying it that should count, normalised. */
  accept: string[];
}

export interface FamilyEdits {
  names: FamilyNames;
  /** Per phrase id: accepted versions Dad added, and built-in ones he took away. */
  accept: Record<string, { add: string[]; remove: string[] }>;
  phrases: CustomPhrase[];
}

export const FAMILY_SETTING = 'family-edits';
export const FAMILY_UNIT_ID = 'family';

/** Used in content until Dad gives the real names. */
export const DEFAULT_NAMES: FamilyNames = { granny: 'avó', grandad: 'avô', village: 'a aldeia' };

export const emptyEdits = (): FamilyEdits => ({ names: { ...DEFAULT_NAMES }, accept: {}, phrases: [] });

/** Reads the saved edits, keeping whatever is valid and falling back to nothing changed. */
export function readEdits(saved: string | null): FamilyEdits {
  const edits = emptyEdits();
  if (!saved) return edits;
  try {
    const raw = JSON.parse(saved) as Partial<FamilyEdits>;
    for (const k of Object.keys(DEFAULT_NAMES) as (keyof FamilyNames)[]) {
      const v = raw.names?.[k];
      if (typeof v === 'string' && v.trim()) edits.names[k] = v.trim();
    }
    for (const [id, e] of Object.entries(raw.accept ?? {})) {
      const add = (e?.add ?? []).filter((a): a is string => typeof a === 'string').map(normalize).filter(Boolean);
      const remove = (e?.remove ?? []).filter((a): a is string => typeof a === 'string');
      if (add.length || remove.length) edits.accept[id] = { add, remove };
    }
    for (const p of raw.phrases ?? []) {
      if (p && typeof p.text === 'string' && p.text.trim() && typeof p.id === 'string') {
        edits.phrases.push({ id: p.id, text: p.text.trim(), en: typeof p.en === 'string' ? p.en.trim() : '', accept: (p.accept ?? []).map(normalize).filter(Boolean) });
      }
    }
  } catch {
    // A damaged entry just means no edits.
  }
  return edits;
}

/** The accepted versions after Dad's edits: built-in ones he kept, then his own, without repeats. */
export function editedAccept(builtIn: string[], edit: { add: string[]; remove: string[] } | undefined): string[] {
  if (!edit) return builtIn;
  // The first version is the phrase itself and always counts, so there's always a way through.
  const out = builtIn.filter((a, i) => i === 0 || !edit.remove.includes(a));
  for (const a of edit.add) if (!out.includes(a)) out.push(a);
  return out;
}

/** The next free id for a phrase of Dad's: F01, F02… */
export function nextCustomId(phrases: CustomPhrase[]): string {
  const used = new Set(phrases.map((p) => p.id));
  for (let n = 1; ; n++) {
    const id = `F${String(n).padStart(2, '0')}`;
    if (!used.has(id)) return id;
  }
}

const SMALL_WORDS = new Set(['a', 'o', 'as', 'os', 'e', 'de', 'do', 'da', 'um', 'uma', 'eu', 'tu', 'me', 'te', 'que', 'em', 'no', 'na']);

/** A phrase of Dad's as a content phrase: everyone gets it, starting on the first rung (hear it, say it). */
export function customToPhrase(c: CustomPhrase): Phrase {
  const own = normalize(c.text);
  const words = own.split(' ').filter((w) => w.length > 2 && !SMALL_WORDS.has(w));
  return {
    id: c.id,
    text: c.text,
    en: c.en,
    accept: [own, ...c.accept.filter((a) => a !== own)],
    keywords: words.length ? words : own.split(' '),
    ages: [6, 8],
    startRung: 1,
    audio: { dad: `${c.id}.m4a`, ttsFallback: true },
  };
}

/**
 * Dad's phrases as a small unit of their own, with one beat each, so they can be practised in the warm-up and
 * recorded in his voice like any other phrase. It isn't a stop on the journey.
 */
export function familyUnit(edits: FamilyEdits, lines: { say: string; sayEn: string; recast: string }): Unit {
  return {
    id: FAMILY_UNIT_ID,
    unit: 0,
    title: 'Frases do pai',
    titleEn: "Dad's phrases",
    stop: { id: 'garden', name: 'O jardim' },
    phrases: edits.phrases.map(customToPhrase),
    scenes: [
      {
        id: 'F',
        title: 'Frases do pai',
        beats: edits.phrases.map((p) => ({ id: p.id, say: { speaker: 'gui', text: lines.say, en: lines.sayEn }, expect: p.id, recast: lines.recast })),
      },
    ],
    missions: [],
  };
}

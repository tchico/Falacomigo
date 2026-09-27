// The clips Dad can record in the parent zone (FR-26): every phrase, filled in for each child where the phrase
// is personal (P03 "Chamo-me …"), and each mission's line for each age band in the family.

import type { ChildProfile, Unit } from '../content/types';
import { clipKey, isPersonal, missionClipFile, phraseClipFile } from '../audio/clips';
import { fill, fillEn } from '../engine/template';

export interface RecordingSlot {
  key: string;
  unitId: string;
  /** What Dad should say. */
  text: string;
  en: string;
  /** Who it's for, when it's personal or per age. */
  forWho?: string;
}

export function recordingList(units: Unit[], children: ChildProfile[]): RecordingSlot[] {
  const slots: RecordingSlot[] = [];
  const seen = new Set<string>();
  const add = (s: RecordingSlot) => {
    if (seen.has(s.key)) return;
    seen.add(s.key);
    slots.push(s);
  };

  for (const unit of units) {
    for (const p of unit.phrases) {
      const perChild = (p.audio?.dad ?? '').includes('{childId}') || isPersonal(p.text);
      const who = perChild ? children.filter((c) => p.ages.includes(c.age)) : [children[0]];
      for (const c of who) {
        if (!c) continue;
        add({ key: clipKey(unit.id, phraseClipFile(p, c)), unitId: unit.id, text: fill(p.text, c), en: fillEn(p.en, c), forWho: perChild ? c.name : undefined });
      }
    }
    for (const m of unit.missions) {
      for (const c of children) {
        const say = m.say[String(c.age) as '6' | '8'];
        add({ key: clipKey(unit.id, missionClipFile(m, c)), unitId: unit.id, text: fill(say, c), en: m.card.en, forWho: isPersonal(say) ? c.name : `${c.age} anos` });
      }
    }
  }
  return slots;
}

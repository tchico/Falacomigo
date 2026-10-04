// Content packs live in /content at the repo root so they can be edited without touching app code (NFR-07).
// metro.config.js adds the repo root to Metro's watch folders so these imports work in the app.
import unit01 from '../../../content/units/unit-01.json';
import unit02 from '../../../content/units/unit-02.json';
import unit03 from '../../../content/units/unit-03.json';
import unit04 from '../../../content/units/unit-04.json';
import guideJson from '../../../content/guide.json';
import shopJson from '../../../content/shop.json';
import journeyJson from '../../../content/journey.json';
import guiJson from '../../../content/gui.json';
import soundsJson from '../../../content/sounds.json';
import type { Guide, GuiLines, Journey, Shop, SoundGuide, Unit } from './types';
import { editedAccept, emptyEdits, familyUnit, FAMILY_UNIT_ID, type FamilyEdits } from '../engine/family';
import { setFamilyNames } from '../engine/template';

export const units: Unit[] = [unit01 as unknown as Unit, unit02 as unknown as Unit, unit03 as unknown as Unit, unit04 as unknown as Unit];
export const guide: Guide = guideJson as unknown as Guide;
export const shop: Shop = shopJson as unknown as Shop;
export const journey: Journey = journeyJson as unknown as Journey;
export const guiLines: GuiLines = guiJson as unknown as GuiLines;
export const sounds: SoundGuide = soundsJson as unknown as SoundGuide;

/** The packs' own accepted versions, so Dad's edits are always laid over the originals. */
const original = new Map(units.flatMap((u) => [
  ...u.phrases.map((p) => [`${u.id}/${p.id}`, p.accept] as const),
  ...u.scenes.flatMap((s) => s.beats.filter((b) => b.accept).map((b) => [`${u.id}/${s.id}/${b.id}`, b.accept!] as const)),
]));
const villageStop = journey.stops.find((s) => s.id === 'village');
const villageName = villageStop?.name;

let family: Unit = familyUnit(emptyEdits(), guiLines.family);

/**
 * Lays Dad's edits from the parent zone over the content (FR-28): extra or removed accepted versions, the family's
 * names, and his own phrases as a small unit that the warm-up brings in. Call again after every change.
 */
export function applyFamilyEdits(edits: FamilyEdits): void {
  for (const u of units) {
    for (const p of u.phrases) p.accept = editedAccept(original.get(`${u.id}/${p.id}`)!, edits.accept[p.id]);
    for (const s of u.scenes) for (const b of s.beats) {
      const own = original.get(`${u.id}/${s.id}/${b.id}`);
      if (own && b.expect) b.accept = editedAccept(own, edits.accept[b.expect]);
    }
  }
  setFamilyNames(edits.names);
  if (villageStop && villageName) villageStop.name = edits.names.village === emptyEdits().names.village ? villageName : edits.names.village;
  family = familyUnit(edits, guiLines.family);
}

/** A phrase's accepted versions as the content pack has them, before Dad's edits. */
export const originalAccept = (unitId: string, phraseId: string): string[] => original.get(`${unitId}/${phraseId}`) ?? [];

/** Dad's own phrases, as a unit that isn't a stop on the journey. */
export const familyPhrases = (): Unit => family;

export function getUnit(id: string): Unit {
  if (id === FAMILY_UNIT_ID) return family;
  const unit = units.find((u) => u.id === id);
  if (!unit) throw new Error(`Unknown unit ${id}`);
  return unit;
}

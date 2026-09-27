// Content packs live in /content at the repo root so they can be edited without touching app code (NFR-07).
// metro.config.js adds the repo root to Metro's watch folders so these imports work in the app.
import unit01 from '../../../content/units/unit-01.json';
import unit02 from '../../../content/units/unit-02.json';
import guideJson from '../../../content/guide.json';
import type { Guide, Unit } from './types';

export const units: Unit[] = [unit01 as unknown as Unit, unit02 as unknown as Unit];
export const guide: Guide = guideJson as unknown as Guide;

export function getUnit(id: string): Unit {
  const unit = units.find((u) => u.id === id);
  if (!unit) throw new Error(`Unknown unit ${id}`);
  return unit;
}

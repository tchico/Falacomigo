// Picks what the next episode plays for one child (design doc §2).
// Scenes are played in order through each unit. A unit's scenes all played once opens the next unit.
// Once everything has been played, the scene played least recently comes back as a replay.

import type { AgeBand, Unit } from '../content/types';

export interface PlayedScene {
  unitId: string;
  sceneId: string;
  /** When it was last finished (ms). */
  lastAt: number;
}

export interface NextScene {
  unitId: string;
  sceneId: string;
  replay: boolean;
}

export function nextScene(units: Unit[], played: PlayedScene[]): NextScene {
  const done = new Set(played.map((p) => `${p.unitId}/${p.sceneId}`));
  for (const unit of units) {
    const fresh = unit.scenes.find((s) => !done.has(`${unit.id}/${s.id}`));
    if (fresh) return { unitId: unit.id, sceneId: fresh.id, replay: false };
  }
  const known = new Set(units.flatMap((u) => u.scenes.map((s) => `${u.id}/${s.id}`)));
  const oldest = played.filter((p) => known.has(`${p.unitId}/${p.sceneId}`)).sort((a, b) => a.lastAt - b.lastAt)[0];
  if (oldest) return { unitId: oldest.unitId, sceneId: oldest.sceneId, replay: true };
  return { unitId: units[0].id, sceneId: units[0].scenes[0].id, replay: false };
}

/** The child's local calendar day as YYYY-MM-DD. Review dates and "different days" use this. */
export function localDay(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The Mission to Dad that ends this episode (FR-17): the one that uses the most phrases the child just practised,
 * among those they haven't had yet, in the unit's order when it's a tie. Bonus missions only come once the others
 * have all been given. When every mission has been given, they come round again.
 */
export function nextMission(unit: Unit, givenMissionIds: string[], age: AgeBand, practised: string[] = []): Unit['missions'][number] {
  const key = String(age) as '6' | '8';
  const overlap = (m: Unit['missions'][number]) => m.targets[key].filter((id) => practised.includes(id)).length;
  const pick = (ms: Unit['missions']) => ms.reduce((best, m) => (overlap(m) > overlap(best) ? m : best));

  const fresh = unit.missions.filter((m) => !givenMissionIds.includes(m.id));
  const regular = fresh.filter((m) => !m.bonus);
  if (regular.length) return pick(regular);
  if (fresh.length) return pick(fresh);
  return unit.missions[givenMissionIds.length % unit.missions.length];
}

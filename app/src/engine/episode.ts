// Picks what the next episode plays for one child (design doc §2).
// Scenes are played in order through each unit. A unit's scenes all played once opens the next unit.
// Once everything has been played, the scene played least recently comes back as a replay.

import type { Unit } from '../content/types';

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
 * The Mission to Dad that ends this episode (FR-17): the unit's missions in order, starting with the first one
 * this child hasn't had yet. Once all have been given they come round again.
 */
export function nextMission(unit: Unit, givenMissionIds: string[]): Unit['missions'][number] {
  const fresh = unit.missions.find((m) => !givenMissionIds.includes(m.id));
  return fresh ?? unit.missions[givenMissionIds.length % unit.missions.length];
}

// The postcard album and the journey map (design doc §4, FR-21). Each finished scene adds its postcard to the
// album. A stop whose postcards are all there unlocks the next stop, which is also where nextScene() goes next.

import type { JourneyStop, Unit } from '../content/types';

export interface Postcard {
  unitId: string;
  sceneId: string;
  title: string;
  titleEn?: string;
  setting?: string;
  got: boolean;
}

export type StopState = 'done' | 'current' | 'locked' | 'soon';

export interface AlbumStop {
  stop: JourneyStop;
  /** Stop number on the map, from 1. */
  number: number;
  /** null while the stop has no unit yet ("em breve"). */
  unitId: string | null;
  postcards: Postcard[];
  state: StopState;
}

export function buildAlbum(units: Unit[], stops: JourneyStop[], played: { unitId: string; sceneId: string }[]): AlbumStop[] {
  const got = new Set(played.map((p) => `${p.unitId}/${p.sceneId}`));
  let open = true;
  return stops.map((stop, i) => {
    const unit = units.find((u) => u.stop.id === stop.id) ?? null;
    const postcards: Postcard[] = (unit?.scenes ?? []).map((s) => ({
      unitId: unit!.id,
      sceneId: s.id,
      title: s.title,
      titleEn: s.titleEn,
      setting: s.setting,
      got: got.has(`${unit!.id}/${s.id}`),
    }));
    let state: StopState;
    if (!unit) state = 'soon';
    else if (postcards.every((p) => p.got)) state = 'done';
    else if (open) state = 'current';
    else state = 'locked';
    // Only the first unfinished stop is open: the next one waits for its album to be full.
    if (unit && state !== 'done') open = false;
    return { stop, number: i + 1, unitId: unit?.id ?? null, postcards, state };
  });
}

export function postcardCount(album: AlbumStop[]): { got: number; total: number } {
  const all = album.flatMap((s) => s.postcards);
  return { got: all.filter((p) => p.got).length, total: all.length };
}

/** The stop to show first: where the child is now, or the last finished one once everything's done. */
export function focusStop(album: AlbumStop[]): AlbumStop {
  return album.find((s) => s.state === 'current') ?? [...album].reverse().find((s) => s.state === 'done') ?? album[0];
}

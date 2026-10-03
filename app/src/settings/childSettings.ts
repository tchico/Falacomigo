// Settings for each child, chosen in the parent zone (FR-29). Stored in the settings table as JSON, one row a child.

import type { AgeBand } from '../content/types';

export interface ChildSettings {
  /** The English line under what the characters say. On for the 8-year-old, off for the 6-year-old, by default. */
  subtitles: boolean;
  /** After this long, Gui gets sleepy at the end of the next scene (FR-16). */
  sessionMinutes: number;
  /**
   * After each spoken turn the child hears themselves, then Gui. The recording is only kept in memory (or a
   * temporary file on the tablet) until it has played, then deleted (NFR-05). Off by default.
   */
  listenBack: boolean;
}

export const SESSION_CHOICES = [10, 12, 15, 20] as const;

export function defaultSettings(age: AgeBand, aimMinutes: number): ChildSettings {
  return { subtitles: age === 8, sessionMinutes: aimMinutes, listenBack: false };
}

export const settingsKey = (childId: string) => `child:${childId}:settings`;

/** What was saved, over the defaults. Anything missing or broken falls back to the default. */
export function readSettings(saved: string | null, age: AgeBand, aimMinutes: number): ChildSettings {
  const d = defaultSettings(age, aimMinutes);
  if (!saved) return d;
  try {
    const s = JSON.parse(saved) as Partial<ChildSettings>;
    return {
      subtitles: typeof s.subtitles === 'boolean' ? s.subtitles : d.subtitles,
      sessionMinutes: typeof s.sessionMinutes === 'number' && s.sessionMinutes >= 5 && s.sessionMinutes <= 30 ? s.sessionMinutes : d.sessionMinutes,
      listenBack: typeof s.listenBack === 'boolean' ? s.listenBack : d.listenBack,
    };
  } catch {
    return d;
  }
}

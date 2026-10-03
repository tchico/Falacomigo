// How long a session runs (design doc §2, FR-16). Sessions aim for 10–15 minutes. After that, Gui gets sleepy at the
// end of the next scene and says goodbye, but there's no lock-out: the child can still choose one more.

export function isSleepy(startedAt: number, now: number, aimMinutes: number): boolean {
  return now - startedAt >= aimMinutes * 60_000;
}

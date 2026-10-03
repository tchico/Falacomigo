// The dotted route between the stops on the journey map (FR-21), and where along it each dot is.

export interface Point {
  x: number;
  y: number;
}

export interface TrailDot extends Point {
  /** How far along the journey: leg number plus the fraction of that leg (1.5 is halfway from stop 2 to stop 3). */
  at: number;
}

/** `per` dots on the straight line of each leg between stops, the last one on the next stop left out. */
export function trail(stops: Point[], per = 6): TrailDot[] {
  const dots: TrailDot[] = [];
  for (let i = 0; i + 1 < stops.length; i++) {
    const [a, b] = [stops[i], stops[i + 1]];
    for (let k = 1; k < per; k++) {
      const f = k / per;
      dots.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, at: i + f });
    }
  }
  return dots;
}

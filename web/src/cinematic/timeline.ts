// The 30-second film as data: every beat time lives here. stateAt(t) is a pure function, so renderAt(12.5) is reproducible.
// The film drives the same stage, engines, data files and colour scale as the interactive experience.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import type { Pose } from '../engine/geo';

export const TOTAL = 30;

export const SHOTS = [
  { n: 1, t0: 0, t1: 4, title: 'Earth observation', line: 'Earth is changing.' },
  { n: 2, t0: 4, t1: 8.4, title: 'Discover Chile', line: 'But change is not uniform.' },
  { n: 3, t0: 8.4, t1: 13, title: 'Antofagasta', line: 'Look beyond regional averages.' },
  { n: 4, t0: 13, t1: 19, title: 'NASA data', line: 'Explore NASA climate observations and models.' },
  { n: 5, t0: 19, t1: 25, title: 'Reveal the difference', line: 'The conclusion depends on where — and when — you look.' },
  { n: 6, t0: 25, t1: 30, title: 'Become the interface', line: '' },
] as const;

// beats
export const CELLS_IN = [13.4, 17.6] as const;     // native cells appear west to east
export const PERIOD_SWAP = 22;                      // 1980–2025 result → 2003–2025 result (two computed windows; nothing in between)
export const PERIOD_A = '1980-2025', PERIOD_B = '2003-2025';
// V2: the yearly values behind the trends are drawn year by year (1980 → 2025) while the cells are on screen; camera and shots unchanged
export const CHART = { in: 14.2, draw: [14.8, 21.4], out: 24.4 } as const;
export const TITLE = [25.2, 27.5] as const;         // end title in / out
export const UI_IN = [27.3, 29.6] as const;         // interface panels arrive while the camera settles

/** Fly-to destinations: the overview of each terrain scene. Targets are the pyproj inverse of the scene bounds (EPSG:32719 / 32718). */
export const DEST: Record<'antofagasta' | 'los_lagos', Pose> = {
  antofagasta: { lon: -69.5, lat: -24.2, heading: 58, pitch: -37, range: 1250 },
  los_lagos: { lon: -72.93, lat: -42.12, heading: 30, pitch: -36, range: 760 },
};
export const WHOLE_EARTH: Pose = { lon: -92, lat: -8, heading: 0, pitch: -89, range: 21000 };

// camera keyframes: [t, lon, lat, heading, pitch, range km]. One spline through all of them: no joins, no reversals.
const K: [number, number, number, number, number, number][] = [
  [0, WHOLE_EARTH.lon, WHOLE_EARTH.lat, 0, -89, WHOLE_EARTH.range],
  [4, -80, -17, 2, -86, 11500],
  [8, -72, -23.6, 10, -68, 3600],
  [10.5, -70.9, -24.6, 20, -52, 2150],
  [13, -70.5, -24.9, 30, -41, 1500],        // the region sits right of centre: the captions own the lower left
  [19, -70.5, -25, 42, -38, 1380],
  [25, -70.2, -24.8, 52, -37, 1300],
  [30, DEST.antofagasta.lon, DEST.antofagasta.lat, DEST.antofagasta.heading, DEST.antofagasta.pitch, DEST.antofagasta.range],
];

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// monotone cubic Hermite (Fritsch–Carlson): smooth through every key and never overshoots, so no move reverses
function spline(col: number, t: number, log = false) {
  const v = (i: number) => (log ? Math.log(K[i][col]) : K[i][col]);
  const n = K.length;
  let i = 0;
  while (i < n - 2 && t > K[i + 1][0]) i++;
  const h = (j: number) => K[j + 1][0] - K[j][0], d = (j: number) => (v(j + 1) - v(j)) / h(j);
  const m = (j: number) => {
    if (j === 0 || j === n - 1) return 0;               // ease out of the first key and into the last (the final pose is at rest)
    const a = d(j - 1), b = d(j);
    return a * b <= 0 ? 0 : (3 * (h(j - 1) + h(j))) / ((2 * h(j) + h(j - 1)) / a + (h(j) + 2 * h(j - 1)) / b);
  };
  const x = clamp01((t - K[i][0]) / h(i)), x2 = x * x, x3 = x2 * x;
  const y = (2 * x3 - 3 * x2 + 1) * v(i) + (x3 - 2 * x2 + x) * h(i) * m(i) + (-2 * x3 + 3 * x2) * v(i + 1) + (x3 - x2) * h(i) * m(i + 1);
  return log ? Math.exp(y) : y;
}

export function poseAt(t: number): Pose {
  return { lon: spline(1, t), lat: spline(2, t), heading: spline(3, t), pitch: spline(4, t), range: spline(5, t, true) };
}

/** Pose between two poses (interactive flights). Range moves in log space so the approach feels even. */
export function lerpPose(a: Pose, b: Pose, k: number): Pose {
  const e = smooth(0, 1, k), l = (x: number, y: number) => x + (y - x) * e;
  return { lon: l(a.lon, b.lon), lat: l(a.lat, b.lat), heading: l(a.heading, b.heading), pitch: l(a.pitch, b.pitch), range: Math.exp(l(Math.log(a.range), Math.log(b.range))) };
}

/** An interactive flight: straight on the ground (lon/lat), an arc in height. The camera rises enough to see the way,
 *  travels and descends — it never cuts through the planet and never jumps. Pure functions: the same k gives the same pose. */
export type Flight = { from: Pose; to: Pose; dur: number; lift: number };
export function planFlight(from: Pose, to: Pose, km: number, reduced = false): Flight {
  const f = { ...from, heading: to.heading + ((((from.heading - to.heading) % 360) + 540) % 360) - 180 };   // turn the short way
  const peak = Math.min(9000, km * 2.2);
  return { from: f, to, dur: reduced ? 0 : Math.min(7000, Math.max(2400, 2200 + km * 1.7)), lift: Math.max(0, Math.log(peak) - Math.max(Math.log(f.range), Math.log(to.range))) };
}
export function flightPose(f: Flight, k: number): Pose {
  const p = lerpPose(f.from, f.to, k), hop = Math.sin(Math.PI * smooth(0, 1, k));
  return f.lift ? { ...p, range: Math.exp(Math.log(p.range) + f.lift * hop), pitch: p.pitch + (-82 - p.pitch) * 0.85 * hop } : p;
}

// What the scene shows depends on how close the camera is — the same rule for the film and for free navigation.
export const terrainAlpha = (range: number) => 1 - smooth(Math.log(1750), Math.log(2900), Math.log(range));   // regional terrain fades in on approach
export const reliefRise = (range: number) => 1 - smooth(Math.log(1520), Math.log(2500), Math.log(range));     // 0 = flat, 1 = the declared exaggeration

export type FilmState = {
  pose: Pose; shot: (typeof SHOTS)[number];
  period: string; reveal: number; cellFade: number;
  ui: number; title: number;
};

export function stateAt(t: number): FilmState {
  t = Math.min(TOTAL, Math.max(0, t));
  return {
    pose: poseAt(t),
    shot: SHOTS.find((s) => t < s.t1) ?? SHOTS[SHOTS.length - 1],
    period: t < PERIOD_SWAP ? PERIOD_A : PERIOD_B,
    reveal: clamp01((t - CELLS_IN[0]) / (CELLS_IN[1] - CELLS_IN[0])),
    cellFade: t < PERIOD_SWAP ? 1 - smooth(PERIOD_SWAP - 0.45, PERIOD_SWAP, t) : smooth(PERIOD_SWAP, PERIOD_SWAP + 0.45, t),
    ui: smooth(UI_IN[0], UI_IN[1], t),
    title: smooth(TITLE[0], TITLE[0] + 0.9, t) * (1 - smooth(TITLE[1], TITLE[1] + 0.9, t)),
  };
}

/** Beat list for sound design (name, seconds). */
export const EVENTS = [
  { name: 'open', t: 0 }, ...SHOTS.slice(1).map((s) => ({ name: `shot${s.n}`, t: s.t0 })),
  { name: 'terrain-rise', t: 9.6 }, { name: 'cells-in', t: CELLS_IN[0] }, { name: 'chart-draw', t: CHART.draw[0] }, { name: 'chart-end', t: CHART.draw[1] }, { name: 'period-swap', t: PERIOD_SWAP },
  { name: 'title', t: TITLE[0] }, { name: 'interface', t: UI_IN[0] }, { name: 'end', t: TOTAL },
];

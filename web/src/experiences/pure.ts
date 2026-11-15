// Small pure helpers of the stage (no DOM, no WebGL), kept apart so they can be unit-tested.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import type { Scene } from '../engine/terrain';

export type Extreme = { i: number; slope: number; lat: number; lon: number; p: number };
const R = Math.PI / 180, EARTH_KM = 6371;

/** great-circle distance in km */
export const kmBetween = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) => {
  const h = Math.sin(((b.lat - a.lat) * R) / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(((b.lon - a.lon) * R) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
};

/** Highest and lowest CELL TREND of a period, straight from the published per-cell values (not observed extremes). */
export function extremesOf(cells: Scene['cells'], period: string): { max: Extreme; min: Extreme } | null {
  let max: Extreme | null = null, min: Extreme | null = null;
  cells.forEach((c, i) => {
    const t = c.trends[period];
    if (!t || !Number.isFinite(t.slope)) return;       // a cell without a value is skipped, never read as zero
    const e = { i, slope: t.slope, lat: c.lat, lon: c.lon, p: t.p };
    if (!max || t.slope > max.slope) max = e;
    if (!min || t.slope < min.slope) min = e;
  });
  return max && min ? { max, min } : null;
}

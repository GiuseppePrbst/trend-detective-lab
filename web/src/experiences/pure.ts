// Small pure helpers of the stage (no DOM, no WebGL), kept apart so they can be unit-tested.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { inside, type Scene } from '../engine/terrain';

export type Extreme = { i: number; slope: number; lat: number; lon: number; p: number };
const R = Math.PI / 180, EARTH_KM = 6371;

/** great-circle distance in km */
export const kmBetween = (a: { lon: number; lat: number }, b: { lon: number; lat: number }) => {
  const h = Math.sin(((b.lat - a.lat) * R) / 2) ** 2 + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(((b.lon - a.lon) * R) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
};

/** Index of the cell whose VISIBLE footprint (native cell ∩ region) contains q, or -1.
 *  clip[i] = polygons of cell i, each an outer ring followed by its holes, in the same space as q. Picking must follow what is
 *  drawn: the relief mesh still exists where the alpha mask hides it, so a native-box test would open cells off the region. */
export function visibleCellAt(q: [number, number], clip: [number, number][][][][]): number {
  return clip.findIndex((polys) => polys.some(([outer, ...holes]) => inside(q, outer) && !holes.some((h) => inside(q, h))));
}

export type AreaTrend = { slope_per_decade: number; ci_low: number; ci_high: number; p_value: number; start: string; end: string };
/** What the globe says about the NASA MUR SST study area: one area-averaged trend read from sst.json, never a spatial field. */
export function sstLines(t: AreaTrend, verdict: string): string[] {
  const s = (x: number) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(2)}`;
  return [`${s(t.slope_per_decade)} °C per decade (${t.start.slice(0, 4)}–${t.end.slice(0, 4)})`,
    `95 % interval ${s(t.ci_low)} to ${s(t.ci_high)} · p = ${t.p_value.toFixed(3)} · ${verdict}`,
    'One area-averaged sea-surface temperature trend. The outline is the study footprint, not a spatial temperature map.'];
}

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

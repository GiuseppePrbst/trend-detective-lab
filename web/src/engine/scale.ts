// One colour scale for the cell trends, shared by the globe (Cesium), the relief (Three.js), the legend and the tests.
// The scale changes colours only: every value shown in text is the published trend, unchanged.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { RDBU, BRBG, type SceneId } from './terrain';

export type ScaleMode = 'spatial' | 'fixed';
export type TrendScale = {
  mode: ScaleMode;
  kind: 'sequential-positive' | 'sequential-negative' | 'diverging';
  lo: number; hi: number;            // domain ends shown in the legend
  colour: (v: number) => string;     // #rrggbb
  ticks: number[];
  note: string;                      // what the colours mean
  warning: string | null;            // comparability between periods (spatial mode only)
  key: string;                       // changes whenever any colour changes
};

// Sequential halves never start at the diverging palette's neutral: a small positive trend is never drawn as "zero".
const PALETTES: Record<SceneId, { diverging: string[]; positive: string[]; negative: string[]; minSpan: number; word: [string, string] }> = {
  // air temperature: warmer = yellow → crimson (ColorBrewer YlOrRd), cooler = light → dark blue (Blues)
  antofagasta: { diverging: RDBU, positive: ['#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026'],
    negative: ['#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#084594'], minSpan: 0.1, word: ['warming', 'cooling'] },
  // soil moisture: wetter = light → dark teal, drier = light → dark brown (halves of BrBG)
  los_lagos: { diverging: BRBG, positive: ['#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30'],
    negative: ['#f6e8c3', '#dfc27d', '#bf812d', '#8c510a', '#543005'], minSpan: 2, word: ['wetting', 'drying'] },
};

const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
/** piecewise-linear interpolation between ordered stops, t in 0..1 */
export function along(stops: string[], t: number): string {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const [a, b] = [hex(stops[i]), hex(stops[i + 1])];
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('')}`;
}
const spread = (lo: number, hi: number, n = 5) => Array.from({ length: n }, (_, i) => lo + ((hi - lo) * i) / (n - 1));

/**
 * values: the published trends of the cells drawn in this period (cells without a value are left out, never counted as zero).
 * fixedD: the scene's fixed symmetric domain (largest |trend| over every period), used by the fixed mode.
 */
export function createTrendScale(values: number[], id: SceneId, mode: ScaleMode, fixedD: number, periods = 1): TrendScale {
  const P = PALETTES[id], v = values.filter(Number.isFinite);
  if (mode === 'fixed' || !v.length) {
    return { mode: 'fixed', kind: 'diverging', lo: -fixedD, hi: fixedD, colour: (x) => along(P.diverging, (x / fixedD + 1) / 2), ticks: spread(-fixedD, fixedD, 7),
      note: periods > 1 ? 'Fixed scale across periods — colours are directly comparable.' : 'Fixed symmetric scale: white is zero.', warning: null, key: `fixed|${id}|${fixedD}` };
  }
  let lo = Math.min(...v), hi = Math.max(...v);
  if (hi - lo < P.minSpan) { const m = (lo + hi) / 2; lo = m - P.minSpan / 2; hi = m + P.minSpan / 2; }   // a near-uniform field is not stretched into a rainbow
  const warning = periods > 1 ? 'Colours are not directly comparable between periods because each period has its own scale. Switch to Fixed comparison for a common scale.' : null;
  const key = `spatial|${id}|${lo}|${hi}`;
  if (lo > 0) return { mode, kind: 'sequential-positive', lo, hi, colour: (x) => along(P.positive, (x - lo) / (hi - lo)), ticks: spread(lo, hi), warning, key,
    note: `All displayed cell trends are positive (${P.word[0]}). Colours show relative magnitude within this period.` };
  if (hi < 0) return { mode, kind: 'sequential-negative', lo, hi, colour: (x) => along(P.negative, (hi - x) / (hi - lo)), ticks: spread(lo, hi), warning, key,
    note: `All displayed cell trends are negative (${P.word[1]}). Colours show relative magnitude within this period.` };
  const D = Math.max(-lo, hi);         // both signs: symmetric around zero, so white stays zero and neither side is exaggerated
  return { mode, kind: 'diverging', lo: -D, hi: D, colour: (x) => along(P.diverging, (x / D + 1) / 2), ticks: spread(-D, D), warning, key: `${key}|${D}`,
    note: 'Cell trends of both signs in this period: white is zero, the scale ends at the largest trend.' };
}

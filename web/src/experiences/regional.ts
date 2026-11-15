// Regional layers of the Earth Atlas: six published variables for the 16 regions, read from two different result files.
// t2m / precip come from the confirmatory files (t2m.json, precip.json + catalog.json); the four GLDAS variables come from the
// exploratory multivar.json. This adapter turns both shapes into one view per layer. It colours published values only:
// no trend is computed here, a region without a usable value is left uncoloured (never zero).
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { BRBG, ramp, RDBU } from '../engine/terrain';
import type { Catalog, MultiVar, VariableData, Verdict } from '../types';

export type RegionalLayer = 't2m' | 'precip' | 'soilm_root' | 'soilm_surface' | 'evap' | 'swe';
const PUOR = ['#b35806', '#f1a340', '#fee0b6', '#f7f7f7', '#d8daeb', '#998ec3', '#542788'];   // evapotranspiration: less ↔ more water returned to the air
const SNOW = ['#8c510a', '#d8b365', '#f6e8c3', '#f7f7f7', '#c6dbef', '#6baed6', '#08519c'];   // snow water: loss (brown) ↔ gain (blue)

/** order, group and palette of the six layers; the palette's low end is always a decrease */
export const LAYERS: { id: RegionalLayer; group: 'Atmosphere' | 'Land surface'; short: string; stops: string[]; source: 'confirmatory' | 'multivar' }[] = [
  { id: 't2m', group: 'Atmosphere', short: 'Air temperature', stops: RDBU, source: 'confirmatory' },
  { id: 'precip', group: 'Atmosphere', short: 'Precipitation', stops: BRBG, source: 'confirmatory' },
  { id: 'soilm_root', group: 'Land surface', short: 'Root-zone soil moisture', stops: BRBG, source: 'multivar' },
  { id: 'soilm_surface', group: 'Land surface', short: 'Surface soil moisture (0–10 cm)', stops: BRBG, source: 'multivar' },
  { id: 'evap', group: 'Land surface', short: 'Evapotranspiration', stops: PUOR, source: 'multivar' },
  { id: 'swe', group: 'Land surface', short: 'Snow water equivalent', stops: SNOW, source: 'multivar' },
];
export const isRegional = (x: string): x is RegionalLayer => LAYERS.some((l) => l.id === x);

export type RegTrend = { slope_per_decade: number; ci_low: number; ci_high: number; p_value: number; p_adjusted?: number; significant_after_fdr?: boolean; verdict: Verdict; start: string; end: string };
/** flag: published, but not drawn — negligible snow (mean < 1 mm) or glacier cells that accumulate (not seasonal snow) */
export type RegionValue = { trend: RegTrend | null; coverage?: number; flag?: 'negligible' | 'glacier' };
export type RegionalView = {
  id: RegionalLayer; short: string; group: string; product: string; period: string; unit: string; grid: string; nature: string;
  stops: string[]; regions: Record<string, RegionValue>; synthetic: boolean; exploratory: boolean;
};

export function fromConfirmatory(id: 't2m' | 'precip', d: VariableData, cat: Catalog): RegionalView {
  const info = cat.variables.find((v) => v.id === id), L = LAYERS.find((l) => l.id === id)!;
  return {
    id, short: L.short, group: L.group, stops: L.stops, product: info?.product ?? id, period: info ? info.period.join('–') : '',
    unit: info?.trend_unit ?? '', grid: info?.grid ?? '', nature: info?.nature_label ?? '', synthetic: !!d.SYNTHETIC, exploratory: false,
    regions: Object.fromEntries(Object.entries(d.regions).map(([r, x]) => [r, { trend: x.trend ?? null }])),
  };
}

export function fromMultivar(id: Exclude<RegionalLayer, 't2m' | 'precip'>, m: MultiVar): RegionalView {
  const info = m.variables.find((v) => v.id === id), L = LAYERS.find((l) => l.id === id)!;
  return {
    id, short: L.short, group: L.group, stops: L.stops, product: info?.product ?? id, period: m.common_period.join('–'),
    unit: info?.trend_unit ?? '', grid: info?.grid ?? '', nature: info?.nature_label ?? '', synthetic: false, exploratory: true,
    regions: Object.fromEntries(Object.entries(m.regions).map(([r, x]) => {
      const s = x.series[id];
      return [r, { trend: s?.trend ?? null, coverage: x.coverage?.[id], flag: s?.negligible ? 'negligible' : s?.accumulating ? 'glacier' : undefined }];
    })),
  };
}

/** the value that gets a colour, or null (no result, not finite, or flagged) */
export const drawn = (v: RegionValue | undefined) => (v && !v.flag && v.trend && Number.isFinite(v.trend.slope_per_decade) ? v.trend.slope_per_decade : null);

/** fixed, symmetric colour domain of a layer: the largest drawn |trend| rounded up to one significant step (zero in the middle) */
export function domain(view: RegionalView) {
  const vals = Object.values(view.regions).map(drawn).filter((x): x is number => x != null).map(Math.abs);
  const m = Math.max(...vals, 1e-9), step = 10 ** Math.floor(Math.log10(m));
  return Math.ceil(m / step) * step;
}

/** colour of every region: published trend on the layer's diverging palette; null = left uncoloured */
export function fills(view: RegionalView): Record<string, string | null> {
  const D = domain(view);
  return Object.fromEntries(Object.entries(view.regions).map(([r, v]) => {
    const x = drawn(v);
    return [r, x == null ? null : `#${ramp(view.stops, (x / D + 1) / 2).getHexString()}`];
  }));
}

/** significant after adjusting for 16 regions: the published flag, or the published q below 0.05 */
export const adjustedSignificant = (t: RegTrend) => t.significant_after_fdr ?? (t.p_adjusted != null && t.p_adjusted < 0.05);

export const FLAG_TEXT = {
  negligible: 'negligible snow (mean below 1 mm)',
  glacier: 'glacier cells accumulate snow in GLDAS (not seasonal snow)',
} as const;

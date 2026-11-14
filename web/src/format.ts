// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Text formatting only. No statistic is computed here: every number comes from the pipeline JSON.
import type { Alt, Comparison, Sensitivity, Trend, VariableInfo, Verdict } from './types';

/** 2 decimals when |x| ≥ 0.01, otherwise 3 decimals. Typographic minus sign. */
export function num(x: number): string {
  const s = Math.abs(x) >= 0.01 || x === 0 ? x.toFixed(2) : x.toFixed(3);
  return s.replace('-', '−');
}

export const signed = (x: number) => (x > 0 && num(x) !== '0.00' ? '+' : '') + num(x);

export const pval = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);

/** A reference level such as a long-term mean, to 3 significant digits ("170", "8.61"). */
export const level = (x: number) => String(Number(x.toPrecision(3))).replace('-', '−');

export const VERDICT: Record<Verdict, string> = {
  significant_robust: 'Statistically significant, and robust to the method',
  method_dependent: 'Evidence depends on the method — interpret with caution',
  not_significant: 'No significant trend detected (this does not mean no change)',
};

export const VERDICT_SHORT: Record<Verdict, string> = {
  significant_robust: 'significant',
  method_dependent: 'method-dependent',
  not_significant: 'not significant',
};

/** Treatment of a region in the all-regions view (map + table): uses the FDR-adjusted result. */
export type MapStatus = 'fdr' | 'unadjusted' | 'ns';
export function mapStatus(t: Trend, alpha: number): MapStatus {
  if (t.significant_after_fdr) return 'fdr';
  return t.p_value < alpha ? 'unadjusted' : 'ns';
}
export const MAP_STATUS: Record<MapStatus, string> = {
  fdr: 'significant after adjusting for 16 regions',
  unadjusted: 'significant only before adjustment',
  ns: 'not significant',
};

const NATURE: Record<string, string> = {
  reanalysis: 'reanalysis',
  satellite_gauge: 'satellite + gauge estimate',
  model: 'model',
};

/** "MERRA-2 reanalysis" — first word of the product name plus the data nature. */
export const sourceShort = (v: VariableInfo) => `${v.product.split(' ')[0]} ${NATURE[v.nature] ?? v.nature}`;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Plain-language result sentence, built by template from pipeline numbers. */
export function sentence(v: VariableInfo, region: string, t: Trend): string {
  const y0 = t.start.slice(0, 4);
  const y1 = t.end.slice(0, 4);
  const ci = `95 % CI ${num(t.ci_low)} to ${num(t.ci_high)}`;
  const head = `Between ${y0} and ${y1}, ${lowerFirst(v.label)} (${sourceShort(v)}) in ${region}`;
  if (t.verdict === 'not_significant') {
    return `${head} changed by an estimated ${num(t.slope_per_decade)} ${v.trend_unit} (${ci}); the data cannot tell this apart from no trend.`;
  }
  const verb = t.slope_per_decade > 0 ? 'increased' : 'decreased';
  return `${head} ${verb} by ${num(Math.abs(t.slope_per_decade))} ${v.trend_unit} (${ci}).`;
}

export const WARNING: Record<string, (n_cells: number) => string> = {
  short_record: () => 'The record is short (fewer than 20 years), so the trend estimate is uncertain.',
  missing_months: () => 'Some months are missing from the record; they are shown as gaps.',
  resolution_limited: (n) =>
    `This region is covered by only ${n} grid cell${n === 1 ? '' : 's'}, so the data cannot resolve detail inside it.`,
  constant_series: () => 'The series does not vary, so a trend test is not meaningful.',
};

/** Plain-language explanations shown behind the "?" buttons (1–2 sentences each). */
export const GLOSSARY = {
  slope: 'How much the yearly average changes per decade, according to a straight line fitted through the yearly values.',
  ci: 'The range of trends that are compatible with the data under our method. It comes from a procedure that captures the true trend about 95 % of the time; it is not a 95 % probability about this particular interval.',
  p: 'How surprising a trend at least this large would be if there were really no trend. It is not the probability that the trend is real.',
  notsig: 'The data cannot tell this apart from no trend — not proof of no change.',
  uncertainty:
    'The uncertainty comes from natural year-to-year variability and the length of the record. Measurement error of the data product is not included.',
  fdr: 'Testing 16 regions at once makes some false alarms likely by chance. The adjusted p-value (Benjamini–Hochberg) accounts for that when you look across the map.',
  neff: 'Neighbouring years can resemble each other, so they carry less independent information than their count suggests; the effective number of years corrects for that.',
  reanalysis:
    'A reanalysis is a weather model that is continually corrected with observations (stations, balloons, satellites) to rebuild past weather on a regular grid. It is not a direct measurement.',
  satellite_gauge:
    'A satellite + gauge estimate combines rainfall seen by many satellites and adjusts it with rain-gauge totals measured on the ground.',
  model: 'Model output: values simulated by a computer model driven by observations, not measured directly.',
} as const;

/** Stored comparisons are "first|second" (alphabetical), series = first − second. Re-orient to A − B. */
export function orient(comparisons: Record<string, Comparison>, a: string, b: string): Comparison | undefined {
  const [first, second] = [a, b].sort();
  const c = comparisons[`${first}|${second}`];
  if (!c || first === a) return c;
  const flip = (x?: Alt): Alt | undefined =>
    x && {
      ...x,
      slope_per_decade: x.slope_per_decade == null ? undefined : -x.slope_per_decade,
      ci_low: x.ci_high == null ? undefined : -x.ci_high,
      ci_high: x.ci_low == null ? undefined : -x.ci_low,
    };
  const s: Sensitivity | undefined = c.sensitivity && {
    preregistered_monthly_ar1: flip(c.sensitivity.preregistered_monthly_ar1),
    first_revision_monthly_multilag: flip(c.sensitivity.first_revision_monthly_multilag),
  };
  return {
    ...c,
    slope_per_decade: -c.slope_per_decade,
    ci_low: -c.ci_high,
    ci_high: -c.ci_low,
    theil_sen_per_decade: -c.theil_sen_per_decade,
    sensitivity: s,
  };
}

/** "1980-01" -> Date at the middle of that month (UTC). */
export function monthDate(d: string): Date {
  return new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, 15));
}

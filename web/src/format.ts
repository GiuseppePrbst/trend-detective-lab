// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Text formatting only. No statistic is computed here: every number comes from the pipeline JSON.
import type { Comparison, Trend, VariableInfo, Verdict } from './types';

/** Slopes: 2 decimals, or 3 significant digits when |x| < 0.1. */
export function num(x: number): string {
  const s = x !== 0 && Math.abs(x) < 0.1 ? x.toPrecision(3) : x.toFixed(2);
  return s.replace('-', '−');
}

export const signed = (x: number) => (x > 0 ? '+' : '') + num(x);

export const pval = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);

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
  const size = `${num(Math.abs(t.slope_per_decade))} ${v.trend_unit}`;
  if (t.verdict === 'not_significant') {
    return `${head} changed by an estimated ${num(t.slope_per_decade)} ${v.trend_unit} (${ci}); this cannot be distinguished from no trend.`;
  }
  const verb = t.slope_per_decade > 0 ? 'increased' : 'decreased';
  return `${head} ${verb} by ${size} (${ci}).`;
}

export const WARNING: Record<string, (n_cells: number) => string> = {
  short_record: () => 'The record is short (fewer than 20 years), so the trend estimate is uncertain.',
  missing_months: () => 'Some months are missing from the record; they are shown as gaps.',
  resolution_limited: (n) =>
    `This region is covered by only ${n} grid cell${n === 1 ? '' : 's'}, so the data cannot resolve detail inside it.`,
  constant_series: () => 'The series does not vary, so a trend test is not meaningful.',
};

/** Stored comparisons are "first|second" (alphabetical), series = first − second. Re-orient to A − B. */
export function orient(comparisons: Record<string, Comparison>, a: string, b: string): Comparison | undefined {
  const [first, second] = [a, b].sort();
  const c = comparisons[`${first}|${second}`];
  if (!c || first === a) return c;
  return {
    ...c,
    slope_per_decade: -c.slope_per_decade,
    ci_low: -c.ci_high,
    ci_high: -c.ci_low,
    theil_sen_per_decade: -c.theil_sen_per_decade,
  };
}

/** "1980-01" -> Date at the middle of that month (UTC). */
export function monthDate(d: string): Date {
  return new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, 15));
}

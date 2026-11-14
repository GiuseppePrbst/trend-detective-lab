// SYNTHETIC FIXTURE — NOT NASA DATA. Dev-only (loaded with ?fixture=1 under `npm run dev`).
// Exists only to build the UI before/without the real pipeline output. Every object is labelled SYNTHETIC.
// All trend numbers below are invented placeholders, NOT results of any analysis.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.

const regions = [
  { id: 'antofagasta', name: 'Antofagasta', lat: [-21, -26], lon: [-70.5, -67.5] },
  { id: 'metropolitana-de-santiago', name: 'Metropolitana de Santiago', lat: [-32.9, -34.3], lon: [-71.7, -69.8] },
  { id: 'los-lagos', name: 'Los Lagos', lat: [-40.2, -44], lon: [-74, -71.6] },
  { id: 'magallanes', name: 'Magallanes', lat: [-48.5, -55.5], lon: [-75.5, -67] },
];

const regionsGeo = {
  SYNTHETIC: true,
  type: 'FeatureCollection',
  features: regions.map((r) => ({
    type: 'Feature',
    properties: { id: r.id, name: r.name },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [r.lon[0], r.lat[0]], [r.lon[1], r.lat[0]], [r.lon[1], r.lat[1]], [r.lon[0], r.lat[1]], [r.lon[0], r.lat[0]],
      ]],
    },
  })),
};

// Deterministic pseudo-random noise so the fixture is stable between reloads.
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 2;

function series(base: number, slopePerDecade: number, gapAt: number) {
  const dates: string[] = [], values: (number | null)[] = [], anomalies: (number | null)[] = [];
  const years: number[] = [], annual: number[] = [];
  for (let y = 1980; y <= 2025; y++) {
    const yearShift = 0.3 * rnd();
    for (let m = 1; m <= 12; m++) {
      const i = dates.length;
      const season = 5 * Math.cos(((m - 1) / 12) * 2 * Math.PI);
      const anom = slopePerDecade * ((i - 276) / 120) + yearShift + 0.5 * rnd();
      dates.push(`${y}-${String(m).padStart(2, '0')}`);
      const gap = i >= gapAt && i < gapAt + 4;
      values.push(gap ? null : +(base + season + anom).toFixed(3));
      anomalies.push(gap ? null : +anom.toFixed(3));
    }
    years.push(y);
    annual.push(+(slopePerDecade * ((y - 2002.5) / 10) + yearShift).toFixed(3)); // synthetic yearly values
  }
  return { dates, values, anomalies, annual: { years, anomalies: annual } };
}

function trend(s: number, lo: number, hi: number, p: number, verdict: string, fdr: boolean, warnings: string[]) {
  const alt = (k: number) => ({ slope_per_decade: s, ci_low: s - (s - lo) * k, ci_high: s + (hi - s) * k, p_value: p / (k * 3), n_eff: 300 });
  return {
    start: '1980-01', end: '2025-12', n_months: 548, n_years: 46, missing_share: 0.007, mean: 9.8, alpha: 0.05,
    method: 'annual_means_ols_ar1', slope_per_decade: s, ci_low: lo, ci_high: hi, p_value: p,
    n_years_used: 46, r1_annual: 0.12, n_eff_annual: 36, p_adjusted: Math.min(1, p * 2), significant_after_fdr: fdr,
    theil_sen_per_decade: s * 0.9, mk_p_value: Math.min(1, p * 1.5), verdict, direction: s > 0 ? 'increasing' : 'decreasing',
    r1: 0.41, n_eff: 231, acf_lags_used: 4, relative_pct_per_decade: null, warnings,
    sensitivity: { preregistered_monthly_ar1: alt(0.6), first_revision_monthly_multilag: alt(0.8) },
  };
}

const comparison = (s: number, lo: number, hi: number, p: number, differs: boolean, planned: boolean) => ({
  slope_per_decade: s, ci_low: lo, ci_high: hi, p_value: p, p_adjusted: Math.min(1, p * 3), planned,
  theil_sen_per_decade: s, mk_p_value: p, n_years_used: 46, r1_annual: 0.1, n_eff_annual: 40,
  verdict: differs ? 'significant_robust' : 'not_significant', differs, differs_after_fdr: differs && p * 3 < 0.05,
  sensitivity: { preregistered_monthly_ar1: { p_value: p / 3 }, first_revision_monthly_multilag: { p_value: p / 2 } },
});

const t2m = {
  SYNTHETIC: true,
  variable: 't2m',
  regions: {
    antofagasta: { n_cells: 40, ...series(17, 0.25, 100), trend: trend(0.25, 0.12, 0.38, 0.001, 'significant_robust', true, []) },
    'los-lagos': { n_cells: 36, ...series(9.8, 0.06, 300), trend: trend(0.06, -0.03, 0.15, 0.2, 'not_significant', false, ['missing_months']) },
    magallanes: { n_cells: 8, ...series(5, 0.12, 400), trend: trend(0.12, 0.01, 0.23, 0.03, 'method_dependent', false, ['resolution_limited']) },
  },
  comparisons: {
    'antofagasta|los-lagos': comparison(0.19, 0.05, 0.33, 0.008, true, true),
    'antofagasta|magallanes': comparison(0.13, -0.02, 0.28, 0.09, false, false),
    'los-lagos|magallanes': comparison(-0.06, -0.2, 0.08, 0.4, false, true),
  },
};

const variable = (id: string, label: string, unit: string, nature: string, natureLabel: string, product: string) => ({
  id, label, unit, trend_unit: `${unit} per decade`, nature, nature_label: natureLabel, product,
  definition: `SYNTHETIC placeholder definition of ${label.toLowerCase()}.`,
  version: '0.0', doi: '10.0000/SYNTHETIC', service: 'SYNTHETIC fixture (no service)', accessed: '2026-11-14',
  period: [1980, 2025], grid: 'SYNTHETIC', caveats: ['SYNTHETIC data: not an observation.'], citation: 'SYNTHETIC fixture, not citable.',
});

const catalog = {
  SYNTHETIC: true,
  generated_at: '2026-11-14T00:00:00Z',
  variables: [
    variable('t2m', 'Air temperature at 2 m', '°C', 'reanalysis', 'Reanalysis (SYNTHETIC)', 'MERRA-2 SYNTHETIC'),
    variable('precip', 'Precipitation', 'mm/month', 'satellite_gauge', 'Satellite + gauge (SYNTHETIC)', 'GPM SYNTHETIC'),
  ],
  regions: regions.map(({ id, name }) => ({ id, name })),
  guided: [
    { title: 'SYNTHETIC case: north vs south', question: 'Placeholder question.', lesson: 'SYNTHETIC lesson: the difference is significant.',
      variable: 't2m', a: 'los-lagos', b: 'antofagasta', preregistered: true },
    { title: 'SYNTHETIC case: one significant, one not', question: 'Placeholder question.', lesson: 'SYNTHETIC lesson: cannot tell apart.',
      variable: 't2m', a: 'los-lagos', b: 'magallanes', preregistered: true },
    { title: 'SYNTHETIC case: chosen afterwards', question: 'Unplanned pair.', lesson: 'SYNTHETIC lesson: adjusted p applies.',
      variable: 't2m', a: 'magallanes', b: 'antofagasta', preregistered: false },
    { title: 'SYNTHETIC case: missing variable', question: 'Precipitation file is absent on purpose.',
      variable: 'precip', a: 'los-lagos', b: 'magallanes', preregistered: true },
  ],
  method: {
    alpha: 0.05, main: 'SYNTHETIC method text.', robustness: 'SYNTHETIC robustness text.', comparison: 'SYNTHETIC comparison text.',
    multiple: 'SYNTHETIC multiple-testing text.', calibration: 'SYNTHETIC calibration text.',
    changes: ['SYNTHETIC change 1.', 'SYNTHETIC change 2.'], limitations: ['SYNTHETIC limitation.'],
  },
};

const validation = {
  SYNTHETIC: true,
  generated_at: '2026-11-14T00:00:00Z',
  checks: [
    { variable: 't2m', region: 'los-lagos', kind: 'station', independent: true, source: 'SYNTHETIC station', url: 'https://example.org',
      licence: 'SYNTHETIC', period: [1980, 2025], n_years: 44,
      ours: { slope_per_decade: 0.06, ci_low: -0.03, ci_high: 0.15, p_value: 0.2 },
      other: { slope_per_decade: 0.08, ci_low: -0.02, ci_high: 0.18, p_value: 0.12 },
      unit: '°C per decade', correlation_annual: 0.86, agreement: 'consistent', caveat: 'SYNTHETIC caveat.' },
    { variable: 't2m', region: 'los-lagos', kind: 'same_source', independent: false, source: 'SYNTHETIC same-source product',
      ours: { slope_per_decade: 0.06, ci_low: -0.03, ci_high: 0.15, p_value: 0.2 },
      other: { slope_per_decade: 0.05, ci_low: -0.04, ci_high: 0.14, p_value: 0.25 },
      unit: '°C per decade', correlation_annual: 0.99, agreement: 'consistent', caveat: 'SYNTHETIC caveat.' },
  ],
};

// precip.json is deliberately absent to exercise the "not available yet" state.
export const files: Record<string, unknown> = {
  'catalog.json': catalog,
  't2m.json': t2m,
  'regions.geojson': regionsGeo,
  'validation.json': validation,
};

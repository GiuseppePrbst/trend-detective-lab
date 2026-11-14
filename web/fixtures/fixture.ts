// SYNTHETIC FIXTURE — NOT NASA DATA. Dev-only (loaded with ?fixture=1 under `npm run dev`).
// Exists only to build the UI before the real pipeline output is ready. Every object is labelled SYNTHETIC.
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
  for (let y = 1980; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      const i = dates.length;
      const season = 5 * Math.cos(((m - 1) / 12) * 2 * Math.PI);
      const anom = slopePerDecade * ((i - 276) / 120) + 0.5 * rnd();
      dates.push(`${y}-${String(m).padStart(2, '0')}`);
      const gap = i >= gapAt && i < gapAt + 4;
      values.push(gap ? null : +(base + season + anom).toFixed(3));
      anomalies.push(gap ? null : +anom.toFixed(3));
    }
  }
  return { dates, values, anomalies };
}

// Trend numbers below are invented placeholders, NOT results of any analysis.
const t2mRegions = {
  antofagasta: { n_cells: 40, ...series(17, 0.05, 100), trend: trend(0.05, 0.01, 0.09, 0.02, 'significant_robust', []) },
  'los-lagos': { n_cells: 36, ...series(9.8, 0.12, 300), trend: trend(0.12, 0.05, 0.19, 0.001, 'method_dependent', ['missing_months']) },
  magallanes: { n_cells: 8, ...series(5, -0.03, 400), trend: trend(-0.03, -0.1, 0.04, 0.4, 'not_significant', ['resolution_limited']) },
};

function trend(s: number, lo: number, hi: number, p: number, verdict: string, warnings: string[]) {
  return {
    start: '1980-01', end: '2025-12', n_months: 548, n_years: 46, missing_share: 0.007, mean: 9.8,
    slope_per_decade: s, ci_low: lo, ci_high: hi, p_value: p, p_adjusted: Math.min(1, p * 2),
    r1: 0.41, n_eff: 231, theil_sen_per_decade: s * 0.9, mk_p_value: p * 1.5,
    verdict, direction: s > 0 ? 'increasing' : 'decreasing', relative_pct_per_decade: null, warnings,
  };
}

const comparison = (s: number, lo: number, hi: number, p: number, differs: boolean) => ({
  slope_per_decade: s, ci_low: lo, ci_high: hi, p_value: p, theil_sen_per_decade: s, mk_p_value: p,
  r1: 0.3, n_eff: 300, verdict: differs ? 'significant_robust' : 'not_significant', differs,
});

const t2m = {
  SYNTHETIC: true,
  variable: 't2m',
  regions: t2mRegions,
  comparisons: {
    'antofagasta|los-lagos': comparison(-0.07, -0.13, -0.01, 0.02, true),
    'antofagasta|magallanes': comparison(0.08, -0.01, 0.17, 0.08, false),
    'los-lagos|magallanes': comparison(0.15, 0.06, 0.24, 0.001, true),
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
    { title: 'SYNTHETIC case: south vs north', question: 'Placeholder question.', variable: 't2m', a: 'los-lagos', b: 'antofagasta' },
    { title: 'SYNTHETIC case: missing variable', question: 'Precipitation file is absent on purpose.', variable: 'precip', a: 'los-lagos', b: 'magallanes' },
  ],
  method: {
    main: 'SYNTHETIC method text.', robustness: 'SYNTHETIC robustness text.', comparison: 'SYNTHETIC comparison text.',
    multiple: 'SYNTHETIC multiple-testing text.', alpha: 0.05, limitations: ['SYNTHETIC limitation.'],
  },
};

// precip.json is deliberately absent to exercise the "not available yet" state.
export const files: Record<string, unknown> = {
  'catalog.json': catalog,
  't2m.json': t2m,
  'regions.geojson': regionsGeo,
};

// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Shapes of the files written by the Python pipeline (see docs/data-contract.md).
import type { FeatureCollection } from 'geojson';

export type Verdict = 'significant_robust' | 'method_dependent' | 'not_significant';

export interface VariableInfo {
  id: string;
  label: string;
  definition: string;
  unit: string;
  trend_unit: string;
  nature: 'reanalysis' | 'satellite_gauge' | 'model' | string;
  nature_label: string;
  product: string;
  version: string;
  doi: string;
  service: string;
  accessed: string;
  period: [number, number];
  grid: string;
  caveats: string[];
  citation: string;
}

export interface GuidedCase {
  title: string;
  question: string;
  lesson?: string;
  variable: string;
  a: string;
  b: string;
  preregistered?: boolean;
}

export interface Catalog {
  SYNTHETIC?: boolean;
  generated_at: string;
  variables: VariableInfo[];
  regions: { id: string; name: string }[];
  guided: GuidedCase[];
  method: {
    main: string;
    robustness: string;
    comparison: string;
    multiple?: string;
    calibration?: string;
    changes?: string[];
    alpha: number;
    limitations: string[];
  };
}

/** Result of one alternative method (sensitivity analysis). Fields may be partial for comparisons. */
export interface Alt {
  slope_per_decade?: number;
  ci_low?: number;
  ci_high?: number;
  p_value: number;
  n_eff?: number;
}

export interface Sensitivity {
  preregistered_monthly_ar1?: Alt;
  first_revision_monthly_multilag?: Alt;
}

export interface Trend {
  start: string;
  end: string;
  n_months: number;
  n_years: number;
  missing_share: number;
  mean: number;
  alpha?: number;
  method?: string;
  slope_per_decade: number;
  ci_low: number;
  ci_high: number;
  p_value: number;
  n_years_used?: number;
  r1_annual?: number;
  n_eff_annual?: number;
  p_adjusted?: number;
  significant_after_fdr?: boolean;
  theil_sen_per_decade: number;
  mk_p_value: number;
  verdict: Verdict;
  direction: 'increasing' | 'decreasing' | 'none';
  r1: number; // month-to-month persistence: diagnostic only
  n_eff: number;
  acf_lags_used?: number;
  relative_pct_per_decade: number | null;
  warnings: string[];
  sensitivity?: Sensitivity;
}

export interface RegionSeries {
  n_cells: number;
  dates: string[];
  values: (number | null)[];
  anomalies: (number | null)[];
  climatology: (number | null)[];
  annual?: { years: number[]; anomalies: (number | null)[] };
  trend: Trend;
}

export interface Comparison {
  slope_per_decade: number;
  ci_low: number;
  ci_high: number;
  p_value: number;
  p_adjusted?: number;
  planned?: boolean;
  theil_sen_per_decade: number;
  mk_p_value: number;
  n_years_used?: number;
  r1_annual?: number;
  n_eff_annual?: number;
  verdict: Verdict;
  differs: boolean;
  differs_after_fdr?: boolean;
  sensitivity?: Sensitivity;
}

export interface VariableData {
  SYNTHETIC?: boolean;
  variable: string;
  regions: Record<string, RegionSeries>;
  comparisons: Record<string, Comparison>;
}

export interface Check {
  variable: string;
  region: string;
  kind: 'station' | 'other_reanalysis' | 'same_source' | string;
  independent: boolean;
  source: string;
  url?: string;
  licence?: string;
  period?: [number, number];
  n_years?: number;
  ours: Alt;
  other: Alt;
  unit: string;
  correlation_annual?: number;
  agreement: 'consistent' | 'partly' | 'inconsistent' | string;
  caveat?: string;
}

export interface Validation {
  SYNTHETIC?: boolean;
  generated_at?: string;
  checks: Check[];
}

export type Regions = FeatureCollection & { SYNTHETIC?: boolean };

// ---- Multivariable lab (exploratory; written by pipeline/multivar.py) ----
export interface MVTrend {
  slope_per_decade: number;
  ci_low: number;
  ci_high: number;
  p_value: number;
  p_adjusted?: number;
  theil_sen_per_decade: number;
  mk_p_value: number;
  verdict: Verdict;
  n_years_used: number;
  n_eff_annual: number;
  start: string;
  end: string;
  mean: number;
}

export interface MVSeries {
  trend: MVTrend;
  annual: { years: number[]; anomalies: (number | null)[] };
  negligible: boolean;
}

export interface Assoc {
  computable: boolean;
  n_years: number;
  r: number;
  ci_low: number;
  ci_high: number;
  p_value: number;
  p_adjusted?: number;
  n_eff: number;
  r_not_detrended: number;
  lag_r_monthly: Record<string, number | null>;
  years: number[];
  x_detrended: number[];
  y_detrended: number[];
  negligible_snow?: boolean;
}

export interface MVVariable {
  id: string;
  label: string;
  unit: string;
  trend_unit: string;
  definition: string;
  product: string;
  version: string;
  doi: string;
  grid: string;
  nature_label: string;
  citation: string;
}

export interface MVGuided {
  title: string;
  question: string;
  region: string;
  x: string;
  y: string;
  lesson: string;
}

export interface CoastInterior {
  n_coastal: number;
  n_interior: number;
  rule: string;
  coastal: MVTrend;
  interior: MVTrend;
  difference: MVTrend;
  differs: boolean;
}

export interface MultiVar {
  generated_at: string;
  status: string;
  common_period: [number, number];
  variables: MVVariable[];
  reference: Record<string, { label: string; unit: string; trend_unit: string }>;
  pairs: [string, string][];
  families: Record<string, number>;
  notes: string[];
  guided?: MVGuided[];
  regions: Record<string, { series: Record<string, MVSeries>; associations: Record<string, Assoc>; coverage?: Record<string, number> }>;
  coast_interior: CoastInterior;
}

export interface CellMap {
  variable: string;
  dlat: number;
  dlon: number;
  start: number;
  end: number;
  n_cells: number;
  cells: number[][]; // lat, lon, slope, ci_low, ci_high, p, q (descriptive)
}

export interface WindowEntry {
  label: string;
  start: number;
  end: number;
  regions: Record<string, { trend: Trend; climatology: number[]; annual: { years: number[]; anomalies: (number | null)[] } }>;
}
export type Windows = Record<string, Record<string, WindowEntry>>;

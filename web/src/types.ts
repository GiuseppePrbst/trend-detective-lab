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

export interface Catalog {
  SYNTHETIC?: boolean;
  generated_at: string;
  variables: VariableInfo[];
  regions: { id: string; name: string }[];
  guided: { title: string; question: string; variable: string; a: string; b: string }[];
  method: {
    main: string;
    robustness: string;
    comparison: string;
    multiple?: string;
    alpha: number;
    limitations: string[];
  };
}

export interface Trend {
  start: string;
  end: string;
  n_months: number;
  n_years: number;
  missing_share: number;
  mean: number;
  slope_per_decade: number;
  ci_low: number;
  ci_high: number;
  p_value: number;
  p_adjusted?: number;
  r1: number;
  n_eff: number;
  theil_sen_per_decade: number;
  mk_p_value: number;
  verdict: Verdict;
  direction: 'increasing' | 'decreasing' | 'none';
  relative_pct_per_decade: number | null;
  warnings: string[];
}

export interface RegionSeries {
  n_cells: number;
  dates: string[];
  values: (number | null)[];
  anomalies: (number | null)[];
  climatology: (number | null)[];
  trend: Trend;
}

export interface Comparison {
  slope_per_decade: number;
  ci_low: number;
  ci_high: number;
  p_value: number;
  theil_sen_per_decade: number;
  mk_p_value: number;
  r1: number;
  n_eff: number;
  verdict: Verdict;
  differs: boolean;
}

export interface VariableData {
  SYNTHETIC?: boolean;
  variable: string;
  regions: Record<string, RegionSeries>;
  comparisons: Record<string, Comparison>;
}

export type Regions = FeatureCollection & { SYNTHETIC?: boolean };

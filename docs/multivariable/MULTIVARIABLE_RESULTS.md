# Multivariable results (exploratory)

Generated 2026-11-14T15:31:08+00:00 by `python -m pipeline.multivar`. Do not edit by hand.

All results on this page are **exploratory** (families E1–E5 in `HYPOTHESES_AND_TEST_FAMILIES.md`, fixed before computing). GLDAS is a model driven partly by observed precipitation; its agreement with IMERG is not independent evidence.

Common period 2000–2024. Notes from the run: soilm_surface: not downloaded for arica-y-parinacota; evap: not downloaded for arica-y-parinacota; swe: not downloaded for arica-y-parinacota; soilm_surface: not downloaded for tarapaca; evap: not downloaded for tarapaca; swe: not downloaded for tarapaca; soilm_surface: not downloaded for antofagasta; evap: not downloaded for antofagasta; swe: not downloaded for antofagasta; soilm_surface: not downloaded for atacama; evap: not downloaded for atacama; swe: not downloaded for atacama; soilm_surface: not downloaded for coquimbo; evap: not downloaded for coquimbo; swe: not downloaded for coquimbo; soilm_surface: not downloaded for valparaiso; evap: not downloaded for valparaiso; swe: not downloaded for valparaiso; evap: not downloaded for metropolitana-de-santiago; swe: not downloaded for metropolitana-de-santiago; evap: not downloaded for o-higgins; swe: not downloaded for o-higgins; evap: not downloaded for maule; swe: not downloaded for maule; evap: not downloaded for nuble; swe: not downloaded for nuble; evap: not downloaded for bio-bio; swe: not downloaded for bio-bio; evap: not downloaded for la-araucania; swe: not downloaded for la-araucania; evap: not downloaded for los-rios; swe: not downloaded for los-rios; evap: not downloaded for los-lagos; swe: not downloaded for los-lagos; evap: not downloaded for aysen; swe: not downloaded for aysen; evap: not downloaded for magallanes; swe: not downloaded for magallanes.

## E1 · Trends, 2000–2024 (BH over all GLDAS trends together; precipitation and T2M shown for reference, not part of E1)

| Region | Precip. (mm/month/dec.) p | Root-zone SM (mm/dec.) p, q | Surface SM (mm/dec.) p, q | ET (mm/month/dec.) p, q | SWE (mm/dec.) p, q | T2M (°C/dec.) p |
|---|---|---|---|---|---|---|
| Arica y Parinacota | -0.356 p=0.715 | -2.924 p=0.024, q=0.045 | n/a | n/a | n/a | +0.454 p=0.002 |
| Tarapacá | +0.026 p=0.960 | +1.647 p=0.026, q=0.046 | n/a | n/a | n/a | +0.438 p=0.005 |
| Antofagasta | +0.191 p=0.856 | -0.885 p=0.032, q=0.052 | n/a | n/a | n/a | +0.480 p=0.004 |
| Atacama | +0.964 p=0.342 | -0.237 p=0.758, q=0.822 | n/a | n/a | n/a | +0.391 p=0.023 |
| Coquimbo | -1.926 p=0.264 | -11.408 p=0.041, q=0.058 | n/a | n/a | n/a | +0.405 p=0.006 |
| Valparaíso | -8.155 p=0.003 | -18.312 p=0.017, q=0.034 | n/a | n/a | n/a | +0.346 p=0.003 |
| Metropolitana de Santiago | -8.007 p=0.011 | -14.054 p=0.017, q=0.034 | -1.185 p=0.064, q=0.083 | n/a | n/a | +0.491 p=0.000 |
| O'Higgins | -12.337 p=0.003 | -12.916 p=0.076, q=0.094 | -1.036 p=0.036, q=0.055 | n/a | n/a | +0.330 p=0.004 |
| Maule | -13.742 p=0.008 | -16.836 p=0.008, q=0.020 | -1.084 p=0.012, q=0.029 | n/a | n/a | +0.300 p=0.011 |
| Ñuble | -18.626 p=0.004 | -19.316 p=0.000, q=0.001 | -1.260 p=0.000, q=0.001 | n/a | n/a | +0.401 p=0.003 |
| Bío-Bío | -19.575 p=0.001 | -37.425 p=0.000, q=0.000 | -1.510 p=0.000, q=0.000 | n/a | n/a | +0.407 p=0.002 |
| La Araucanía | -23.438 p=0.000 | -31.070 p=0.000, q=0.000 | -1.184 p=0.000, q=0.001 | n/a | n/a | +0.406 p=0.002 |
| Los Ríos | -32.168 p=0.000 | -29.008 p=0.000, q=0.002 | -0.950 p=0.002, q=0.006 | n/a | n/a | +0.325 p=0.014 |
| Los Lagos | -15.966 p=0.014 | -21.560 p=0.001, q=0.002 | -0.501 p=0.083, q=0.098 | n/a | n/a | +0.212 p=0.076 |
| Aysén | -8.636 p=0.044 | -7.077 p=0.098, q=0.111 | -0.072 p=0.882, q=0.882 | n/a | n/a | +0.181 p=0.281 |
| Magallanes | -11.667 p=0.007 | -6.271 p=0.042, q=0.058 | -0.082 p=0.816, q=0.849 | n/a | n/a | +0.132 p=0.380 |

## E2 · Year-to-year association (detrended yearly anomalies; r [95 % CI], p, q; BH over all pairs × regions)

| Region | precip – soilm_root | precip – soilm_surface | precip – evap | t2m – swe |
|---|---|---|---|---|
| Arica y Parinacota | +0.60 [+0.27, +0.81] p=0.001 q=0.004 n_eff=25 | n/a | n/a | n/a |
| Tarapacá | +0.50 [+0.13, +0.75] p=0.012 q=0.020 n_eff=25 | n/a | n/a | n/a |
| Antofagasta | +0.32 [-0.15, +0.68] p=0.170 q=0.184 n_eff=19 | n/a | n/a | n/a |
| Atacama | +0.63 [+0.26, +0.84] p=0.003 q=0.006 n_eff=20 | n/a | n/a | n/a |
| Coquimbo | +0.61 [+0.28, +0.81] p=0.001 q=0.004 n_eff=25 | n/a | n/a | n/a |
| Valparaíso | +0.81 [+0.60, +0.91] p=0.000 q=0.000 n_eff=25 | n/a | n/a | n/a |
| Metropolitana de Santiago | +0.85 [+0.68, +0.93] p=0.000 q=0.000 n_eff=25 | +0.79 [+0.58, +0.91] p=0.000 q=0.000 n_eff=25 | n/a | n/a |
| O'Higgins | +0.83 [+0.64, +0.92] p=0.000 q=0.000 n_eff=25 | +0.76 [+0.51, +0.89] p=0.000 q=0.000 n_eff=25 | n/a | n/a |
| Maule | +0.81 [+0.61, +0.91] p=0.000 q=0.000 n_eff=25 | +0.66 [+0.36, +0.84] p=0.000 q=0.001 n_eff=25 | n/a | n/a |
| Ñuble | +0.69 [+0.41, +0.85] p=0.000 q=0.001 n_eff=25 | +0.58 [+0.25, +0.80] p=0.002 q=0.005 n_eff=25 | n/a | n/a |
| Bío-Bío | +0.59 [+0.25, +0.80] p=0.002 q=0.005 n_eff=25 | +0.52 [+0.16, +0.76] p=0.007 q=0.014 n_eff=25 | n/a | n/a |
| La Araucanía | +0.45 [+0.07, +0.72] p=0.024 q=0.037 n_eff=25 | +0.42 [+0.03, +0.70] p=0.036 q=0.052 n_eff=25 | n/a | n/a |
| Los Ríos | +0.38 [-0.02, +0.68] p=0.060 q=0.074 n_eff=25 | +0.40 [+0.01, +0.69] p=0.046 q=0.059 n_eff=25 | n/a | n/a |
| Los Lagos | +0.42 [+0.03, +0.70] p=0.038 q=0.052 n_eff=25 | +0.45 [+0.07, +0.72] p=0.022 q=0.037 n_eff=25 | n/a | n/a |
| Aysén | +0.35 [-0.06, +0.65] p=0.090 q=0.101 n_eff=25 | +0.19 [-0.23, +0.54] p=0.375 q=0.390 n_eff=25 | n/a | n/a |
| Magallanes | +0.39 [-0.04, +0.70] p=0.072 q=0.085 n_eff=22 | +0.15 [-0.30, +0.54] p=0.512 q=0.512 n_eff=21 | n/a | n/a |

## E3 · Antofagasta, coastal vs interior MERRA-2 cells, 1980–2025 (single planned test)

Rule: coastal = MERRA-2 cell with land share < 0.99 (Natural Earth 10 m land, measured on the WGS84 ellipsoid in QGIS). Coastal cells: 10; interior cells: 41.

| Group | Trend (°C/decade) 95 % CI | p | Theil–Sen | MK p | Verdict |
|---|---|---|---|---|---|
| coastal | -0.027 (-0.189, +0.135) | 0.7300 | -0.079 | 0.4875 | not_significant |
| interior | +0.265 (+0.143, +0.387) | 0.0001 | +0.225 | 0.0004 | significant_robust |
| difference | -0.293 (-0.379, -0.206) | 0.0000 | -0.294 | 0.0000 | significant_robust |

## E4 · Cell maps (descriptive)

- t2m, 1980–2025: 419 native cells (0.5° × 0.625°); slope median +0.026, range -0.147 to +0.372; nominal p < 0.05 in 142 cells, adjusted (descriptive) < 0.05 in 123. Neighbouring cells are not independent.
- soilm_root, 2000–2024: 1441 native cells (0.25° × 0.25°); slope median -5.581, range -81.965 to +19.692; nominal p < 0.05 in 649 cells, adjusted (descriptive) < 0.05 in 492. Neighbouring cells are not independent.

## E5 · Time windows (sensitivity only)

| Variable | Window | Regions p < 0.05 | Regions q < 0.05 (BH within window) |
|---|---|---|---|
| t2m | Full record | 11 | 9 |
| t2m | WMO normal 1991–2020 | 12 | 11 |
| t2m | Common with soil-moisture data, 2000–2024 | 13 | 13 |
| precip | Full record | 4 | 1 |
| precip | Common with soil-moisture data, 2000–2024 | 11 | 10 |

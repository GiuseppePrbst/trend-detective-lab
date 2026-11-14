# Validation report

Generated 2026-11-14T12:18:00+00:00 by `python -m pipeline.validate` from the real data files. Variable: MERRA-2 2-m air temperature, 1980–2025.

## 1. Is lag-1 autocorrelation enough?

Residuals of the fitted trend. If the residuals behaved like an AR(1) process, the lag-2 autocorrelation would be close to r1². A large lag-12 value would mean seasonal structure left in the anomalies.

| Region | r1 | r2 | r1² | r12 |
|---|---|---|---|---|
| Arica y Parinacota | 0.49 | 0.49 | 0.24 | -0.01 |
| Tarapacá | 0.51 | 0.51 | 0.26 | 0.04 |
| Antofagasta | 0.33 | 0.34 | 0.11 | 0.02 |
| Atacama | 0.26 | 0.23 | 0.07 | 0.00 |
| Coquimbo | 0.26 | 0.19 | 0.07 | -0.00 |
| Valparaíso | 0.26 | 0.18 | 0.07 | -0.01 |
| Metropolitana de Santiago | 0.26 | 0.17 | 0.07 | -0.00 |
| O'Higgins | 0.27 | 0.18 | 0.07 | -0.05 |
| Maule | 0.27 | 0.19 | 0.08 | -0.08 |
| Ñuble | 0.29 | 0.18 | 0.09 | -0.07 |
| Bío-Bío | 0.28 | 0.19 | 0.08 | -0.03 |
| La Araucanía | 0.26 | 0.18 | 0.07 | 0.01 |
| Los Ríos | 0.24 | 0.17 | 0.06 | 0.02 |
| Los Lagos | 0.23 | 0.14 | 0.05 | -0.00 |
| Aysén | 0.27 | 0.13 | 0.07 | -0.01 |
| Magallanes | 0.31 | 0.16 | 0.10 | -0.03 |

Largest excess of r2 over r1²: 0.25.

**Finding and decision (2026-11-14).** In every region r2 is two to three times larger than r1²: the residuals keep more memory than an AR(1) model assumes (plausibly multi-month to interannual variability such as ENSO). An effective sample size based on r1 alone would make the test too optimistic: in our synthetic simulations with this kind of memory it produced 30–48 % false positives. We therefore replaced it with the general effective sample size n / (1 + 2 Σ (1 − k/n) ρ_k) over the leading positive autocorrelations, which is identical for a true AR(1) process and gave 8–9 % false positives in the same simulations (4–5 % for white noise and AR(1)). All results in the app use the corrected method. Lag-12 autocorrelation is negligible, so no seasonal structure is left in the anomalies.

## 2. Sensitivity to the start and end years

Slope in °C per decade (95 % CI) when two years are removed from either end.

| Region | 1980–2025 | 1982–2025 | 1980–2023 |
|---|---|---|---|
| Arica y Parinacota | +0.252 (+0.160, +0.345) * | +0.266 (+0.166, +0.366) * | +0.218 (+0.133, +0.303) * |
| Tarapacá | +0.195 (+0.092, +0.298) * | +0.211 (+0.100, +0.323) * | +0.155 (+0.061, +0.250) * |
| Antofagasta | +0.230 (+0.120, +0.340) * | +0.247 (+0.129, +0.366) * | +0.191 (+0.089, +0.293) * |
| Atacama | +0.117 (+0.004, +0.230) * | +0.136 (+0.014, +0.258) * | +0.086 (-0.023, +0.196)  |
| Coquimbo | +0.126 (+0.018, +0.235) * | +0.144 (+0.026, +0.262) * | +0.088 (-0.022, +0.198)  |
| Valparaíso | +0.059 (-0.036, +0.154)  | +0.078 (-0.025, +0.181)  | +0.031 (-0.071, +0.132)  |
| Metropolitana de Santiago | +0.129 (+0.019, +0.240) * | +0.156 (+0.037, +0.275) * | +0.101 (-0.018, +0.220)  |
| O'Higgins | +0.105 (+0.009, +0.201) * | +0.125 (+0.021, +0.229) * | +0.090 (-0.014, +0.194)  |
| Maule | +0.133 (+0.036, +0.230) * | +0.153 (+0.047, +0.258) * | +0.124 (+0.018, +0.230) * |
| Ñuble | +0.200 (+0.097, +0.302) * | +0.212 (+0.100, +0.323) * | +0.195 (+0.084, +0.307) * |
| Bío-Bío | +0.195 (+0.102, +0.288) * | +0.203 (+0.101, +0.304) * | +0.191 (+0.090, +0.292) * |
| La Araucanía | +0.168 (+0.074, +0.262) * | +0.172 (+0.070, +0.274) * | +0.163 (+0.062, +0.265) * |
| Los Ríos | +0.137 (+0.047, +0.228) * | +0.143 (+0.045, +0.242) * | +0.135 (+0.037, +0.233) * |
| Los Lagos | +0.048 (-0.033, +0.128)  | +0.063 (-0.024, +0.150)  | +0.049 (-0.038, +0.137)  |
| Aysén | +0.026 (-0.069, +0.121)  | +0.044 (-0.058, +0.147)  | +0.034 (-0.068, +0.137)  |
| Magallanes | +0.002 (-0.092, +0.096)  | +0.001 (-0.091, +0.092)  | +0.007 (-0.093, +0.107)  |

\* p < 0.05 with the main method.

## 3. Consistency with NASA POWER

NASA POWER re-serves MERRA-2 meteorology on the same grid, from the hourly collection. Agreement checks our download, unit conversion and area weighting. It is not an independent observation.

| Region | Months compared | Mean difference (°C) | Mean abs. difference (°C) | Correlation | Our slope 1981–2025 | POWER slope 1981–2025 |
|---|---|---|---|---|---|---|
| Los Lagos | 540 | -0.001 | 0.021 | 1.0000 | +0.055 | +0.056 |
| Antofagasta | 540 | +0.004 | 0.015 | 1.0000 | +0.240 | +0.240 |
| Magallanes | 540 | -0.001 | 0.018 | 1.0000 | -0.003 | -0.003 |

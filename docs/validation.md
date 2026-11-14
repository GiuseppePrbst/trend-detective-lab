# Validation report

Generated 2026-11-14T14:33:18+00:00 by `python -m pipeline.validate` from the real data files. Variable: MERRA-2 2-m air temperature, 1980–2025.

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
| Arica y Parinacota | +0.252 (+0.159, +0.345) * | +0.266 (+0.166, +0.366) * | +0.218 (+0.144, +0.292) * |
| Tarapacá | +0.195 (+0.081, +0.309) * | +0.211 (+0.089, +0.333) * | +0.155 (+0.070, +0.241) * |
| Antofagasta | +0.230 (+0.106, +0.354) * | +0.248 (+0.117, +0.378) * | +0.191 (+0.093, +0.288) * |
| Atacama | +0.117 (-0.012, +0.246)  | +0.136 (+0.001, +0.270) * | +0.086 (-0.027, +0.200)  |
| Coquimbo | +0.126 (+0.004, +0.248) * | +0.144 (+0.017, +0.272) * | +0.088 (-0.022, +0.198)  |
| Valparaíso | +0.059 (-0.045, +0.162)  | +0.078 (-0.030, +0.187)  | +0.031 (-0.071, +0.132)  |
| Metropolitana de Santiago | +0.129 (+0.008, +0.251) * | +0.156 (+0.031, +0.282) * | +0.101 (-0.022, +0.225)  |
| O'Higgins | +0.105 (+0.015, +0.195) * | +0.125 (+0.028, +0.222) * | +0.090 (-0.006, +0.187)  |
| Maule | +0.133 (+0.042, +0.224) * | +0.153 (+0.055, +0.251) * | +0.124 (+0.026, +0.222) * |
| Ñuble | +0.200 (+0.104, +0.295) * | +0.212 (+0.108, +0.316) * | +0.195 (+0.092, +0.299) * |
| Bío-Bío | +0.195 (+0.105, +0.285) * | +0.203 (+0.104, +0.301) * | +0.191 (+0.093, +0.289) * |
| La Araucanía | +0.168 (+0.074, +0.261) * | +0.172 (+0.070, +0.275) * | +0.163 (+0.061, +0.265) * |
| Los Ríos | +0.138 (+0.044, +0.231) * | +0.143 (+0.041, +0.245) * | +0.135 (+0.033, +0.237) * |
| Los Lagos | +0.048 (-0.042, +0.137)  | +0.063 (-0.032, +0.158)  | +0.050 (-0.048, +0.147)  |
| Aysén | +0.026 (-0.093, +0.144)  | +0.044 (-0.083, +0.172)  | +0.034 (-0.092, +0.161)  |
| Magallanes | +0.002 (-0.101, +0.105)  | +0.001 (-0.112, +0.113)  | +0.007 (-0.103, +0.117)  |

\* p < 0.05 with the main method.

## 3. Consistency with NASA POWER

NASA POWER re-serves MERRA-2 meteorology on the same grid, from the hourly collection. Agreement checks our download, unit conversion and area weighting. It is not an independent observation.

| Region | Months compared | Mean difference (°C) | Mean abs. difference (°C) | Correlation | Our slope 1981–2025 | POWER slope 1981–2025 |
|---|---|---|---|---|---|---|
| Los Lagos | 540 | -0.001 | 0.021 | 1.0000 | +0.055 | +0.056 |
| Antofagasta | 540 | +0.004 | 0.015 | 1.0000 | +0.240 | +0.240 |
| Magallanes | 540 | -0.001 | 0.018 | 1.0000 | -0.003 | -0.003 |

## 4. Spatial aggregation

The regional series is a weighted mean of native grid cells. The pipeline's weight is the planar area (in degrees²) of the part of the cell inside the region polygon, multiplied by cos(latitude of the cell centre). Here it is compared with the true geodesic area (WGS84 ellipsoid) of the same intersection. No raster is reprojected or resampled; polygons and cells are both in geographic coordinates (EPSG:4326), and areas are never measured in degrees without the latitude correction.

| Variable | Region | Cells | Cells fully inside | Largest difference in a cell's share of the region | Largest relative difference of one weight |
|---|---|---|---|---|---|
| t2m | los-lagos | 36 | 2 | 3.5e-05 | 0.39 % |
| t2m | antofagasta | 51 | 18 | 9.4e-06 | 0.19 % |
| t2m | magallanes | 118 | 1 | 2.2e-05 | 0.66 % |
| precip | los-lagos | 709 (sample of 237) | 118 | 2.3e-06 | 0.11 % |
| precip | antofagasta | 1228 (sample of 205) | 171 | 2.2e-06 | 0.07 % |
| precip | magallanes | 2611 (sample of 201) | 61 | 5.9e-06 | 0.19 % |

Geodesic area of the 16 polygons together: 754,585 km² (all polygons valid). The weights agree with true areas to better than 1 % per cell, and to about one part in ten thousand of a region.

What the weighting does **not** solve: with MERRA-2 most cells straddle the region border or the coast (for Los Lagos only 2 of 36 cells lie fully inside), and a coastal cell's value already mixes land and ocean. MERRA-2 does not mask the ocean. A regional mean of ~50 km cells is a coarse description of a region, not a high-resolution climate measurement. Months count only when at least 80 % of the region's weighted area has valid data; no month was excluded for either variable.

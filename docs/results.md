# Results

Generated 2026-11-14T14:18:21+00:00 by `python -m pipeline.build`. Do not edit by hand.

## Air temperature at 2 m — MERRA-2 M2IMNXASM v5.12.4, 1980–2025

Reanalysis (weather model + observations), not a direct measurement. Regions listed north to south. Slope in °C per decade.

Main test: least squares on yearly means of monthly anomalies, lag-1 effective sample size. The last two columns show the p-values of the two earlier monthly methods (pre-registered; first revision) for transparency.

| Region | Grid cells | Mean | Slope (95 % CI) | p | p (BH, 16 regions) | Effective years / years | Theil–Sen | MK p | Verdict | p pre-registered | p revision 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Arica y Parinacota | 13 | 11.67 | +0.252 (+0.159, +0.346) | 0.0000 | 0.0001 | 33 / 46 | +0.234 | 0.0000 | significant, robust | 0.0000 | 0.0000 |
| Tarapacá | 19 | 13.71 | +0.195 (+0.081, +0.310) | 0.0018 | 0.0047 | 26 / 46 | +0.172 | 0.0059 | significant, robust | 0.0000 | 0.0003 |
| Antofagasta | 51 | 12.51 | +0.230 (+0.106, +0.355) | 0.0008 | 0.0026 | 26 / 46 | +0.196 | 0.0021 | significant, robust | 0.0000 | 0.0001 |
| Atacama | 37 | 10.47 | +0.117 (-0.012, +0.246) | 0.0735 | 0.0979 | 30 / 46 | +0.094 | 0.1522 | not significant | 0.0017 | 0.0424 |
| Coquimbo | 24 | 12.00 | +0.126 (+0.004, +0.248) | 0.0435 | 0.0632 | 34 / 46 | +0.115 | 0.1217 | method-dependent | 0.0021 | 0.0231 |
| Valparaíso | 19 | 12.59 | +0.059 (-0.045, +0.162) | 0.2585 | 0.3182 | 36 / 46 | +0.052 | 0.3479 | not significant | 0.1321 | 0.2249 |
| Metropolitana de Santiago | 11 | 10.75 | +0.129 (+0.007, +0.251) | 0.0384 | 0.0614 | 35 / 46 | +0.121 | 0.0396 | significant, robust | 0.0061 | 0.0223 |
| O'Higgins | 12 | 12.43 | +0.105 (+0.015, +0.195) | 0.0227 | 0.0403 | 46 / 46 | +0.098 | 0.0231 | significant, robust | 0.0126 | 0.0319 |
| Maule | 18 | 11.85 | +0.133 (+0.042, +0.224) | 0.0051 | 0.0102 | 46 / 46 | +0.132 | 0.0106 | significant, robust | 0.0029 | 0.0076 |
| Ñuble | 10 | 12.34 | +0.200 (+0.104, +0.295) | 0.0001 | 0.0007 | 46 / 46 | +0.196 | 0.0001 | significant, robust | 0.0000 | 0.0002 |
| Bío-Bío | 20 | 11.23 | +0.195 (+0.105, +0.285) | 0.0001 | 0.0006 | 46 / 46 | +0.193 | 0.0001 | significant, robust | 0.0000 | 0.0000 |
| La Araucanía | 21 | 9.91 | +0.168 (+0.074, +0.261) | 0.0008 | 0.0026 | 46 / 46 | +0.165 | 0.0011 | significant, robust | 0.0001 | 0.0005 |
| Los Ríos | 11 | 9.64 | +0.137 (+0.044, +0.231) | 0.0048 | 0.0102 | 46 / 46 | +0.133 | 0.0076 | significant, robust | 0.0014 | 0.0031 |
| Los Lagos | 36 | 8.61 | +0.048 (-0.042, +0.137) | 0.2878 | 0.3289 | 45 / 46 | +0.042 | 0.4216 | not significant | 0.1983 | 0.2453 |
| Aysén | 72 | 5.04 | +0.026 (-0.093, +0.145) | 0.6627 | 0.7069 | 36 / 46 | +0.016 | 0.7639 | not significant | 0.5393 | 0.5942 |
| Magallanes | 118 | 4.34 | +0.002 (-0.101, +0.105) | 0.9692 | 0.9692 | 34 / 46 | -0.005 | 0.9225 | not significant | 0.9577 | 0.9671 |

Regions with p < 0.05: 11 of 16; still below 0.05 after Benjamini–Hochberg adjustment: 9. Pairwise differences: 53 of 120 significant and robust; 48 after adjustment across all pairs.

Guided (pre-chosen) comparisons:

- Difference antofagasta − los-lagos: +0.183 (+0.055, +0.310) °C per decade, p = 0.0064 (adjusted across all pairs: 0.0221) → trends differ.

## Precipitation — GPM IMERG Final Run GPM_3IMERGM v07, 1998–2024

Satellite estimate merged with rain gauges (IMERG Final Run). Regions listed north to south. Slope in mm/month per decade.

Main test: least squares on yearly means of monthly anomalies, lag-1 effective sample size. The last two columns show the p-values of the two earlier monthly methods (pre-registered; first revision) for transparency.

| Region | Grid cells | Mean | Slope (95 % CI) | p | p (BH, 16 regions) | Effective years / years | Theil–Sen | MK p | Verdict | p pre-registered | p revision 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Arica y Parinacota | 183 | 14.26 | -0.428 (-2.081, +1.225) | 0.5968 | 0.6366 | 24 / 27 | +0.130 | 0.9060 | not significant | 0.5886 | 0.5790 |
| Tarapacá | 417 | 7.07 | +0.374 (-0.620, +1.368) | 0.4437 | 0.5461 | 24 / 27 | +0.274 | 0.5536 | not significant | 0.3507 | 0.3553 |
| Antofagasta | 1228 | 7.32 | +0.571 (-1.491, +2.633) | 0.5491 | 0.6275 | 12 / 27 | +0.535 | 0.4957 | not significant | 0.1372 | 0.2502 |
| Atacama | 781 | 5.51 | +1.163 (-0.631, +2.957) | 0.1866 | 0.3152 | 17 / 27 | +1.231 | 0.1338 | not significant | 0.0205 | 0.0795 |
| Coquimbo | 454 | 13.01 | -0.600 (-3.788, +2.588) | 0.7018 | 0.7018 | 27 / 27 | -0.586 | 0.7387 | not significant | 0.6871 | 0.6801 |
| Valparaíso | 223 | 28.53 | -4.839 (-10.252, +0.573) | 0.0774 | 0.2476 | 26 / 27 | -5.012 | 0.1102 | not significant | 0.0441 | 0.0665 |
| Metropolitana de Santiago | 193 | 41.30 | -4.032 (-10.532, +2.468) | 0.2122 | 0.3152 | 25 / 27 | -4.979 | 0.2002 | not significant | 0.1400 | 0.1985 |
| O'Higgins | 201 | 56.19 | -6.625 (-15.951, +2.700) | 0.1543 | 0.3085 | 23 / 27 | -7.945 | 0.1173 | not significant | 0.0646 | 0.0646 |
| Maule | 358 | 74.36 | -6.955 (-18.853, +4.944) | 0.2364 | 0.3152 | 21 / 27 | -8.731 | 0.2507 | not significant | 0.0991 | 0.1522 |
| Ñuble | 171 | 94.89 | -10.977 (-25.552, +3.599) | 0.1311 | 0.2995 | 20 / 27 | -10.529 | 0.1311 | not significant | 0.0225 | 0.0513 |
| Bío-Bío | 324 | 98.29 | -12.976 (-25.030, -0.921) | 0.0361 | 0.2019 | 23 / 27 | -15.096 | 0.0338 | significant, robust | 0.0027 | 0.0027 |
| La Araucanía | 398 | 113.16 | -14.742 (-29.516, +0.033) | 0.0505 | 0.2019 | 21 / 27 | -17.270 | 0.0205 | method-dependent | 0.0023 | 0.0083 |
| Los Ríos | 243 | 146.25 | -20.877 (-40.771, -0.983) | 0.0409 | 0.2019 | 18 / 27 | -20.746 | 0.0279 | significant, robust | 0.0003 | 0.0012 |
| Los Lagos | 709 | 169.91 | -7.575 (-20.323, +5.172) | 0.2324 | 0.3152 | 27 / 27 | -6.209 | 0.3590 | not significant | 0.1122 | 0.1586 |
| Aysén | 1653 | 135.85 | -6.037 (-13.532, +1.458) | 0.1096 | 0.2924 | 27 / 27 | -4.435 | 0.2430 | not significant | 0.0647 | 0.0799 |
| Magallanes | 2611 | 111.02 | -12.245 (-19.111, -5.379) | 0.0014 | 0.0228 | 21 / 27 | -13.423 | 0.0010 | significant, robust | 0.0000 | 0.0000 |

Regions with p < 0.05: 3 of 16; still below 0.05 after Benjamini–Hochberg adjustment: 1. Pairwise differences: 30 of 120 significant and robust; 4 after adjustment across all pairs.

Guided (pre-chosen) comparisons:

- Difference los-lagos − magallanes: +4.670 (-10.036, +19.376) mm/month per decade, p = 0.5191 (adjusted across all pairs: 0.6017) → trends cannot be said to differ.
- Difference la-araucania − los-rios: +6.135 (-0.415, +12.685) mm/month per decade, p = 0.0642 (adjusted across all pairs: 0.1980) → trends cannot be said to differ.

# Results

Generated 2026-11-14T13:35:16+00:00 by `python -m pipeline.build`. Do not edit by hand.

## Air temperature at 2 m — MERRA-2 M2IMNXASM v5.12.4, 1980–2025

Reanalysis (weather model + observations), not a direct measurement. Regions listed north to south. Slope in °C per decade.

| Region | Grid cells | Mean | Slope (95 % CI) | p | p (BH-adjusted) | n_eff / n | Theil–Sen | MK p | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Arica y Parinacota | 13 | 11.67 | +0.252 (+0.160, +0.345) | 0.0000 | 0.0000 | 85 / 552 | +0.247 | 0.0000 | significant, robust |
| Tarapacá | 19 | 13.71 | +0.195 (+0.092, +0.298) | 0.0003 | 0.0011 | 73 / 552 | +0.187 | 0.0002 | significant, robust |
| Antofagasta | 51 | 12.51 | +0.230 (+0.120, +0.340) | 0.0001 | 0.0004 | 100 / 552 | +0.213 | 0.0001 | significant, robust |
| Atacama | 37 | 10.47 | +0.117 (+0.004, +0.230) | 0.0424 | 0.0565 | 136 / 552 | +0.095 | 0.0736 | method-dependent |
| Coquimbo | 24 | 12.00 | +0.126 (+0.018, +0.235) | 0.0231 | 0.0370 | 180 / 552 | +0.106 | 0.0448 | significant, robust |
| Valparaíso | 19 | 12.59 | +0.059 (-0.036, +0.154) | 0.2249 | 0.2768 | 211 / 552 | +0.053 | 0.2682 | not significant |
| Metropolitana de Santiago | 11 | 10.75 | +0.129 (+0.019, +0.240) | 0.0223 | 0.0370 | 227 / 552 | +0.128 | 0.0184 | significant, robust |
| O'Higgins | 12 | 12.43 | +0.105 (+0.009, +0.201) | 0.0319 | 0.0464 | 235 / 552 | +0.107 | 0.0155 | significant, robust |
| Maule | 18 | 11.85 | +0.133 (+0.036, +0.230) | 0.0076 | 0.0152 | 253 / 552 | +0.133 | 0.0032 | significant, robust |
| Ñuble | 10 | 12.34 | +0.200 (+0.097, +0.302) | 0.0002 | 0.0006 | 255 / 552 | +0.195 | 0.0001 | significant, robust |
| Bío-Bío | 20 | 11.23 | +0.195 (+0.102, +0.288) | 0.0000 | 0.0004 | 258 / 552 | +0.189 | 0.0000 | significant, robust |
| La Araucanía | 21 | 9.91 | +0.168 (+0.074, +0.262) | 0.0005 | 0.0014 | 272 / 552 | +0.158 | 0.0003 | significant, robust |
| Los Ríos | 11 | 9.64 | +0.137 (+0.047, +0.228) | 0.0031 | 0.0071 | 288 / 552 | +0.126 | 0.0036 | significant, robust |
| Los Lagos | 36 | 8.61 | +0.048 (-0.033, +0.128) | 0.2453 | 0.2804 | 280 / 552 | +0.045 | 0.2782 | not significant |
| Aysén | 72 | 5.04 | +0.026 (-0.069, +0.121) | 0.5942 | 0.6338 | 240 / 552 | +0.012 | 0.7988 | not significant |
| Magallanes | 118 | 4.34 | +0.002 (-0.092, +0.096) | 0.9671 | 0.9671 | 176 / 552 | +0.002 | 0.9564 | not significant |

- Difference antofagasta − los-lagos: +0.183 (+0.071, +0.294) °C per decade, p = 0.0014 → trends differ.
- Difference los-lagos − magallanes: +0.046 (-0.019, +0.110) °C per decade, p = 0.1665 → trends cannot be said to differ.

## Precipitation — GPM IMERG Final Run GPM_3IMERGM v07, 1998–2024

Satellite estimate merged with rain gauges (IMERG Final Run). Regions listed north to south. Slope in mm/month per decade.

| Region | Grid cells | Mean | Slope (95 % CI) | p | p (BH-adjusted) | n_eff / n | Theil–Sen | MK p | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| Arica y Parinacota | 183 | 14.26 | -0.427 (-1.943, +1.088) | 0.5790 | 0.6176 | 243 / 324 | +0.470 | 0.0153 | method-dependent |
| Tarapacá | 417 | 7.07 | +0.373 (-0.421, +1.168) | 0.3553 | 0.4061 | 237 / 324 | +0.282 | 0.1094 | not significant |
| Antofagasta | 1228 | 7.32 | +0.570 (-0.405, +1.546) | 0.2502 | 0.3079 | 181 / 324 | +0.340 | 0.3312 | not significant |
| Atacama | 781 | 5.51 | +1.162 (-0.138, +2.462) | 0.0795 | 0.1420 | 152 / 324 | +0.776 | 0.0008 | method-dependent |
| Coquimbo | 454 | 13.01 | -0.599 (-3.456, +2.258) | 0.6801 | 0.6801 | 246 / 324 | +0.123 | 0.7521 | not significant |
| Valparaíso | 223 | 28.53 | -4.833 (-9.997, +0.332) | 0.0665 | 0.1420 | 239 / 324 | -1.162 | 0.1339 | not significant |
| Metropolitana de Santiago | 193 | 41.30 | -4.026 (-10.177, +2.125) | 0.1985 | 0.2646 | 235 / 324 | -0.021 | 0.9891 | not significant |
| O'Higgins | 201 | 56.19 | -6.616 (-13.636, +0.404) | 0.0646 | 0.1420 | 324 / 324 | -1.606 | 0.2145 | not significant |
| Maule | 358 | 74.36 | -6.945 (-16.471, +2.581) | 0.1522 | 0.2307 | 234 / 324 | -2.018 | 0.3199 | not significant |
| Ñuble | 171 | 94.89 | -10.962 (-21.986, +0.062) | 0.0513 | 0.1420 | 230 / 324 | -3.595 | 0.2566 | not significant |
| Bío-Bío | 324 | 98.29 | -12.958 (-21.401, -4.515) | 0.0027 | 0.0146 | 324 / 324 | -6.085 | 0.0743 | method-dependent |
| La Araucanía | 398 | 113.16 | -14.722 (-25.607, -3.836) | 0.0083 | 0.0330 | 230 / 324 | -8.478 | 0.0552 | method-dependent |
| Los Ríos | 243 | 146.25 | -20.848 (-33.389, -8.308) | 0.0012 | 0.0097 | 239 / 324 | -13.422 | 0.0071 | significant, robust |
| Los Lagos | 709 | 169.91 | -7.565 (-18.104, +2.974) | 0.1586 | 0.2307 | 237 / 324 | -4.677 | 0.2360 | not significant |
| Aysén | 1653 | 135.85 | -6.029 (-12.781, +0.724) | 0.0799 | 0.1420 | 239 / 324 | -5.432 | 0.0679 | not significant |
| Magallanes | 2611 | 111.02 | -12.229 (-17.427, -7.030) | 0.0000 | 0.0001 | 139 / 324 | -11.103 | 0.0000 | significant, robust |

- Difference los-lagos − magallanes: +4.663 (-6.832, +16.159) mm/month per decade, p = 0.4249 → trends cannot be said to differ.

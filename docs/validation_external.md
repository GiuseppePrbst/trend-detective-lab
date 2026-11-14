# Independent checks

Generated 2026-11-14T19:55:03+00:00 by `python -m pipeline.validate_external`.

Agreement rule (fixed beforehand): *consistent* = intervals overlap and same conclusion; *partly* = intervals overlap, conclusions differ; *inconsistent* = intervals do not overlap or opposite significant signs.

| Variable | Region | Check | Our slope (95 % CI), p | Their slope (95 % CI), p | Yearly corr. | Years | Agreement |
|---|---|---|---|---|---|---|---|
| t2m | Los Lagos | Station (independent observation) | +0.045 (-0.049, +0.139), p = 0.342 | +0.026 (-0.057, +0.109), p = 0.536 | 0.83 | 45 | consistent |
| precip | Los Lagos | Station (independent observation) | -8.403 (-25.256, +8.450), p = 0.310 | -11.292 (-25.819, +3.235), p = 0.119 | 0.94 | 21 | consistent |
| t2m | Los Lagos | ERA5 (another reanalysis) | +0.064 (-0.034, +0.161), p = 0.193 | +0.073 (-0.018, +0.163), p = 0.113 | 0.90 | 46 | consistent |
| precip | Los Lagos | ERA5 (another reanalysis) | -3.937 (-18.111, +10.237), p = 0.572 | -1.799 (-22.005, +18.406), p = 0.856 | 0.90 | 27 | consistent |
| t2m | Antofagasta | Station (independent observation) | +0.222 (+0.099, +0.345), p = 0.001 | -0.088 (-0.250, +0.074), p = 0.275 | 0.38 | 45 | inconsistent |
| precip | Antofagasta | Station (independent observation) | -0.023 (-1.173, +1.127), p = 0.967 | +0.016 (-0.083, +0.114), p = 0.746 | 0.04 | 23 | consistent |
| t2m | Antofagasta | ERA5 (another reanalysis) | +0.282 (+0.160, +0.405), p < 0.001 | +0.278 (+0.187, +0.368), p < 0.001 | 0.83 | 46 | consistent |
| precip | Antofagasta | ERA5 (another reanalysis) | +0.150 (-1.216, +1.515), p = 0.818 | +0.150 (-0.949, +1.249), p = 0.781 | 0.14 | 27 | consistent |
| t2m | Magallanes | Station (independent observation) | -0.001 (-0.110, +0.107), p = 0.983 | +0.154 (+0.068, +0.240), p < 0.001 | 0.82 | 45 | partly |
| precip | Magallanes | Station (independent observation) | -10.560 (-18.183, -2.938), p = 0.010 | -3.200 (-6.559, +0.158), p = 0.061 | 0.27 | 22 | partly |
| t2m | Magallanes | ERA5 (another reanalysis) | +0.004 (-0.108, +0.117), p = 0.935 | +0.181 (+0.085, +0.277), p < 0.001 | 0.77 | 46 | partly |
| precip | Magallanes | ERA5 (another reanalysis) | -8.936 (-13.028, -4.845), p < 0.001 | +4.353 (-7.771, +16.478), p = 0.467 | 0.31 | 27 | partly |

Units: °C per decade (t2m), mm/month per decade (precip). 'Our' value is the regional mean for station checks and the mean of the same five grid points for ERA5 checks.

Sources: ERA5 (ECMWF reanalysis) at 5 grid points, compared with IMERG at the same points; ERA5 (ECMWF reanalysis) at 5 grid points, compared with MERRA-2 at the same points; Meteostat station 85442 (Antofagasta, -23.43°, -70.43°, 135 m); Meteostat station 85799 (Puerto Montt, -41.42°, -73.08°, 85 m); Meteostat station 85934 (Punta Arenas, -53.00°, -70.85°, 37 m).

Caveats: a station measures one place; a regional mean of ~50 km cells is something else. ERA5 and MERRA-2 are different reanalysis systems but assimilate many of the same observations. Agreement supports the result; it does not prove it.

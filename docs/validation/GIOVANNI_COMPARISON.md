# Comparison with NASA Giovanni area averages

Generated 2026-11-14T15:28:46+00:00 by `python -m pipeline.validate_giovanni`.

**What is compared.** Giovanni's *Time Series, Area-Averaged* service (ArAvTs) for MERRA-2 `M2IMNXASM` v5.12.4 `T2M`, 1980-01 to 2025-12, against the mean our pipeline computes from the same native cells downloaded one by one through the Giovanni time-series API. Giovanni offers no polygons for Chile's regions (its shape library has countries and major watersheds only), so each box below is a rectangle **inside** the region whose edges fall on MERRA-2 cell edges. Both sides therefore average exactly the same cells; the comparison tests download, unit conversion (K → °C), time handling, area weighting and the trend engine. It does **not** test our treatment of region borders, partial cells or coastal cells — those are checked against geodesic areas in `docs/validation.md` §4.

| Box | Bounding box (W,S,E,N) | Cells | Months | Max abs. difference (°C) | Mean difference (°C) | Trend, ours (°C/decade) | Trend, Giovanni series | p ours / Giovanni |
|---|---|---|---|---|---|---|---|---|
| Antofagasta (interior) | -70.3125,-24.25,-68.4375,-22.25 | 12 | 552 | 0.0003 | +0.0000 | +0.2199 (+0.072, +0.368) | +0.2199 (+0.072, +0.368) | 0.0056 / 0.0056 |
| Los Lagos | -73.4375,-42.25,-72.1875,-40.75 | 6 | 552 | 0.0003 | +0.0000 | +0.0695 (-0.019, +0.158) | +0.0695 (-0.019, +0.158) | 0.1206 / 0.1206 |
| Magallanes | -72.1875,-53.25,-70.3125,-51.75 | 9 | 552 | 0.0003 | -0.0000 | +0.0198 (-0.096, +0.136) | +0.0198 (-0.096, +0.136) | 0.7305 / 0.7304 |

Reproduce: the Giovanni requests below are the ones the web interface issues (`https://giovanni.gsfc.nasa.gov/giovanni/daac-bin/service_manager.pl?<query>`; an Earthdata login is required). The NetCDF results are cached in `data/external/giovanni/` (not committed).

- Antofagasta (interior): `service=ArAvTs&starttime=1980-01-01T00:00:00Z&endtime=2025-12-31T23:59:59Z&bbox=-70.3125,-24.25,-68.4375,-22.25&data=M2IMNXASM_5_12_4_T2M&portal=GIOVANNI&format=json`
- Los Lagos: `service=ArAvTs&starttime=1980-01-01T00:00:00Z&endtime=2025-12-31T23:59:59Z&bbox=-73.4375,-42.25,-72.1875,-40.75&data=M2IMNXASM_5_12_4_T2M&portal=GIOVANNI&format=json`
- Magallanes: `service=ArAvTs&starttime=1980-01-01T00:00:00Z&endtime=2025-12-31T23:59:59Z&bbox=-72.1875,-53.25,-70.3125,-51.75&data=M2IMNXASM_5_12_4_T2M&portal=GIOVANNI&format=json`

Giovanni's area average weights cells by cos(latitude) and includes cells whose centres fall inside the box; with edges on cell edges there is no ambiguity about which cells enter. Differences of the order of 0.001 °C are float32 rounding of the stored values.

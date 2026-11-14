# Territorial exploratory hypotheses

Written 2026-11-14 ~13:00 (UTC−03:00), before the DEM and land-cover attributes of any cell were computed.
**Honest caveat:** the MERRA-2 cell trends of Antofagasta (map E4) and the coastal/interior split (E3) had already been
seen. Everything here is exploratory; nothing is blind.

## Unit of analysis

The native climate cell (MERRA-2 0.5° × 0.625°; GLDAS 0.25°). DEM pixels and land-cover polygons only **describe** a
cell; they never add observations. One cell = one trend = one data point, and neighbouring cells are not independent.

## Questions and methods

| Id | Question | Method | Inference |
|---|---|---|---|
| T1 | Antofagasta: is the coast/interior contrast just elevation? | Compare coastal cells with **elevation-matched** interior cells: interior cells whose DEM mean elevation lies within the range of the coastal cells' DEM mean elevation. Trend of (mean coastal − mean matched interior), same main test | One test, exploratory |
| T2 | Antofagasta: continuous gradients | Cell trend vs DEM mean elevation and vs distance from the cell centre to the coastline; Spearman ρ; partial association by ranking the residuals of each on the other | Descriptive only (51 dependent cells) |
| T3 | Antofagasta: sensitivity of the coastal class | Repeat E3 with land-share thresholds 0.95 and 0.999 and with "centre within 30 km of the coast" | Sensitivity only |
| T4 | Los Lagos: do land cover and relief describe the cells with different soil-moisture and temperature trends? | Cell trend vs forest share, agriculture share, DEM mean elevation (GLDAS cells for soil moisture, MERRA-2 cells for temperature); Spearman ρ | Descriptive only |

No new p-value from T2–T4 is interpreted. T1 is the only test; it is reported with the E-family caveats.

## Data limits written in advance

- Land cover is a snapshot (CONAF catastro 2019 for Antofagasta, 2018 for Los Lagos). It describes the cell today,
  not over 1980–2025.
- The CIREN "ALOS PALSAR" DEM is the elevation model distributed by ASF with PALSAR radiometrically terrain-corrected
  products, re-referenced to mean sea level with EGM2008. Its 12.5 m pixel is a resampling; it is not an elevation
  measured by the PALSAR radar. It is processed at 100 m for cell statistics.
- Coast and elevation are correlated along northern Chile's escarpment; T1 tries to separate them, with few cells.

## Erratum (added 2026-11-14, ~14:30, after review; the table above is left as written)

T1 was called "elevation-matched". It is an **elevation-range-restricted comparison**: interior cells whose mean
elevation lies inside the coastal cells' range (169–1,601 m). Those 7 interior cells average 1,320 m against 959 m for the
10 coastal cells, so the groups are not at the same elevation. A stricter sensitivity was added afterwards (nearest-
elevation pairing, with replacement); it still leaves elevation gaps. Both are exploratory.

## T5 · Coastal sea-surface temperature off Antofagasta (registered 2026-11-14 ~14:50, before computing)

- **Question.** Did the coastal ocean off Antofagasta warm over the period it can be compared?
- **Data.** MODIS-Aqua night SST, 11 µm, monthly 9 km (`MODISA_L3m_NSST_Monthly_9km` R2019.0, OB.DAAC), area-averaged by NASA
  Giovanni (ArAvTs) over the box 71.5–70.5° W, 26–21.5° S (ocean within ~100 km of the coast). Period: complete years
  2003–2025. Second series: MERRA-2 open-water skin temperature (`M2TMNXOCN_5_12_4_TSKINWTR`), same box, same years.
- **Method.** Main trend test of the app (yearly means of monthly anomalies, lag-1 effective sample size). Descriptive
  comparison with the trend of the MERRA-2 coastal-cell air temperature over the same years.
- **Expected sign.** No strong expectation; a weak or no warming would be consistent with the coastal-cell result, a clear
  warming would not.
- **What would contradict "a cool ocean explains the coast".** SST warming similar to the interior air (~+0.27 °C/decade).
- **Family.** One test per SST series (2), exploratory; no correction claimed beyond reporting both.
- **Dependencies.** MERRA-2 prescribes its sea-surface temperature from satellite analyses, so MERRA-2 skin temperature and
  coastal air temperature share inputs; MODIS SST is an independent observation but 2003–2025 only.

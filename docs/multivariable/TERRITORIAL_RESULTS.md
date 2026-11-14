# Territorial results (exploratory)

Generated 2026-11-14T19:59:30+00:00 by `python -m pipeline.territory`. Do not edit by hand.

Unit of analysis: the native climate cell. DEM (CIREN, processed at 100 m) and CONAF land cover describe each cell; they add no climate observations. Hypotheses: `TERRITORIAL_EXPLORATORY_HYPOTHESES.md`.

## Antofagasta (51 MERRA-2 cells, T2M 1980–2025)

### T1 · Elevation-range-restricted comparison: coastal cells vs interior cells within the coastal elevation range (one exploratory test)

This is **not** cell-by-cell elevation matching: the selected interior cells are on average higher than the coastal cells.

Coastal cells: 10, DEM mean elevation 169–1601 m (average 959 m). Interior cells in the same elevation range: 7 (average 1320 m).

| Group | Trend (°C/decade), 95 % CI | p | Verdict |
|---|---|---|---|
| coastal | -0.027 (-0.189, +0.135) | 0.7300 | not_significant |
| range-restricted interior | +0.171 (-0.031, +0.372) | 0.0908 | not_significant |
| difference | -0.198 (-0.253, -0.143) | < 0.0001 | significant_robust |

Sensitivity (added after review): nearest-elevation pairing, 10 pairs using 5 distinct interior cells; mean elevation gap interior − coastal +221 m (largest 827 m). Mean paired difference trend -0.192 °C/decade (-0.279, -0.105), p = 0.0002.

### T2 · Continuous gradients (Spearman ρ across 51 dependent cells — descriptive, no p-values)

- trend vs DEM mean elevation: ρ = +0.78
- trend vs distance from the cell centre to the coast: ρ = +0.85
- elevation vs distance (collinearity): ρ = +0.90
- trend vs distance, removing elevation (rank partial): +0.53
- trend vs elevation, removing distance (rank partial): +0.08
- interior cells only, trend vs elevation: ρ = +0.60 (n = 41)

### T3 · Sensitivity of the coastal class (difference coastal − rest)

| Rule | Coastal / rest | Difference (°C/decade), 95 % CI | p |
|---|---|---|---|
| land share < 0.95 | 10 / 41 | -0.293 (-0.379, -0.206) | < 0.0001 |
| land share < 0.99 (E3) | 10 / 41 | -0.293 (-0.379, -0.206) | < 0.0001 |
| land share < 0.999 | 11 / 40 | -0.272 (-0.368, -0.176) | < 0.0001 |
| centre within 30 km of the coast | 10 / 41 | -0.293 (-0.379, -0.206) | < 0.0001 |

## Los Lagos (T4, descriptive)

### MERRA-2 T2M 1980–2025 — 36 cells

Mean land-cover shares of the cells (CONAF 2018): native forest 62%, plantation 1%, agriculture 7%, grassland shrubland 12%

| Cell attribute | Spearman ρ with the cell trend |
|---|---|
| elevation_mean | +0.57 (n = 36) |
| distance_to_coast_km | +0.67 (n = 36) |
| native_forest_share | -0.56 (n = 36) |
| plantation_share | +0.36 (n = 36) |
| agriculture_share | +0.29 (n = 36) |
| grassland_shrubland_share | +0.08 (n = 36) |
| snow_glacier_share | +0.43 (n = 36) |

### GLDAS root-zone soil moisture 2000–2024 — 103 cells

Mean land-cover shares of the cells (CONAF 2018): native forest 57%, plantation 2%, agriculture 9%, grassland shrubland 12%

| Cell attribute | Spearman ρ with the cell trend |
|---|---|
| elevation_mean | +0.53 (n = 103) |
| distance_to_coast_km | +0.15 (n = 103) |
| native_forest_share | +0.03 (n = 103) |
| plantation_share | -0.60 (n = 103) |
| agriculture_share | -0.54 (n = 103) |
| grassland_shrubland_share | -0.34 (n = 103) |
| snow_glacier_share | +0.66 (n = 103) |

Neighbouring cells share weather, so these correlations are not independent evidence; with 36 or 103 cells and several candidate attributes, any single ρ can be a coincidence. Land cover is a 2018 snapshot.

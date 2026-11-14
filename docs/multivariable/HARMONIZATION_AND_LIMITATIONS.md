# Temporal and spatial harmonization, and limitations

## Time

- All products are monthly. Each variable's monthly anomalies are computed against its own climatology over the period
  analysed; yearly means of those anomalies are the input of every test (the same rule as the main study: a year counts
  with at least 10 valid months).
- Multivariable comparisons use only the common years **2000–2024** (GLDAS starts in 2000; IMERG ends in 2024 in our
  download). T2M and precipitation trends shown next to GLDAS are recomputed for 2000–2024 so that periods match.
- Units: GLDAS soil moisture and snow water equivalent in kg m⁻² = mm of water; evapotranspiration kg m⁻² s⁻¹ ×
  86 400 × days in month = mm/month; IMERG mm/h × 24 × days = mm/month; MERRA-2 K − 273.15 = °C.
- Time-window selector (main app): full record; WMO normal 1991–2020 (T2M only); 2000–2024 (common with GLDAS). All
  windows are computed by the pipeline; a window is a sensitivity check, never a new claim.

## Space

- No product is resampled. Each regional mean is an area-weighted mean of that product's native cells (weight = area of
  the cell inside the region; `pipeline/fetch.region_cells`, checked against geodesic areas in `docs/validation.md` §4 and
  against the QGIS grid in `docs/gis/QGIS_WORKFLOW.md`).
- GLDAS has values on land only. A region is computed from its land cells; the share of the region's cell weight with
  data is stored as `coverage` in `multivar.json`, and a region would be skipped below 50 %.
- Cell maps show each product on its own grid (MERRA-2 0.5° × 0.625°, GLDAS 0.25°). Comparing a 50 km and a 25 km cell
  map is visual only; no pixel-by-pixel statistics are made across grids.

## Limitations

1. **GLDAS is a model** forced partly by observed precipitation. Its soil moisture agreeing with IMERG rainfall is partly
   built in; it is a consistency check of two estimates, not independent confirmation of drought.
2. Everything in the multivariable lab is **exploratory**. It was decided after the main results were known; the
   corrections cover only the families listed in `HYPOTHESES_AND_TEST_FAMILIES.md`.
3. Associations are correlations of detrended yearly anomalies. They say that two quantities vary together, not that one
   causes the other.
4. 25 years is short; the trend test's worst simulated false-positive rate at that length is about 10 %.
5. Cell maps: neighbouring cells are strongly dependent; outlined cells (p < 0.05) must not be counted as independent
   discoveries.
6. Snow: GLDAS snow water equivalent at 0.25° is a coarse model estimate. It is not glacier mass and not measured
   snowpack.
7. Vegetation (NDVI/EVI) and land cover are **not** integrated, so the chain rain → soil → vegetation stops at soil.

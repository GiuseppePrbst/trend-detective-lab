# Territorial refinement: DEM, land cover and climate cells

## Four scales, kept separate

| Scale | Value | What it is |
|---|---|---|
| Climate observation | MERRA-2 0.5° × 0.625° (~50 km); GLDAS 0.25° (~25 km) | The resolution of the NASA data. Nothing smaller is resolved. |
| Territorial characterisation | DEM 12.5 m pixels (processed at 100 m); CONAF catastro 1:50 000 (rasterised at 100 m) | Describes what lies inside each climate cell. |
| Statistical analysis | One native climate cell = one trend | Terrain and land cover never add climate observations (no pseudoreplication). |
| Visualisation | GMTED2010 relief (~450 m); cells drawn as their true boxes | Display only. |

A 12.5 m DEM does **not** turn MERRA-2 into a 12.5 m climate product.

## Sources

| Layer | Source | Version / date | Format, CRS | Notes |
|---|---|---|---|---|
| DEM "ALOS PALSAR", Antofagasta and Los Lagos | CIREN, via geoportal.cl (catalogue entries 35426, 35430) | Published 2016-04-22 | JPEG2000 16-bit, UTM 19S (EPSG:32719) and UTM 18S (EPSG:32718); RAR 149 MB and 66 MB | See metadata below |
| Land-use and vegetation catastro | CONAF, via IDE MINAGRI (`CBN_REG02_2019`, `cbn_10reg_2018`) | 2019 (Antofagasta), 2018 (Los Lagos) | Shapefile (shp, shx, dbf, prj, cpg all present); EPSG:32719 / 32718; RAR 792 MB and 945 MB | 16 724 and 159 146 polygons; scale 1:50 000 |
| Coastline | Natural Earth 10 m land | 5.x | Shapefile, EPSG:4326 | Public domain |
| Land-use change 2001–2023, Los Lagos (`cut_2001_2023_r10`) | CONAF / IDE MINAGRI | – | RAR 635 MB | Found; **not** downloaded or used |

Raw files stay in `data/gis_src/` (ignored by Git). Committed: per-cell tables (`data/processed/`) and the refined
GeoPackage (`qgis/layers_refined.gpkg`). CIREN- and CONAF-derived rasters are **not** published (redistribution not
confirmed); the published relief comes from USGS GMTED2010 (public domain). Decisions per resource: `DATA_LICENSES.md`.

## DEM metadata (from the CIREN record) and what it means

- Built by CIREN from the 12.5 m elevation model that Alaska Satellite Facility distributes with ALOS PALSAR
  radiometrically terrain-corrected (RTC) products. ASF documents that this DEM is **not** derived from PALSAR: it is an
  existing elevation model (SRTM-based for South America) resampled to 12.5 m to match the radar product. The 12.5 m
  pixel is therefore a resampling, not an independent 12.5 m measurement; the effective resolution is that of the source
  (~30 m).
- Heights converted by CIREN from ellipsoidal to mean-sea-level heights with the global geoid model EGM2008 (1″), then
  rounded to whole metres, 16-bit, clipped to the ODEPA regional boundary. CIREN states an approximate scale of 1:25 000.
- It is a surface model (radar/SRTM heights include vegetation and buildings to some degree), not a bare-earth DTM.
- No NoData value is declared: 0 marks pixels outside the region or at sea and is treated as NoData (true 0 m shoreline
  pixels are lost; negligible for 25–50 km cells).
- Artefacts: a few pixels above the highest summit (up to 8 191 m). Masked above 6 750 m (Antofagasta; Llullaillaco
  6 739 m) and 3 500 m (Los Lagos; Tronador 3 491 m): 18 and 6 pixels of 100 m.
- Processing: resampled by averaging to 100 m **in its own UTM grid** (no reprojection); slope (degrees) computed at
  100 m; multidirectional hillshade at 250 m for display.

For 25–50 km climate cells, Copernicus GLO-30 or NASADEM would give the same cell statistics; CIREN was used because it is
the national product requested by the team and its provenance is documented above.

## Land cover: CONAF → common classes

The mapping uses the text of `USO` (level 1) and `SUBUSO` (level 2), not the codes (`ID_SUBUSO` is inconsistent between
regions). Full table: `data/processed/landcover_crosswalk.csv` (46 USO/SUBUSO pairs, none unmapped).

| Common class | CONAF USO (and SUBUSO) |
|---|---|
| urban_industrial | Áreas Urbanas e Industriales (includes Minería Industrial) |
| agriculture | Terrenos Agrícolas |
| grassland_shrubland | Praderas y Matorrales |
| native_forest / plantation / mixed_forest | Bosques: Bosque Nativo / Plantación / Bosque Mixto |
| wetland | Humedales |
| bare | Áreas Desprovistas de Vegetación |
| snow_glacier | Nieves Eternas y Glaciares |
| water | Cuerpos de Agua |

The catastro is a snapshot (2019 / 2018). It describes the cells today, not over 1980–2025.

## Per-cell master table

`data/processed/cell_context_<pilot>_<dataset>.csv`, one row per native cell: cell id and geometry, native resolution,
true cell area (equal-area), share inside the region, DEM coverage, distance from the cell centre to the coast, elevation
mean / median / std / min / max, slope, shares of the cell in elevation bands (Antofagasta 0–500–1500–2500–3500 m+, Los
Lagos 0–200–500–1000–1500 m+, chosen for each relief), land-cover shares, land-cover year and coverage, and the cell trend
(slope, CI, p, descriptive q, period, method). Missing values stay empty.

## Spatial validation (`data/processed/cell_context_report.json`)

| Check | Result |
|---|---|
| CRS: DEM and catastro in the same UTM zone per pilot | yes (32719, 32718); the script stops otherwise |
| Land-cover shares sum to 1 in every cell with coverage | yes (tolerance 0.001) |
| Elevation-band shares sum to 1 in every cell with DEM data | yes (tolerance 0.001) |
| DEM coverage ≤ 1 | max 1.0007: UTM scale distortion (~0.1 %) between the 100 m pixel area and the true area |
| Catastro classes unmapped | none |
| MERRA-2 grid rebuilt in QGIS vs pipeline cells | 51 / 51 identical (Antofagasta) |
| Number of cells: Antofagasta MERRA-2 / Los Lagos MERRA-2 / Los Lagos GLDAS | 51 / 36 / 103 |

## Watersheds

Not added. DGA basins are the next step, but most central and southern basins are smaller than one MERRA-2 cell and many
are smaller than one GLDAS cell; their values would be the cell's, not the basin's. Only large basins (several native
cells) would be defensible units.

## Reproduce

```
"<QGIS>/bin/python-qgis.bat" qgis/build_layers.py
"<QGIS>/bin/python-qgis.bat" qgis/scripts/build_cell_context.py
uv run python -m pipeline.territory
"<QGIS>/bin/python-qgis.bat" qgis/scripts/export_territorial_maps.py
```

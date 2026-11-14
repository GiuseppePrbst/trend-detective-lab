# QGIS workflow, CRS and resolution, spatial validation

## Environment

QGIS 4.2.1 (GDAL 3.13.2, PROJ 9.8.1, GEOS 3.14.1; providers native, GDAL, GRASS, SAGA), run **headless** with
`python-qgis.bat` / `qgis_process`. The QGIS window on this computer had another person's project open, so nothing was
loaded into it; our project is a separate file.

```bat
D:\Programas\QGIS\bin\python-qgis.bat qgis\build_layers.py     :: geometry checks, cell grid, coastal classification
uv run python -m pipeline.multivar                              :: statistics (needs build_layers output)
D:\Programas\QGIS\bin\python-qgis.bat qgis\make_project.py      :: qgis/trend_detective_chile.qgz with styled layers
```

Every Processing call and its parameters are written to `qgis/processing_log.json`.

## Steps

| # | Operation | Algorithm / method | Output |
|---|---|---|---|
| 1 | Validity check of the 16 region polygons | `native:checkvalidity` (GEOS) | 16 valid, 0 invalid, 0 errors |
| 2 | Repair (no-op safeguard) | `native:fixgeometries` (structure method) | `layers.gpkg|regions` |
| 3 | MERRA-2 cell grid on the exact native cell edges (0.5° × 0.625°) | `native:creategrid` | in memory |
| 4 | Keep cells intersecting Antofagasta | `native:extractbylocation` (intersects) | 51 cells |
| 5 | Land share and region share of each cell | intersection with Natural Earth 10 m land and with the region; areas on the WGS84 ellipsoid (`QgsDistanceArea`) | `antofagasta_merra2_cells`, `data/weights/antofagasta_t2m_cells.csv` |
| 6 | Coastal / interior class | coastal = land share < 0.99 | 10 coastal, 41 interior |
| 7 | GLDAS model elevation to GeoTIFF | `gdal:translate` | context layer |
| 8 | Cell trend maps as polygons (true native boxes) | PyQGIS from `cells_*.json` | `cells_t2m`, `cells_soilm_root` in `layers.gpkg` |

## CRS and resolution

- All layers are in geographic coordinates, EPSG:4326, which is the native frame of every NASA grid used. Nothing is
  reprojected or resampled. Areas are always measured on the ellipsoid (never in square degrees without correction).
- Native grids: MERRA-2 0.5° × 0.625° (~50 km), IMERG 0.1° (~10 km), GLDAS 0.25° (~25 km). Regional means use each
  grid's own cells with area weights; cell maps draw each product on its own grid.
- The web map uses a Mercator projection for display only.

## Spatial validation

| Check | Result |
|---|---|
| Region polygons valid (GEOS) | 16 / 16 |
| QGIS-built MERRA-2 grid vs the pipeline's cell list for Antofagasta | 51 / 51 identical cell centres |
| Pipeline weights vs geodesic areas (pyproj, `docs/validation.md` §4) | < 1 % per cell |
| Pipeline regional averaging vs NASA Giovanni's area-averaging service, same cells (`docs/validation/GIOVANNI_COMPARISON.md`) | max. difference 0.0003 °C over 552 months, identical trends |
| GLDAS land coverage per region (share of cell weight with data) | 0.88 (Magallanes) to 1.00; stored in `multivar.json` |

## Sources of the layers

- geoBoundaries gbOpen CHL ADM1 (Runfola et al. 2020), CC BY 3.0 IGO.
- Natural Earth 10 m land, public domain (https://www.naturalearthdata.com). Not committed; downloaded by hand into `data/gis_src/`.
- GLDAS model elevation `GLDASp4_elevation_025d.nc4`, NASA LDAS, downloaded from https://ldas.gsfc.nasa.gov/sites/default/files/ldas/gldas/ELEV/GLDASp4_elevation_025d.nc4.

## Territorial refinement (v2)

`qgis/scripts/build_cell_context.py` (DEM + coastline + CONAF land cover per native cell),
`pipeline/territory.py` (exploratory analyses), `qgis/scripts/export_territorial_maps.py` (refined project
`qgis/trend_detective_chile_refined.qgz` with relative paths, and the maps in `docs/gis/maps/`). Details, sources and
checks: `docs/gis/TERRITORIAL_REFINEMENT.md`. The first project, `qgis/trend_detective_chile.qgz`, is kept unchanged.

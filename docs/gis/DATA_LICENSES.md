# Data provenance, licences and published derivatives

Updated 2026-11-14 (~17:00, UTC−03:00). Downloading, processing and redistributing are treated separately.

**Team decision (ProGarLabs, 2026-11-14):** the CIREN DEM and the CONAF catastro may be used in this project, with
attribution and links to the official records. This is a project decision based on the team's review of the portals; no
licence text was found in the records themselves (see "Use conditions found"). Accordingly, the project publishes
**derived maps and per-cell statistics** with credits, and does **not** republish the raw rasters, the shapefiles, or
full-resolution derived rasters. Anyone can rebuild everything from the official downloads with the scripts in `qgis/`.

## Inventory

| Resource | Holder / provider | Exact name, year / version | Scale or resolution | CRS | Download | Metadata | Use conditions found | Transformations here | Published derivatives | Scientific limits |
|---|---|---|---|---|---|---|---|---|---|---|
| DEM, Antofagasta | CIREN (Centro de Información de Recursos Naturales) | "DEM Alos Palsar Región de Antofagasta", published 2016-04-22 | 12.5 m pixel spacing (approx. scale 1:25 000 per CIREN); effective resolution of the ~30 m source | UTM 19S, EPSG:32719; heights above MSL via EGM2008 | [geoportal.cl download](https://geoportal.cl/geoportal/catalog/download/f77f1be6-3dfc-37ce-a689-3f72022d301f) | [record 35426](https://geoportal.cl/geoportal/catalog/35426/DEM%20Alos%20Palsar%20Regi%C3%B3n%20de%20Antofagasta) | ISO record `MD_LegalConstraints` empty; portal asks users to cite the providing institution | Averaged to 100 m in its own grid; spikes > 6 750 m masked (18 px); cell statistics; 250 m hillshade for maps | Antofagasta map (PNG/PDF, app image); per-cell elevation statistics | Derived from the ASF ALOS PALSAR RTC DEM (an SRTM-based model resampled to 12.5 m), not measured by PALSAR; surface model; whole metres |
| DEM, Los Lagos | CIREN | "DEM Alos Palsar Región de Los Lagos", 2016 | as above | UTM 18S, EPSG:32718 (CRS only in the `.prj` sidecar) | [geoportal.cl download](https://geoportal.cl/geoportal/catalog/download/bf3fb01f-3e1f-39c6-8fb4-98d31ccc6262) | [record 35430](https://geoportal.cl/geoportal/catalog/35430/dem-alos-palsar-region-de-los-lagos) | as above | as above; spikes > 3 500 m masked (6 px) | Los Lagos map; per-cell statistics | as above |
| Land-use catastro, Antofagasta | CONAF (Corporación Nacional Forestal), via IDE MINAGRI | `CBN_REG02_2019` (Catastro de los Recursos Vegetacionales y Uso de la Tierra), 2019 | 1:50 000 | UTM 19S, EPSG:32719 | [IDE MINAGRI](https://ide.minagri.gob.cl/wp-content/uploads/DESCARGAS/CAPAS/PLANIFICACION_CATASTRAL/CATASTRO_CONAF/CBN_REG02_2019.rar) | [IDE MINAGRI page](https://ide.minagri.gob.cl/descarga-de-capas-shp/planificacion-catastral/); [CONAF map service record 42565](https://geoportal.cl/geoportal/catalog/42565/servicio-web-de-mapas-usos-de-la-tierra-conaf) | No licence on the download page; bundled `.qmd` empty | USO/SUBUSO → 10 common classes (`data/processed/landcover_crosswalk.csv`); rasterised at 100 m; per-cell shares | Per-cell land-cover shares | Snapshot (2019), not 1980–2025 |
| Land-use catastro, Los Lagos | CONAF, via IDE MINAGRI | `cbn_10reg_2018`, 2018 | 1:50 000 | UTM 18S, EPSG:32718 | [IDE MINAGRI](https://ide.minagri.gob.cl/wp-content/uploads/DESCARGAS/CAPAS/PLANIFICACION_CATASTRAL/CATASTRO_CONAF/cbn_10reg_2018.rar) | as above | as above | as above | Los Lagos map (land cover shown at 250 m); per-cell shares | Snapshot (2018); GLDAS does not use it |
| Land-use change, Los Lagos 2001–2023 | CONAF, via IDE MINAGRI | `cut_2001_2023_r10` | – | – | [IDE MINAGRI](https://ide.minagri.gob.cl/wp-content/uploads/DESCARGAS/CAPAS/PLANIFICACION_CATASTRAL/CAMBIO_USO_TIERRA_CONAF/cut_2001_2023_r10.rar) (635 MB) | as above | – | **Not downloaded** | none | Future work |
| CIREN land-use map service (reference) | CIREN | Servicio web de mapas uso de la tierra | – | – | – | [record 42521](https://geoportal.cl/geoportal/catalog/42521/servicio-web-de-mapas-uso-de-la-tierra-ciren) | – | Not used | none | – |
| MERRA-2, IMERG, GLDAS-2.1 | NASA GMAO / GSFC, GES DISC | see README §12 (DOIs) | 0.5° × 0.625°, 0.1°, 0.25° | EPSG:4326 | Giovanni time-series API | DOIs | NASA open data; citation requested | Regional means, trends | All results | See README |
| GMTED2010 | USGS | 15″ mean elevation | ~450 m | EPSG:4326 | USGS EROS | doi:10.3133/ofr20111073 | Public domain | Clip + hillshade | 3D view heights and relief texture (web, 2 km mesh), QGIS 3D project terrain; fallback 2D relief (`qgis/terrain/*gmted2010*`) | Coarser |
| Natural Earth 10 m land | Natural Earth | 10 m land | 1:10 M | EPSG:4326 | naturalearthdata.com | – | Public domain | Coastline, land share | Maps, cell classes | Generalised coast |
| geoBoundaries CHL ADM1 | geoBoundaries (wmgeolab) | gbOpen | – | EPSG:4326 | GitHub release | doi:10.1371/journal.pone.0231866 | CC BY 3.0 IGO | Repaired geometries | Regions | – |
| ERA5 via Open-Meteo | ECMWF / Copernicus; Open-Meteo | ERA5 daily | 0.25° | – | Open-Meteo archive API | Hersbach et al. 2020 | Copernicus licence; Open-Meteo CC BY 4.0 | Monthly means, trends | Trends only | Partially dependent on MERRA-2 observations |
| Meteostat | Meteostat; national weather services | monthly station files | point | – | bulk.meteostat.net | – | CC BY-NC 4.0 | Trends on common months | Trends only | One point |

## Credits used on figures

- Antofagasta map: *Terrain context: CIREN DEM ALOS PALSAR (ASF ALOS PALSAR RTC-derived). Climate trends: NASA GMAO
  MERRA-2 / Giovanni. Boundaries: geoBoundaries; coastline: Natural Earth.* (no CONAF content)
- Los Lagos map: *Land-cover context: CONAF, Catastro de los Recursos Vegetacionales y Uso de la Tierra (2018). Terrain
  context: CIREN DEM ALOS PALSAR. Climate: NASA GLDAS-2.1 / Giovanni.*

## History note

An earlier revision (`092af38`) committed 250 m CIREN/CONAF display rasters; a later revision removed them while the
licence question was open. Under the team decision above no history rewrite is needed; the rasters are now generated
locally (`data/gis_src/derived/`, ignored) and only the maps are published.

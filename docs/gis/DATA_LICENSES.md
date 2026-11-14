# Data licences and redistribution decisions

Checked 2026-11-14 (~14:20, UTC−03:00). Downloading, processing and redistributing are treated separately.

| Resource | Terms found | Download / process | Redistribute raw or rasters | Redistribute per-cell statistics | Decision |
|---|---|---|---|---|---|
| NASA MERRA-2, GPM IMERG, GLDAS-2.1 (GES DISC, via Giovanni) | NASA Earth science data: open, no restrictions; citation requested (DOIs in README) | yes | yes (not needed; cache not committed) | yes | Published |
| CIREN "DEM ALOS PALSAR" (geoportal.cl 35426, 35430) | Record's `MD_LegalConstraints` is empty; the portal asks users to cite the providing institution. No licence found | yes (local) | **not confirmed** | Considered acceptable: cell means of 25–50 km cells with attribution; **human confirmation requested** | Rasters removed from the published revision; cell statistics kept |
| CONAF catastro (IDE MINAGRI `CBN_REG02_2019`, `cbn_10reg_2018`) | No licence on the download page; bundled metadata (.qmd) empty | yes (local) | **not confirmed** | As above (cell shares of land-cover classes) | Rasters/maps removed; cell shares kept |
| USGS GMTED2010, 15″ mean elevation | USGS data, public domain | yes | yes | yes | Used for all published relief (maps, `qgis/terrain/*gmted2010*`) |
| Natural Earth 10 m land | Public domain | yes | yes | yes | Used (coastline) |
| geoBoundaries gbOpen CHL ADM1 | CC BY 3.0 IGO | yes | yes, with attribution | yes | Published |
| ERA5 via Open-Meteo | Copernicus licence; Open-Meteo CC BY 4.0 | yes | not done (cache not committed) | yes, with attribution | Derived trends published |
| Meteostat | CC BY-NC 4.0 | yes | not done | trends only, attributed | Derived trends published (non-commercial project) |

## What was removed (this revision)

`qgis/terrain/{antofagasta,los-lagos}_{dem,hillshade,landcover}_250m.tif` (CIREN- and CONAF-derived display rasters),
the CIREN/CONAF-based versions of `docs/gis/maps/*` and `web/public/img/antofagasta_territorial.png`. They were replaced
by maps whose relief comes from GMTED2010 and whose only other content is NASA cells, geoBoundaries and Natural Earth.
The CIREN/CONAF rasters are now written to `data/gis_src/derived/` (ignored by Git) by `qgis/scripts/build_cell_context.py`.

## Needs a human decision

These files were published in commit `092af38` (merged to `main` through PR #3, 2026-11-14) and remain in the Git
history even after removal. Rewriting history requires a force push, which this project does not do without the team's
decision. Options: (a) ask CIREN and CONAF/MINAGRI for confirmation (likely sufficient, since both portals publish the
data for free download with attribution); (b) if they object, rewrite history with the team's agreement.

`qgis/layers_refined.gpkg` and `data/processed/cell_context_*.csv` contain per-cell statistics derived from CIREN and
CONAF (elevation summaries, land-cover shares) with attribution. Remove them as well if the providers do not allow
derived statistics.

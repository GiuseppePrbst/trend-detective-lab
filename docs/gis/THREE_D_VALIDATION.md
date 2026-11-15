# 3D view — scientific and visual validation (2026-11-15)

Automated checks: `tests/test_scene3d.py` (part of `uv run pytest`, run in CI).

| # | Check | How | Result |
|---|---|---|---|
| 1 | Cells in the right place | footprints = native box corners projected with GDAL/OSR to the scene UTM; places sampled on the same grid; SST box west of every air cell, its western half on sea pixels | pass (test) |
| 2 | Resolution unchanged | each footprint's side lengths equal 0.5° × 0.625° (MERRA-2) / 0.25° (GLDAS) within 2 % (sides, not bounding box: UTM grid convergence rotates the cells) | pass (test) |
| 3 | Slopes equal the JSON results | 1980–2025 per-cell slope and interval = `cells_t2m.json`; GLDAS = `cells_soilm_root.json` (±1e-4) | pass (test) |
| 4 | Boundaries georeferenced | geoBoundaries rasterised on the scene grid; visual match with the GMTED coastline in the textures | visual pass |
| 5 | Vertical units | metres above the geoid; z max 6,150 m (2 km means; Llullaillaco 6,739 m) and 2,972 m; tests assert ≤ the highest summit | pass (test) |
| 6 | Ocean is not terrain at 0 m | sea stored as −32768, drawn flat with ocean colour, hover says "no bathymetry"; sea share 10–60 % asserted | pass (test) |
| 7 | Layers coincide | heights, texture, sea mask and footprints share one UTM grid definition; CIREN vs GMTED inside the regions: median −1.0 / +0.2 m, r 0.998 / 0.993 (`TERRAIN_SOURCES.md`) | pass |
| 8 | Legend units | °C per decade / mm per decade + period + product + native resolution + exaggeration in every view | visual pass |
| 9 | Comparable colour scales | one fixed limit per scene for all periods (±0.7 °C/decade; ±50 mm/decade) | pass (code) |
| 10 | Exaggeration documented | selector and legend text; default 2×; 1× shot exported | pass |
| 11 | 1980–2025 vs 2003–2025 not confused | period in legend title and story box; SST only shown for 2003–2025; coastal flags and period set asserted against `territory.json` | pass (test) |
| 12 | CONAF = context, not cause | Los Lagos text: GLDAS does not use CONAF; location may explain the pattern | pass (text) |
| 13 | SST on the ocean | box masked with the Natural Earth sea mask in the browser; QGIS layer clipped to the sea | pass |
| 14 | Sources traceable | `scene.json.sources`, credits under the view, scripts named in the legend | pass |

**New per-cell values:** the 1980–2002 and 2003–2025 cell slopes are computed by `pipeline.scene3d` with the same engine
(`trend.analyze`); they are descriptive (no new test, no correction for multiple cells). The grouped coast/interior numbers
shown under the view are the existing T4 results.

**Visual checks done:** desktop (1400 px) and mobile (375 px) in the browser; every exported image opened and inspected;
2D maps before/after compared (`CARTOGRAPHIC_DESIGN.md`). QGIS project: reopened headless, 13 layers, none broken,
terrain scale 2.0, three period themes.

**Not verified:** the QGIS 3D map *view* (needs the desktop GUI); Qgis2threejs; rendering on a physical low-end phone (only
the 375 px emulation and software WebGL in headless Edge); CIREN/CONAF layers are local, so they appear as missing
layers in the project for anyone without those downloads.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.

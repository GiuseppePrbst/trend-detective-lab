# 3D terrain view — tools evaluated and architecture chosen

Prepared 2026-11-15 (submission day) for branch `feat/qgis-3d-cartography`. Goal: show where the native NASA cells sit on
the real terrain so the coast/interior result in Antofagasta can be *seen*, without adding data or changing any analysis.

## What was checked in the local environment (2026-11-15)

| Tool | Status found | Used? | Reason |
|---|---|---|---|
| QGIS 4.2.1 (headless PyQGIS, `python-qgis.bat`) | works | **yes** | builds `qgis/trend_detective_chile_3d.qgz`, exports the 2D maps |
| QGIS native 3D (`qgis._3d`) | module present: `Qgs3DMapSettings`, `QgsDemTerrainSettings`, `QgsRasterDemTerrainProvider` | **partly** | project terrain set (DEM, vertical scale 2×). Rendering a 3D view needs the desktop GUI/OpenGL; **not verified** headless |
| QGIS MCP (nkarasiak/qgis-mcp) | plugin installed in the QGIS 4 profile; QGIS desktop was not running | no | headless PyQGIS was enough; no time spent repairing an optional link |
| Qgis2threejs | **not installed** in the local QGIS 4 profile | no | installing means downloading a plugin; its behaviour on QGIS 4 was not verified. Left for later |
| QGIS skill package (qgis-* skills) | available in the agent session | no | not needed for this scope |
| frontend-design skill | not available in this session | no | — |
| Blender / BlenderGIS | Blender **not installed** (only an MCP bridge process) | no | — |
| CesiumJS | not installed | no | see below |
| MapLibre GL JS | not installed | no | see below |
| Three.js 0.187 (npm) | installed for this work | **yes** | static WebGL viewer loaded only when opened |
| Microsoft Edge headless + SwiftShader | works | **yes** | reproducible presentation shots from URLs (software WebGL) |

## Architectures compared

| | A. QGIS 3D + Qgis2threejs | B. MapLibre GL JS | C. CesiumJS | **Chosen: GDAL-built scene + Three.js** |
|---|---|---|---|---|
| Uses the GIS project | directly | no | no | the same sources and scripts (GDAL/OGR) |
| Hosting | static HTML export (if the plugin works on QGIS 4) | needs raster-dem tiles + a style | default terrain/imagery come from a hosted service that needs an access token; self-hosting needs a tiling step | 2.1 MB of static files on GitHub Pages |
| Fit with the React app | separate page | good | heavy | lazy-loaded React component, 140 kB gzip |
| Risk today | plugin not installed/unverified | tile pipeline to build | services, tokens, bundle size | low: everything is local and tested |

**Decision for this submission:** a small static scene per pilot (height grid + baked relief texture + cell footprints)
produced by `qgis/scripts/build_3d_terrain.py` and drawn with Three.js in `web/src/terrain3d.tsx`. The QGIS 3D project
is delivered alongside for desktop exploration. **Future option for international expansion:** CesiumJS with
self-hosted quantized-mesh terrain (or MapLibre with terrain-RGB tiles) so any region of the world can be opened without
per-region builds — after checking the terms, limits and costs of any hosted terrain or imagery.

## Data flow

```
pipeline.scene3d (uv)          data/scene3d/cells.json      per-cell trends: 51 MERRA-2 cells x 3 periods (same engine),
                                                             103 GLDAS cells (copied from cells_soilm_root.json)
build_3d_terrain.py (QGIS py)  web/public/scene3d/<scene>/  height.bin, relief.jpg, landcover.jpg (Los Lagos), sea.png, scene.json
                               data/scene3d/qa.json          sizes, spike count, CIREN-vs-GMTED comparison
build_3d_project.py (QGIS py)  qgis/trend_detective_chile_3d.qgz + qgis/layers_3d.gpkg
export_3d_views.py (Edge)      qgis/exports_3d/**.png        shots, each one a URL of the app (?embed=3d&...)
locator_globe.py (QGIS py)     docs/presentation/assets_3d/A_context_globe.png
```

The app keeps working without the 3D view: the section shows a button, Three.js is fetched only on click, and browsers
without WebGL get the 2D map instead. Rollback = remove the `TerrainSection` line in `App.tsx`.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.

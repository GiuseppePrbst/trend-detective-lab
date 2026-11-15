# 3D view — sizes and performance (2026-11-15)

| Item | Size |
|---|---|
| `terrain3d` JS chunk (Three.js + viewer), lazy | 557.6 kB minified, **140.5 kB gzip** — fetched only when "Open the 3D terrain view" is clicked |
| Main app chunk | 600.2 kB / 197.5 kB gzip (unchanged by the viewer apart from a few lines) |
| Antofagasta scene | height.bin 235 kB (330 × 356 vertices, 2 km), relief.jpg 481 kB (2063 × 2225), sea.png 26 kB, scene.json 50 kB |
| Los Lagos scene | height.bin 85 kB (171 × 249), relief.jpg 479 kB, landcover.jpg 658 kB (1368 × 1992), sea.png 28 kB, scene.json 67 kB |
| All scene files | 2.1 MB; one scene is loaded at a time (about 0.8–1.3 MB) |
| QGIS 3D project | `trend_detective_chile_3d.qgz` + `layers_3d.gpkg` (~190 kB) |
| Shots | `qgis/exports_3d/` 9 PNG, `docs/presentation/assets_3d/` 7 PNG (copies + globe) |

- Mesh: ≤ 117,480 vertices / ~234,000 triangles (Antofagasta); no original DEM is sent to the browser.
- Texture redraw on a toggle: one 2D-canvas composite of the base image + cell polygons (no reload).
- Rendering verified in headless Edge with **software** WebGL (SwiftShader), i.e. without a GPU — each 1400 × 1000 shot
  completes inside a 25 s virtual-time budget. On localhost all scene files load in < 15 ms (no network cost measured).
- Fallback: without WebGL the section shows the 2D map; if the scene files fail, an error line replaces the view and the
  rest of the app is unaffected.
- Not measured: load time on a slow mobile connection and frame rate on a physical low-end phone.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.

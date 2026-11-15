# Earth Atlas V2 — how data sits on the planet

*SI disclosure: written by an SI coding tool (Claude); pending team review.*

## Two representations, one pose

| | Geographic Explore (CesiumJS) | Scientific terrain (Three.js) |
| --- | --- | --- |
| When | Always; the only layer above ~2 900 km and wherever there is no relief scene | Below ~2 900 km inside Antofagasta or Los Lagos, if "3D relief up close" is on |
| Cells | One polygon per clipped footprint on the WGS84 ellipsoid (`Primitive` + `PolygonGeometry`, rhumb edges, per-instance colour). 154 cells, synchronous build | The same clipped footprints painted on the relief texture |
| Regions | Outlines (16) and, for the regional layers, one fill per region | — |
| SST | The sea part of the MUR box as a **study area**: dashed turquoise outline and an 8 % wash, 2003–2025 only; hover or click gives its one area-averaged trend from `sst.json` (before 2026-11-15 it was filled with the air-temperature colour at the cells' opacity, which read as a grey slab: `v2/sst_before.jpg` → `v2/sst_after.jpg`) | Not drawn (an ocean product is never draped on land relief) |
| Relief | None (no terrain service is used); the basemap's shaded relief is context | GMTED2010 2 km mesh, exaggeration declared in the panel |

Evaluated and not used: `GroundPrimitive` (classification needs asynchronous worker builds and gives nothing extra without a terrain provider — on the bare ellipsoid a polygon at height 0 is already on the surface); a Cesium terrain provider (would need a tile service or ion: the project uses no token and no paid service).

Both engines are driven by the same georeferenced pose (`engine/geo.ts`). The hand-over between them is a cross-fade by camera range of two drawings of the **same clipped cells in the same colours**, so nothing changes position or value.

## What removed the "flat, square sheet"

1. **Alpha mask**: the relief mesh is drawn only inside the region polygon (`paintMask`, `alphaTest`). The ocean of the scene and the grey block under it are no longer drawn; the Cesium ocean shows instead.
2. **Curvature**: every vertex drops by d²/2R (R = 6 371 km) from the tangent plane at the scene centre (`dropAt`). At 250 km from the centre that is 4.9 km.
3. **Camera**: the Three.js camera is placed in the local east-north-up frame *at the target*, whose vertical tilts by d/R with respect to the scene centre (`poseToLocal(..., radius)`), as the Cesium camera does on the ellipsoid.

Known residual: the scenes are in UTM (zones 19S and 18S). Grid north differs from true north by up to about 1.4° in Los Lagos; coast and relief can be a few pixels apart at the edges. The relief texture is the pipeline's hypsometric tint, not the basemap, so its colour differs from its surroundings.

## Clipping (display only)

`pipeline/atlas.py` → `web/public/data/atlas.json`:

- `cells[scene][i]` = native lon/lat box of cell *i* ∩ region polygon (geoBoundaries ADM1), as polygons with holes, same order as `scene.json`.
- `sst_sea` = SST box of `sst.json` − land of the 16 regions.
- Islands are kept: every part of the region's MultiPolygon takes part in the intersection.

The trend, interval and p-value of a cell are those of the whole native cell and live only in `scene.json`. A smaller drawn footprint does not mean the value was computed over that smaller area; the legend and the Methodology panel say so. The highest/lowest indicators use the same set of cells as before the clipping. For the regional fills, polygons smaller than about 0.08° across (islets of Aysén and Magallanes) are not tessellated; picking and outlines use the full geometry.

## Colour scales of the cells (2026-11-15)

One pure function, `web/src/engine/scale.ts` `createTrendScale`, gives the colour of every cell on the globe (Cesium) and on the relief (Three.js), and the legend's gradient and ticks (sampled from the same function). It changes colours only; every number in text is the published trend.

| Mode | Domain | Palette | When |
| --- | --- | --- | --- |
| **Spatial contrast** (default in Explore) | Linear, from the smallest to the largest trend of the cells drawn in the chosen window (cells without a value excluded; at least 0.1 °C or 2 mm per decade wide) | All positive: sequential warm (YlOrRd, starting at pale yellow, never the neutral white). All negative: sequential cool (Blues; soil moisture: BrBG brown half). Both signs: diverging, symmetric around zero (white = 0), ends at the largest absolute trend | Distinguishing cells within one window |
| **Fixed comparison** | Symmetric, the largest absolute trend over every window of the variable (±0.7 °C/decade for Antofagasta, ±50 mm/decade for Los Lagos) | Diverging RdBu (temperature) / BrBG (soil moisture) | Comparing windows; the film always uses it, and the hand-off keeps it |

The legend names the mode, the window and the unit, and in spatial mode warns: *"Colours are not directly comparable between periods because each period has its own scale."* Selector "Colour scale" in the left panel; `?scale=spatial|fixed` in the URL.

Antofagasta 2003–2025: cell trends +0.12 to +0.64 °C/decade. On the fixed ±0.7 scale they all fell in the pale half of the red side (`v2/scale_2003_fixed.jpg`); the spatial scale spans the whole warm palette (`v2/scale_2003_spatial.jpg`, also `_1366`, `_390`). Other windows: `v2/scale_1980_2025_spatial.jpg` (−0.14 to +0.37, diverging ±0.37), `v2/scale_1980_2002_spatial.jpg` (±0.55); Los Lagos `v2/scale_los_lagos_spatial.jpg` (−48 to +0.9 mm/decade, diverging ±48, close to the fixed ±50). Tests: vitest "cell colour scales" (monotonic, sign, zero, real min/max, no data excluded, fixed stable across windows) and smoke check 20.

The Research Lab's 3D view (`terrain3d.tsx`) and the 16-region choropleths keep their existing fixed scales.

## Markers

Flags, places, study pins and extremes are HTML elements carrying `data-lon` / `data-lat`. Each frame the stage projects them (on the relief when it is visible, else on the ellipsoid), hides those behind the planet or outside their scale range, and hides the names — not the icons — of those that collide with a higher-priority marker (order: flags, extremes, studies, places).

## Flights

`planFlight` / `flightPose` (`cinematic/timeline.ts`): longitude, latitude, heading and pitch move with one ease; range follows the same ease plus an arc whose top is about 2.2 × the ground distance (capped at 9 000 km), with the camera tilting towards the vertical at the top. Duration 2.4–7 s by distance. Antofagasta ↔ Los Lagos (about 2 000 km) tops out near 4 400 km, where both reliefs are faded out; the destination's relief replaces the origin's there, so only one relief is in memory and none pops in. The flight is a pure function of its progress; it is frame-rate independent; pointer, wheel and Escape cancel it; reduced motion makes it instant.

## Not measured

Frame rate, GPU memory and load time were not profiled. `preserveDrawingBuffer` stays on in both engines (the film capture needs it); its cost in production was not measured.

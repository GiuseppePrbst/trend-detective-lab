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

## Markers

Flags, places, study pins and extremes are HTML elements carrying `data-lon` / `data-lat`. Each frame the stage projects them (on the relief when it is visible, else on the ellipsoid), hides those behind the planet or outside their scale range, and hides the names — not the icons — of those that collide with a higher-priority marker (order: flags, extremes, studies, places).

## Flights

`planFlight` / `flightPose` (`cinematic/timeline.ts`): longitude, latitude, heading and pitch move with one ease; range follows the same ease plus an arc whose top is about 2.2 × the ground distance (capped at 9 000 km), with the camera tilting towards the vertical at the top. Duration 2.4–7 s by distance. Antofagasta ↔ Los Lagos (about 2 000 km) tops out near 4 400 km, where both reliefs are faded out; the destination's relief replaces the origin's there, so only one relief is in memory and none pops in. The flight is a pure function of its progress; it is frame-rate independent; pointer, wheel and Escape cancel it; reduced motion makes it instant.

## Not measured

Frame rate, GPU memory and load time were not profiled. `preserveDrawingBuffer` stays on in both engines (the film capture needs it); its cost in production was not measured.

# Cartographic design: audit of the 2D maps and design of the 3D view

## A. Audit of the previous maps (main at e4e8e3c: `docs/gis/maps/{antofagasta,los_lagos}_territorial.png`)

| # | Where | Defect | Consequence | Correction (export_territorial_maps.py) |
|---|---|---|---|---|
| 1 | both maps, sea | ocean white, same as > 4,500 m and as "no data" | the coast — the subject of the Antofagasta result — is hard to see | map background sea blue `#b9cddc`; Natural Earth land `#efebe3` under the relief |
| 2 | Antofagasta, cells | trend cells at 60 % opacity over a 55 % hypsometric tint | relief hidden; "relief and trend" map shows mostly trend | cells 50 %, thinner white outline |
| 3 | both legends | "Band 1: Grayscale (Gray)" / "Band 1 (Gray)" rows; a "sea / no data" swatch not visible on the map | noise; a legend item with no map counterpart | band-name node and the empty sea item removed from the legend |
| 4 | Antofagasta legend | "Coastal cells (land share < 0.99)" repeated as title and item | redundant text | title "Coastal cells", item "land share < 0.99" |
| 5 | Antofagasta relief | 250 m display DEM keeps averaged artefacts above the highest summit (max 7,482 m) | white specks read as snow/peaks | values ≥ 6,750 m transparent (Los Lagos ≥ 3,500 m), as in the 100 m statistics |
| 6 | Los Lagos, land cover | fully saturated CONAF colours | land cover dominates; cells and relief disappear | desaturated palette shared with the 3D view |
| 7 | Los Lagos, cells | hollow tan outlines on yellow agriculture | the trend classes are hard to tell apart | darker BrBG outline colours, width 1.1 |
| 8 | both | CIREN covers the region only; the Andes beyond the border are blank | no context east of the border | remains in 2D (CIREN licence/extent); the 3D view uses GMTED, which covers it |
| 9 | both | large empty page areas, long credit block | layout inefficient | **not changed** (time); the 3D shots are used in the presentation instead |

Before: `git show e4e8e3c:docs/gis/maps/antofagasta_territorial.png`. After: the files on this branch. The original QGIS
projects are not rewritten (`--write-project` is now opt-in).

## B. 3D view design (`web/src/terrain3d.tsx`, `qgis/scripts/build_3d_terrain.py`)

- **Story order:** Earth (globe locator) → Chile → region → terrain → native NASA cells → result → period sensitivity.
- **Relief:** muted earth tint without greens (the Atacama coast is desert), same height stops in both scenes, multiplied
  by a soft multidirectional hillshade (shade = 0.45 + 0.75 × hillshade, so shadows never hide colour); matte material
  (roughness 1, no metalness) lit from the north-west; vertical exaggeration printed in the legend.
- **Ocean:** flat, blue graded by distance to the coast (not depth: there is no bathymetry); the base block under the
  scene is neutral grey and carries no data.
- **Cells:** draped footprints of the native boxes (corners projected to UTM, edges densified), never extruded columns;
  diverging RdBu (air temperature) / BrBG (soil moisture) centred on zero with a **fixed limit per scene for all periods**
  (±0.7 °C/decade, ±50 mm/decade); opacity slider; thick black outline = coastal cells; hover shows slope, 95 % interval,
  p and cell centre from the data file.
- **SST:** the MUR box is drawn only over sea pixels, hatched (an ocean product, not an air-temperature cell), and only
  for 2003–2025, its period. 
- **Periods:** 1980–2025, 1980–2002, 2003–2025, each with the group result from `territory.json` (T4) under the view, so
  no view suggests uniform coastal cooling over the whole record.
- **Labels:** six towns/landmarks per scene, small dark text with white halo; boundaries thin white, pilot region stronger.
- **Credits:** printed under every view (GMTED, Natural Earth, geoBoundaries, CONAF where shown, NASA products).

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.

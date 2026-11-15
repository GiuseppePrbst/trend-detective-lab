# Terrain sources for the 3D view and the maps

| Source | Use | Resolution / vertical | CRS | Licence | In Git? |
|---|---|---|---|---|---|
| USGS GMTED2010 mean elevation, 15″ (`qgis/terrain/*_gmted2010_dem.tif`) | **web 3D heights and relief texture**; QGIS 3D terrain | ~460 m; metres above the geoid (EGM96) | EPSG:4326 | public domain | yes (clipped tiles) |
| CIREN DEM ALOS PALSAR (ASF RTC-derived), regional mosaics | per-cell statistics (100 m, earlier work), 2D map relief, comparison below | 12.5 m pixel spacing; EGM2008 heights | EPSG:32719 / 32718 | used with attribution (team decision, `DATA_LICENSES.md`) | **no** (local only) |
| Natural Earth 10 m land | sea mask and coastline | 1:10 M | EPSG:4326 | public domain | no (downloaded) |
| geoBoundaries CHL ADM1 | region boundaries | simplified | EPSG:4326 | CC BY 3.0 IGO | yes |
| CONAF catastro Los Lagos 2018 | land-cover texture (Los Lagos), 2D map | rasterised 100 m, shown 250 m | EPSG:32718 | used with attribution | no (local only); only rendered images are published |

**Why GMTED for the web:** it covers the Andes beyond the border (CIREN covers the region only), has no averaged spikes,
and can be redistributed. The web scene publishes 2 km mean heights and a rendered texture, never a CIREN raster.

**Processing (build_3d_terrain.py):** scene box in lon/lat → bounds in the scene's UTM zone, snapped to 2 km;
GMTED warped once to the 2 km mesh grid (`average`) and once to the texture grid (250 m Los Lagos, 320 m Antofagasta,
`cubic` — finer than the 460 m source, so it adds no detail); hillshade multidirectional, z-factor 1.5; Natural Earth land
rasterised on both grids. Sea cells are stored as −32768 and drawn flat at 0 m with an ocean colour: **no bathymetry, not
terrain at 0 m**. Values above the highest summit (Llullaillaco 6,739 m; Tronador 3,491 m) would be masked; GMTED had none.

**Vertical reference:** GMTED (EGM96) and CIREN (EGM2008) are both geoid heights; the two geoid models typically differ by
less than a few metres, far below the 2 km averaging and the 52–80 m RMSE found below inside the regions. **No vertical transformation was applied** and none is
needed at this scale; ellipsoidal heights are not used anywhere.

**Vertical exaggeration:** default 2× in the web view (selector: 1× true scale, 1.5×, 2×, 3×); the value is printed in the
legend of every view and in each shot. QGIS project terrain: vertical scale 2×, stated in the layer name. At 1× the
Atacama relief (0–6 km over ~700 km) is hard to read in an oblique view (`qgis/exports_3d/antofagasta/exaggeration_1x.png`).

## CIREN vs GMTED on the 2 km grid (from `data/scene3d/qa.json`)

| Scene | Area | n (2 km cells) | median CIREN − GMTED | RMSE | 95th pct \|diff\| | r | cells with CIREN > 1,000 m lower |
|---|---|---|---|---|---|---|---|
| Antofagasta | whole CIREN mosaic | 32,099 | −1.2 m | 379.9 m | 34.8 m | 0.953 | 502 |
| Antofagasta | inside the region | 31,464 | −1.0 m | 79.7 m | 27.9 m | 0.998 | 66 |
| Los Lagos | whole CIREN mosaic | 12,485 | +0.2 m | 157.2 m | 135.7 m | 0.943 | 120 |
| Los Lagos | inside the region | 11,739 | +0.2 m | 51.6 m | 93.3 m | 0.993 | 0 |

**Finding:** the CIREN mosaics carry low fill values just beyond their region mask (the 250 m display DEM therefore shows
false "pits" along the border). Inside the region the two DEMs agree closely; the remaining 66 Antofagasta cells lie on the
boundary (geoBoundaries vs CIREN's own mask). Effect on published results: the per-cell statistics were computed inside
the region; the border cells most affected have DEM coverage of 3–22 % and reported mean elevations of 3,949–4,474 m,
consistent with GMTED, so the elevation-range-restricted comparison (coastal range 169–1,601 m) does not include them.
A full re-check of the 100 m statistics against GMTED is a follow-up.

SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.

# 3D presentation shots

Shot sequence (all real results; each image is a URL of the app, re-created by `python qgis/scripts/export_3d_views.py`):

| Shot | File | What it shows |
|---|---|---|
| A — context | `A_context_globe.png` (this folder; `qgis/scripts/locator_globe.py`) | Chile and the two pilot regions on the globe |
| B — terrain | `qgis/exports_3d/antofagasta/terrain_preview.png` | Pacific, coastal range, desert, Andes (2× vertical exaggeration) |
| C — NASA data | `qgis/exports_3d/antofagasta/climate_overlay.png` | native MERRA-2 cells, trend 1980–2025 |
| D — result | `qgis/exports_3d/antofagasta/coastal_comparison.png` | coast −0.03 vs interior +0.27 °C/decade, 1980–2025, exploratory |
| E — period | `qgis/exports_3d/antofagasta/period_1980_2002.png`, `period_2003_2025.png` | the contrast comes from 1980–2002; in 2003–2025 both warmed (difference −0.09, n.s.); MUR SST box +0.11, n.s. |
| F — conclusion | slide text | "Regional averages can hide important spatial differences. Patterns depend on time period, data source and spatial scale." |
| Los Lagos | `qgis/exports_3d/los_lagos/{terrain_preview,land_cover,soil_moisture}.png` | relief, CONAF 2018 land cover (context), GLDAS root-zone soil moisture trend 2000–2024 |
| True scale | `qgis/exports_3d/antofagasta/exaggeration_1x.png` | the same terrain at 1× |

Credits: USGS GMTED2010 (public domain), Natural Earth, geoBoundaries (CC BY 3.0 IGO), CONAF catastro Los Lagos 2018 (with
attribution), NASA MERRA-2, GLDAS-2.1 and MUR v4.1.

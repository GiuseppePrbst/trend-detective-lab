# Spatial layer inventory

Static layers can segment the territory; they never show a trend by themselves.

| Theme | Layer | Source | Status | Used for |
|---|---|---|---|---|
| Administrative | Regions (ADM1) | geoBoundaries gbOpen, CC BY 3.0 IGO | **Used** | Regional means, maps |
| Administrative | Provinces, communes (ADM2/ADM3) | geoBoundaries / IDE Chile | Identified, not used | Too small for 25–50 km cells |
| Land mask | Natural Earth 10 m land | Natural Earth, public domain | **Used** | Coastal / interior cell class |
| Relief | GLDAS model elevation 0.25° | NASA LDAS | **Used (context)** | Elevation of the model cells |
| Relief | SRTM / Copernicus DEM 30 m | NASA / ESA | Identified, not used | Would show sub-cell relief, but the climate grids cannot resolve it |
| Hydrology | Major watersheds | Giovanni shape library | Checked: only two very large Chilean "Pacific coast" basins | Not useful at regional scale |
| Hydrology | DGA basins (cuencas, subcuencas) | IDE Chile / DGA | Identified, not downloaded | Next step for basin means |
| Land cover | MODIS MCD12Q1, CONAF vegetation cadastre | NASA LP DAAC / CONAF | Identified, not used | Needed for the forest/agriculture split (not done) |
| Cryosphere | DGA glacier inventory | DGA | Identified, not used | Would separate glaciers from seasonal snow |
| Environment | Protected areas (SNASPE), wetlands | IDE Chile / MMA | Identified, not used | No question in scope |

Rule applied: a layer enters the analysis only if it answers a question we test. Identified-only layers are listed so
the next team knows where to go.

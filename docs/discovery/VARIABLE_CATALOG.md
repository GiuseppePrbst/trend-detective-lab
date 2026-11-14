# Variable catalogue

Generated 2026-11-14T19:59:34+00:00 by `python -m pipeline.discovery`. Do not edit by hand.

| Id | Variable | Product | Type | Resolution | Coverage | Access | Status | Depends on | Limitations |
|---|---|---|---|---|---|---|---|---|---|
| t2m | Air temperature at 2 m | MERRA-2 M2IMNXASM v5.12.4 | reanalysis (model + observations) | 0.5° × 0.625° (~50 km), monthly | global; used 1980–2025 | Giovanni time-series API, cell by cell | integrated | assimilated observations shared with other reanalyses | coast and mountains not separated at 50 km; observing-system changes can create jumps |
| precip | Precipitation | GPM IMERG Final V07 GPM_3IMERGM | satellite estimate adjusted with rain gauges | 0.1° (~10 km), monthly | used 1998–2024 | Giovanni time-series API, cell by cell | integrated | rain gauges (GPCC) used in the adjustment | less accurate over steep mountains; 27 years is short; strongly start-year sensitive |
| soilm_root | Root-zone soil moisture | GLDAS-2.1 Noah GLDAS_NOAH025_M | land-surface model | 0.25° (~25 km), monthly | used 2000–2024 | Giovanni time-series API, cell by cell | integrated | observed precipitation and meteorological forcing (shares information with precipitation products) | model output, not a measurement; static model land cover |
| soilm_surface | Surface soil moisture (0–10 cm) | GLDAS-2.1 Noah GLDAS_NOAH025_M | land-surface model | 0.25°, monthly | used 2000–2024 | Giovanni time-series API | integrated | observed precipitation forcing | model output |
| evap | Evapotranspiration | GLDAS-2.1 Noah GLDAS_NOAH025_M | land-surface model | 0.25°, monthly | used 2000–2024 | Giovanni time-series API | integrated | precipitation and radiation forcing | model output |
| swe | Snow water equivalent | GLDAS-2.1 Noah GLDAS_NOAH025_M | land-surface model | 0.25°, monthly | used 2000–2024 | Giovanni time-series API | integrated | temperature and precipitation forcing | not glacier mass; accumulates without limit over icefields (Aysén, Magallanes) |
| ndvi | Vegetation index (NDVI/EVI) | MODIS Terra MOD13C2 C6.1 (doi:10.5067/MODIS/MOD13C2.061) | satellite observation | 0.05°, monthly | 2000– | LP DAAC granules (~95 MB each, no Harmony subsetting); AppEEARS needs a user login | available_not_processed | – | cloud and QA masking required; NDVI change is not deforestation |
| sst | Sea-surface temperature | GHRSST MUR L4 v4.1 (PO.DAAC) | satellite analysis | 0.01°, daily | 2002– | PO.DAAC (Earthdata); subsetting needed | planned | – | starts 2002; air and sea temperature are different variables |
| discharge | River discharge | CAMELS-CL (CR2) | gauge observations | 516 basins, daily | varies by basin | cr2.cl/camels-cl | planned | human regulation in many basins | basins smaller than one climate cell cannot be resolved by NASA products |
| era5 | ERA5 temperature and precipitation | ECMWF ERA5 via Open-Meteo | reanalysis | 0.25°, monthly from daily | 1980–2025 | Open-Meteo archive API | validation_only | shares many assimilated observations with MERRA-2 | not a NASA product; used only as a cross-check |
| stations | Weather stations | Meteostat monthly | station observations | one point, monthly | gaps vary | bulk.meteostat.net | validation_only | some stations are assimilated by reanalyses | a point, not a region |

## Questions and suggested variables

### Water availability — Is the water available to land and plants changing?

- **precip**: Rain is the input of the land water balance.
- **soilm_root**: Root-zone soil moisture represents estimated water stored in the soil available to plants.
- **soilm_surface**: The top 10 cm respond fastest to rain and drying.
- **evap**: Evapotranspiration is the water returned to the air; where water is scarce it follows rain.
- **ndvi**: Vegetation would show the biological response — not processed yet.
- **discharge**: River flow would show the hydrological response — not processed yet.
- relation precip – soilm_root: Shared model inputs
- relation precip – evap: Shared model inputs
- relation precip – ndvi: Not yet evaluated

### Coastal climate — Do the coast and the interior of a region behave the same?

- **t2m**: Air temperature of each native cell, classified as coastal or interior in QGIS.
- **era5**: A second reanalysis at the same points.
- **stations**: A coastal weather station.
- **sst**: Sea-surface temperature would add the ocean side — planned.
- relation t2m – era5: Partially dependent sources (different systems, some shared observations)
- relation t2m – stations: Potentially independent observations
- relation t2m – sst: Not yet evaluated

### Andean snow — How do snow and temperature vary together?

- **t2m**: Warm years may melt or prevent snow.
- **swe**: Water stored in the snowpack (model).
- **precip**: Snow needs precipitation too.
- relation t2m – swe: Shared model inputs

### Dataset disagreement — Why can two scientific products reach different conclusions?

- **precip**: IMERG satellite–gauge precipitation.
- **t2m**: MERRA-2 reanalysis temperature.
- **era5**: ERA5, another reanalysis.
- **stations**: Punta Arenas station.
- relation t2m – era5: Partially dependent sources (different systems, some shared observations)
- relation precip – era5: Partially dependent sources (different systems, some shared observations)
- relation precip – stations: Potentially independent observations

### Climate change by region — How do trends differ between regions, and are the differences real?

- **t2m**: Pre-registered main variable.
- **precip**: Pre-registered second variable.
- relation t2m – precip: Descriptive association

### Vegetation response — How does vegetation respond to environmental change?

- **ndvi**: Satellite greenness — available at NASA but not processed in this version.
- **evap**: Modelled evapotranspiration is the closest integrated proxy.
- **soilm_root**: Water available to roots.
- relation ndvi – soilm_root: Not yet evaluated
- Unavailable: No vegetation index is integrated yet: MOD13C2 has no subsetting service we could use and AppEEARS needs a user login. Closest available alternative: evapotranspiration and soil moisture (GLDAS model).

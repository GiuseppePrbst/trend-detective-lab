# Roadmap: new Earth-system variables and Chilean case studies

Prepared 2026-11-14 from the team's literature and catalogue review (ProGarLabs). The studies below were collected by the
team; their links are kept as provided and **were not re-read or re-verified by the agent**. Nothing here is a result of
Trend Detective Lab unless marked "done".

## Access checked today (from our network)

| Route | Status 2026-11-14 | Consequence |
|---|---|---|
| NASA Giovanni time-series API (point series) | working | main pipeline (MERRA-2, IMERG, GLDAS) |
| NASA Giovanni area-averaging (ArAvTs) | **failing** for all variables in the afternoon | not usable today |
| NASA Harmony (PO.DAAC MUR v4.1): bbox/time/variable subsetting | working | used for coastal SST (T5) |
| NASA LP DAAC MOD13C2 (NDVI/EVI) | granules only (~95 MB each), no Harmony subsetting; AppEEARS needs a user login | pending a team login or a subsetting service |
| NOAA ERDDAP (CoastWatch), NOAA PSL THREDDS (OISST) | unreachable (timeouts) | OISST contrast not possible today |

## Candidate investigations (priority = value × feasibility before the deadline)

| Line | Team-provided reference | Variables / products | Feasibility now | Priority |
|---|---|---|---|---|
| Coastal ocean vs coastal air, Antofagasta | Falvey & Garreaud 2009 (doi:10.1029/2008JD010519) | MUR SST v4.1 (NASA) | **done / in progress** (registered T5) | 1 |
| Marine heatwaves, northern Patagonia (2016 event) | Frontiers in Marine Science 2022 (team link) | MUR SST daily: event duration and intensity | daily MUR via Harmony works; needs a heatwave method (e.g. Hobday 2016) | after deadline |
| Optical water quality, Chiloé inner sea | Advances in Space Research 2024 (team link) | MODIS-Aqua chlorophyll-a, reflectance (OB.DAAC) | OB.DAAC subsetting not tested | after deadline |
| Andean snow cover loss (27–36° S) | Scientific Reports 2024 (team link: ~19 %/decade decline 2001–2022) | MOD10CM snow cover 0.05° | similar access issue to MOD13C2 | after deadline |
| Vegetation response to drought | Basin recovery study 2023 (team link) | MOD13C2 NDVI/EVI, MOD17 GPP | blocked as above | after deadline |
| Glacier change, Los Lagos Andes | Alerce glacier 1953–2020 (team link: ~35 % area loss) | Landsat; GLDAS SWE is not glacier mass | needs image processing | after deadline |
| Air quality in Osorno (wood smoke) | Atmosphere 2022 (team link) | SINCA PM2.5 (main), MERRA-2 AOD, wind, temperature | AOD collection was unavailable in the API; SINCA is national | after deadline |
| River discharge vs rain and soil moisture | CAMELS-CL (doi:10.5194/hess-22-5817-2018) | CAMELS-CL, DGA | basins smaller than one cell; needs selection | after deadline |
| Wildfire seasons 2016–17, 2022–23 | 2024 study (team link) | MCD64A1 burned area, VIIRS active fires | event analysis, not trends | after deadline |
| Shorter rainy season in central Chile | 2026 study (team link; not verified) | IMERG daily: onset, end, dry spells | daily IMERG through the same API | after deadline |
| Lake Llanquihue chlorophyll | 2025 thesis (team link) | satellite chlorophyll vs DGA | year-to-year comparison is not a long-term trend | after deadline |

Guardrails for every new line: register the hypothesis and test family before computing; label exploratory; state
dependencies between products; no causal claims; never present a single season or event as a trend.

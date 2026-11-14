# Audit of the Quemchi data library

Source: `Biblioteca_Datos_Espaciales_Quemchi_2026.xlsx` (sheets "CATÁLOGO COMPLETO", "EMPEZAR AQUÍ", "GUÍA POR
DESAFÍO") and its PDF export, handed out at the Quemchi venue on 2026-11-14. 73 resources in 9 thematic areas.
Audit date: 2026-11-14. "Checked" means we made a real request today or on 12–13 Nov; anything else is taken from
the library's own columns and marked *as listed*.

The library's guide for "Cambio climático" suggests: start with NASA Climate Change, then ERA5 / NASA GES DISC,
for "series históricas y tendencias". That is the path this project follows.

## 1. Resources relevant to this project

| Resource (library row) | Access (checked) | Licence / conditions | Variable for us | Spatial res. | Period | How it is produced | Use here | Independent of our main data? |
|---|---|---|---|---|---|---|---|---|
| **NASA Giovanni** | Time-series API with Earthdata token: checked, in use. Web interface needs interactive login | NASA open data; cite collection DOI | T2M, precipitation | native grid of each collection | per collection | Serves GES DISC collections | **Main data route** | — (it is the route) |
| **NASA GES DISC** | Catalogue public; downloads need Earthdata Login: checked | NASA open data | MERRA-2 `M2IMNXASM` v5.12.4; IMERG `GPM_3IMERGM` v07 | 0.5°×0.625°; 0.1° | 1980–; 1998–2025-09 | Reanalysis; satellite–gauge merge | Provenance and documentation | — |
| **NASA GPM** | Product documentation: read 12 Nov | NASA open data | IMERG Final Run | 0.1° | 1998–2025-09 (V07) | Multi-satellite estimate adjusted with monthly gauge analysis | Second variable | — |
| **NASA POWER** | Open API, no login: checked | NASA open data; cite POWER | T2M, corrected precipitation | 0.5°×0.625° | 1981– | **Re-serves MERRA-2** | Consistency check of our download, units and weighting | **No** — same reanalysis |
| **ERA5 Climate Data Store** | Needs a free CDS account (we have none). ERA5 is also re-served without login by the Open-Meteo archive API (CC BY 4.0), which we use | Copernicus licence; attribution | 2-m temperature, total precipitation | 0.25° | 1940– | ECMWF reanalysis (different model and assimilation system) | **Sensitivity to another reanalysis** | Partly — different system, but both reanalyses assimilate many of the same observations |
| **Meteostat** | Bulk monthly station files, no key | CC BY-NC 4.0 for Meteostat-compiled data; sources include national weather services and NOAA GHCN. Non-commercial: acceptable for this open, non-commercial project; cite | Station mean temperature, precipitation | point | station-dependent | Station observations (with some model gap-filling in other endpoints — we use raw monthly station files only) | **Independent ground check** | Yes for precipitation and largely for temperature (MERRA-2 does not assimilate station 2-m temperature) — but a point is not a regional mean |
| **NOAA Climate Data Online** | Site reachable; API needs a NOAA token (we have none) | NOAA open data | GHCN station series | point | station-dependent | Station observations | Alternative to Meteostat | Yes; not used for lack of a token |
| **Dirección Meteorológica de Chile** | Public portal; bulk data require registration (*as listed*) | Public; conditions per product | Station series | point | station-dependent | National station network | Authoritative station source; future work | Yes; not automated today |
| **IDE Chile / Geoportal de Chile** | Public (*as listed*) | Per layer | Administrative boundaries, territorial context | vector | — | Official layers | Context; our boundaries come from geoBoundaries, whose stated source is the Biblioteca del Congreso Nacional | n/a |
| **Natural Earth** | Public domain | Public domain | Country outlines | vector | — | — | Possible context layer | n/a |
| **NASA Climate Change** | Public | NASA | Global indicators | global | — | Communication site | Context for the presentation only | n/a |
| **NASA Worldview** | Public | NASA | Imagery | — | — | Viewer | Context image for the presentation (with attribution) | n/a |
| **AppEEARS** | API catalogue checked 13 Nov (193 products; no MERRA-2, GPM or GLDAS) | NASA open data; Earthdata Login | MODIS NDVI, LST | 250 m–1 km | 2000– | Satellite retrievals | Future third variable | n/a |
| **Google Earth Engine** | Registration; free for eligible non-commercial use (*as listed*) | Terms restrict some uses | many | — | — | Cloud platform | Not needed; adds an account dependency to reproduction | n/a |
| **Microsoft Planetary Computer** | Open data; compute/API conditions (*as listed*) | Per dataset | many (also hosts ERA5) | — | — | Cloud catalogue | Not needed today | n/a |
| **Copernicus (Browser, Data Space, Marine, Atmosphere)** | Free account for most (*as listed*) | Copernicus licence | Sentinel imagery, ocean, air quality | 10 m–km | 2015– | Satellite and models | Different scales and short records: **not comparable** with our 27–46-year regional series | n/a |

## 2. Three categories

**Needed now (strengthen validation)**
1. NASA Giovanni / GES DISC — main data and provenance.
2. NASA POWER — pipeline consistency (not independent).
3. Meteostat station records — independent ground check for three focus regions.
4. ERA5 (through the Open-Meteo archive) — sensitivity to another reanalysis.

**Useful for the presentation (context)**
- NASA Climate Change (global context), NASA Worldview (an image of Chile with attribution), IDE Chile (territorial context).

**Future (after the event)**
- AppEEARS (vegetation), Dirección Meteorológica de Chile (authoritative stations), NOAA CDO, Copernicus Marine and
  NASA OceanColor (coastal waters of Los Lagos), NASA FIRMS (fires), Google Earth Engine / Planetary Computer for
  heavier processing.

## 3. Not relevant to this challenge

The remaining resources concern other challenges and are not used: GOES viewers and archives (weather imagery, not
long records), disaster portals (FIRMS, EMS, GDACS, landslides, earthquakes), ocean and water portals, astronomy and
exoplanet archives, solar-system and space-weather services, NASA Open APIs, Radiant MLHub, OpenStreetMap, the
Chilean seismology, geology and hydrographic services, OpenTopography/SRTM, Landsat/USGS viewers, OCO-2, TEMPO,
Global Forest Watch, GBIF, datos.gob.cl.

## 4. Rules we follow when adding a source

- One row of provenance per dataset: URL, date of access, version, licence, unit, resolution, period.
- A product derived from the same reanalysis is never called independent.
- A station is a point; a regional mean is an area. We compare **trends and anomalies**, not absolute values, and say so.
- No source is added only to increase the count.

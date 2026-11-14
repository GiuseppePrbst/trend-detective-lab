# NASA dataset inventory for Chile

Checked on 2026-11-14. "Access verified" means we downloaded real values on that day through the route named; a product
that was only found in a catalogue is marked as such and is **not** used in the app.

| Variable | NASA product | Dates | Resolution | Access verified | Analysis done | Status |
|---|---|---|---|---|---|---|
| Air temperature 2 m | MERRA-2 `M2IMNXASM` v5.12.4 `T2M` (doi:10.5067/5ESKGQTZG7FO) | 1980–2025 | 0.5° × 0.625°, monthly | Giovanni time-series API (419 cells); Giovanni ArAvTs (3 boxes) | Main study (confirmatory) + cell map + coast/interior | **Integrated** |
| Precipitation | GPM IMERG Final V07 `GPM_3IMERGM` (doi:10.5067/GPM/IMERG/3B-MONTH/07) | 1998–2024 | 0.1°, monthly | Giovanni time-series API (9,694 cells) | Main study (confirmatory) + associations | **Integrated** |
| Root-zone soil moisture | GLDAS-2.1 Noah `GLDAS_NOAH025_M` v2.1 `RootMoist_inst` (doi:10.5067/SXAVCZFAQLNO) | 2000–2024 used | 0.25°, monthly | Giovanni time-series API (1,748 cells) | Trends (E1), associations (E2), cell map (E4) | **Integrated (exploratory)** |
| Surface soil moisture 0–10 cm | GLDAS-2.1 `SoilMoi0_10cm_inst` | 2000–2024 | 0.25°, monthly | same | E1, E2 | **Integrated (exploratory)** |
| Evapotranspiration | GLDAS-2.1 `Evap_tavg` (kg m⁻² s⁻¹ → mm/month) | 2000–2024 | 0.25°, monthly | same | E1, E2 | **Integrated (exploratory)** |
| Snow water equivalent | GLDAS-2.1 `SWE_inst` | 2000–2024 | 0.25°, monthly | same | E1, E2 (T2M–SWE) | **Integrated (exploratory)** |
| Model elevation (static) | GLDAS `GLDASp4_elevation_025d` | static | 0.25° | HTTPS download from the LDAS site | Context layer in QGIS | Context only |
| NDVI / EVI | MODIS Terra `MOD13C2` C6.1 (CMR `C2565788914-LPCLOUD`) | 2000– | 0.05°, monthly | Found in CMR; Harmony offers **no** subsetting; granules ~95 MB each (~28 GB for 2000–2024); not in the Giovanni time-series API ("Data parameter is invalid") | none | **Not integrated** |
| NDVI | MODIS `MOD13A3` v061 via AppEEARS (Resources tab) | 2000– | 1 km, monthly | Product listed by the AppEEARS API; task submission needs an AppEEARS login (the Earthdata bearer token was refused, HTTP 403) | none | **Not integrated** — a team member can submit an area request |
| Aerosol optical depth | MERRA-2 `M2TMNXAER` `TOTEXTTAU` | 1980– | 0.5° × 0.625° | Giovanni time-series API answered "currently unavailable" (HTTP 404) | none | **Not integrated** |
| 2-m specific humidity, daily T max/min, FLDAS, GLDAS-CLSM water storage, OMI NO₂ | various | various | various | Listed as configured in the same API on 2026-11-12 (`preparacion/17`), not downloaded | none | Catalogue only |
| Snow cover, sea-surface temperature, chlorophyll, GRACE | MODIS / others | – | – | Not checked in the time available | none | Not checked |

## Why GLDAS and not more products

GLDAS-2.1 gives four land-surface variables on one 0.25° grid through the same access route as our main data, with the
same caching and provenance. That makes a real multivariable comparison possible in hours. Its main weakness is stated
everywhere it appears: it is a **model**, forced in part by observed precipitation, so it is not an independent
observation of drought.

## Sources

- Beaudoing, H. and M. Rodell (2020), GLDAS Noah Land Surface Model L4 monthly 0.25 x 0.25 degree V2.1, GES DISC, doi:10.5067/SXAVCZFAQLNO.
- Rodell, M., et al. (2004), The Global Land Data Assimilation System, Bull. Amer. Meteor. Soc. 85, 381–394, doi:10.1175/BAMS-85-3-381.
- Didan, K. (2021), MODIS/Terra Vegetation Indices Monthly L3 Global 0.05Deg CMG V061, NASA LP DAAC, doi:10.5067/MODIS/MOD13C2.061 (catalogue entry only).

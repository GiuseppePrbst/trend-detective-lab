# Validation of the exploratory results

| Result | Check | Outcome | What it supports / does not |
|---|---|---|---|
| Antofagasta coast vs interior (E3) | ERA5 (Open-Meteo) at 4 coastal and 5 interior MERRA-2 cell centres, same method | Same contrast in ERA5 (numbers in `docs/multivariable/MULTIVARIABLE_RESULTS.md`, E3) | Supports a real coast–interior contrast in both reanalyses. ERA5 and MERRA-2 share observations, so not fully independent |
| Antofagasta coast vs interior (E3) | Meteostat station 85442 (coastal, 135 m) | Station trend lies in the range of the coastal cells, not of the regional mean | Supports that the station/region disagreement comes from mixing coast and interior. Coast and altitude are confounded at 50 km |
| Cell grid and classification | QGIS-built grid vs pipeline cell list | 51 / 51 identical | The cells being compared are the ones the pipeline uses |
| Regional averaging | NASA Giovanni ArAvTs, same cells | max. difference 0.0003 °C | Computation is correct; border treatment checked separately |
| GLDAS soil moisture vs IMERG rainfall (E2) | none independent | — | GLDAS is forced partly by observed precipitation; the association is a consistency check, **not** independent confirmation |
| GLDAS trends (E1) | none independent available in time | — | Model output only; no soil-moisture satellite (e.g. SMAP, from 2015) compared |

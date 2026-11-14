# Hypotheses and test families for the multivariable extension

Written on 2026-11-14 at about 12:40 (UTC−03:00), **before** any GLDAS series was aggregated or any new trend,
correlation or spatial contrast was computed. Committed on its own so the timestamp is in the history.

## Status of every analysis

| Level | What | Status |
|---|---|---|
| Confirmatory | The comparisons in the first commit: Los Lagos vs Antofagasta and vs Magallanes; trends of T2M and precipitation in the 16 regions | Interpretation unchanged |
| Exploratory | Everything below: new variables, cell maps, coast/interior split, correlations, time windows | Labelled **exploratory** wherever shown |

An exploratory result can at most be called "consistent with" a hypothesis. It is never a confirmed finding.

## New data

GLDAS-2.1 Noah monthly 0.25° (`GLDAS_NOAH025_M` v2.1, doi:10.5067/SXAVCZFAQLNO), 2000–2024: surface soil moisture
0–10 cm, root-zone soil moisture, evapotranspiration, snow water equivalent. Model output, forced in part by observed
precipitation: agreement with IMERG precipitation is partly built in and is **not** independent confirmation.

## Families and corrections (Benjamini–Hochberg, q = 0.05, within each family)

| Family | Tests | Correction | Use |
|---|---|---|---|
| E1 · Trends of the four GLDAS variables | 4 variables × 16 regions = 64 | BH over all 64 together | Exploratory trends |
| E2 · Year-to-year association | 4 pairs × 16 regions = 64: precipitation–root-zone soil moisture, precipitation–surface soil moisture, precipitation–evapotranspiration, T2M–snow water equivalent | BH over all 64 together | Exploratory association |
| E3 · Coast vs interior, Antofagasta | 1 planned test: trend of (mean of coastal MERRA-2 cells − mean of interior cells), 1980–2025 | none needed (single test) | Exploratory spatial contrast |
| E4 · Cell maps | One trend per native grid cell | BH shown, but **descriptive only** | Where the change is; no claims about single cells |
| E5 · Time windows | Same tests on other periods | none | Sensitivity only; never a new claim |

The confirmatory families (16 regional trends; 120 pairwise differences) keep their own correction; it does not
cover any of the above.

## Methods fixed now

- **Trends (E1, E3, E4):** the main test of the app — least squares on yearly means of monthly anomalies, lag-1
  effective sample size; Theil–Sen + Mann–Kendall as the robustness check. Same calibration caveat (worst simulated case
  8.6 % false positives at 46 years, 10.1 % at 27).
- **Association (E2):** yearly means of monthly anomalies over the common years 2000–2024, each series linearly
  detrended first (so a shared trend cannot create a correlation); Pearson r; p-value from a t test with the effective
  sample size n·(1 − r1ₓ·r1ᵧ)/(1 + r1ₓ·r1ᵧ) (Bretherton et al. 1999), where r1 are the lag-1 autocorrelations of the
  detrended series. Lags of 0–3 months on monthly detrended anomalies are shown descriptively (precipitation leading);
  no test is made on the lag profile.
- **Coastal cell (E3):** a MERRA-2 cell of the Antofagasta region whose box intersects the ocean (land fraction < 1,
  using the Chile ADM1 polygons as the land mask). Interior: all other cells of the region. Cell classification is done
  in QGIS before the trends are computed.
- **Cell maps (E4):** native grid, no resampling or interpolation; cells drawn as their true boxes.

## Hypotheses, written before computing

- **H1 (central Chile drying across indicators).** From Coquimbo to Ñuble, 2000–2024: where precipitation decreased,
  root-zone soil moisture also decreased. Expected sign: same as precipitation. *Caveat: GLDAS is driven by observed
  precipitation.*
- **H2 (year-to-year coupling).** Detrended yearly precipitation anomalies correlate positively with root-zone soil
  moisture anomalies in central and southern regions.
- **H3 (coast vs interior).** In Antofagasta, coastal cells warmed less than interior cells (would be consistent with the
  station/regional discrepancy). Either sign, or no difference, is reported.
- **H4 (snow and temperature).** Detrended yearly snow water equivalent anomalies correlate negatively with T2M anomalies
  in regions with Andean snow (Metropolitana to Aysén).

If the data contradict a hypothesis, the contradiction is the result.

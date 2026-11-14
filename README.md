# Trend Detective Lab

NASA Space Apps Challenge 2026 — **Be An Earth System Trend Detective!**
Team **ProGarLabs** (Local Event: Quemchi, Chile) — Giuseppe Proboste, Fabiana García.

Work on this repository started on **2026-11-14 09:03 (UTC−03:00)**, after the official start of the hackathon.

> Status: in development during the hackathon. Nothing below is a result yet.

## What we are building

A small interactive lab where anyone can pick an Earth-science variable and a region, look at its
time series, and get an honest answer to four questions: *what* is changing, *where*, *how much per
decade*, and *is the change statistically significant* — including whether two regions really differ.

## Pre-registration (written before any trend was computed)

We fix these choices up front so that results cannot be cherry-picked.

| Choice | Value | Why |
|---|---|---|
| Regions | **All 16 first-level administrative regions of Chile** (geoBoundaries gbOpen CHL ADM1, 2020). Every region is reported. | An external, complete partition; we do not pick regions after seeing results. |
| Guided comparison | **Los Lagos** (our home region) vs **Antofagasta** (hyper-arid north) and vs **Magallanes** (sub-polar south) | Chosen by climate contrast along Chile's latitudinal gradient, not by outcome. |
| Variable 1 | 2-m air temperature, MERRA-2 monthly `M2IMNXASM` v5.12.4 (`T2M`) | Longest record available. MERRA-2 is a **reanalysis**, not a direct observation. |
| Variable 2 | Precipitation, GPM IMERG Final Run monthly `GPM_3IMERGM` v07 | Satellite–gauge merged product. |
| Periods | Full calendar years only: **1980–2025** (MERRA-2), **1998–2024** (IMERG Final V07, whose record ends 2025-09) | Use the whole record; avoid picking start/end years after looking at the data. |
| Data access | NASA **Giovanni** time-series service (`api.giovanni.earthdata.nasa.gov/timeseries`), one request per native grid cell | Giovanni / GES DISC Hydrology Time Series are listed in the challenge Resources. |
| Regional series | Area-weighted mean of native grid cells (weight = cell area inside the region polygon) | No raster resampling. |
| Seasonality | Monthly anomalies: value minus the mean of the same calendar month over the analysed period | Removes the seasonal cycle. |
| Main test | Ordinary least-squares trend on monthly anomalies, standard error adjusted for lag-1 autocorrelation (effective sample size, Santer et al. 2000, 2008). Reports slope per decade, 95 % CI, two-sided p. | Monthly climate series are autocorrelated; naive tests give false positives. |
| Robustness check | Theil–Sen slope + Mann–Kendall test modified by Hamed & Rao (1998) | Non-parametric, different assumptions. |
| Comparing two regions | Same main test applied to the **difference series** (A − B) | Two separately significant trends do not show that the trends differ. |
| Significance level | α = 0.05, two-sided; Benjamini–Hochberg adjustment when all 16 regions are shown together | Fixed in advance. |
| Small regions | Regions covered by fewer than 10 grid cells are flagged *resolution-limited* | MERRA-2 cells are ~50 km. |

What this tool does **not** do: predict the future, attribute causes, or claim that "not significant"
means "no change".

## License

Apache-2.0. See `LICENSE`.

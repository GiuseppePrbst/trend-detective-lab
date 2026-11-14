# Trend Detective Lab

NASA Space Apps Challenge 2026 — **Be An Earth System Trend Detective!**
Team **ProGarLabs** (Local Event: Quemchi, Chile) — Giuseppe Proboste, Fabiana García.

Work on this repository started on **2026-11-14 09:03 (UTC−03:00)**, after the official start of the hackathon.
The first commit is the pre-registration below; the commit history shows the order in which things were done.

## What it is

A small interactive lab where anyone can pick an Earth-science variable and a region, look at its
time series, and get an honest answer to four questions: *what* is changing, *where*, *how much per
decade*, and *is the change statistically significant* — including whether two regions really differ.

- `pipeline/` — Python: downloads NASA data, builds regional series, runs the statistics.
- `web/` — static React app that **only displays** what the pipeline computed (it calculates no statistics).
- `docs/results.md` — every number the app shows, as tables (generated).
- `docs/validation.md` — checks on the real results (generated).
- `tests/` — synthetic test cases for the statistics.

## NASA data used

| Variable | Collection | Accessed through | Period used |
|---|---|---|---|
| Air temperature at 2 m | MERRA-2 `M2IMNXASM` v5.12.4 (`T2M`), doi:[10.5067/5ESKGQTZG7FO](https://doi.org/10.5067/5ESKGQTZG7FO) — a **reanalysis** | NASA **Giovanni** time-series service (GES DISC), listed in the challenge Resources (Giovanni; Hydrology Time Series) | 1980–2025 |
| Precipitation | GPM IMERG Final Run `GPM_3IMERGM` v07, doi:[10.5067/GPM/IMERG/3B-MONTH/07](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07) — satellite estimate merged with rain gauges | Same service | 1998–2024 |

One request is made per native grid cell (`https://api.giovanni.earthdata.nasa.gov/timeseries`); the service returns the
cell's full monthly series with its metadata (collection, DOI, unit, cell centre). `data/weights/*.csv` lists which
cells, with which weights, make up each region. NASA POWER is used only as a consistency check in `docs/validation.md`.

## Pre-registration (written before any data was downloaded or any trend computed)

We fixed these choices up front so that results cannot be cherry-picked.

| Choice | Value | Why |
|---|---|---|
| Regions | **All 16 first-level administrative regions of Chile** (geoBoundaries gbOpen CHL ADM1, 2020). Every region is reported. | An external, complete partition; we do not pick regions after seeing results. |
| Guided comparison | **Los Lagos** (our home region) vs **Antofagasta** (hyper-arid north) and vs **Magallanes** (sub-polar south) | Chosen by climate contrast along Chile's latitudinal gradient, not by outcome. |
| Periods | Full calendar years only: **1980–2025** (MERRA-2), **1998–2024** (IMERG Final V07, whose record ends 2025-09) | Use the whole record; avoid picking start/end years after looking at the data. |
| Regional series | Area-weighted mean of native grid cells (weight = cell area inside the region polygon) | No raster resampling. |
| Seasonality | Monthly anomalies: value minus the mean of the same calendar month over the analysed period | Removes the seasonal cycle. |
| Main test | Least-squares trend on monthly anomalies with the standard error adjusted for autocorrelation through an effective sample size (Santer et al. 2000, 2008). Slope per decade, 95 % CI, two-sided p. | Monthly climate series are autocorrelated; naive tests give false positives. |
| Robustness check | Theil–Sen slope + Mann–Kendall test modified by Hamed & Rao (1998) | Non-parametric, different assumptions. |
| Comparing two regions | Same main test applied to the **difference series** (A − B) | Two separately significant trends do not show that the trends differ. |
| Significance level | α = 0.05, two-sided; Benjamini–Hochberg adjustment across the 16 regions | Fixed in advance. |
| Small regions | Regions covered by fewer than 10 grid cells are flagged *resolution-limited* | MERRA-2 cells are ~50 km. |

### One change after pre-registration — and why

The pre-registered main test used an effective sample size based on **lag-1** autocorrelation only. When we checked
that assumption on the real data (`docs/validation.md`, section 1) it failed: the residuals keep two to three times
more lag-2 correlation than a lag-1 model implies. In synthetic simulations with that kind of memory, the lag-1
correction gave 30–48 % false positives. We therefore switched to the general effective sample size, summing the
leading positive autocorrelations (identical for a true AR(1) process; 8–9 % false positives in the same simulations).
The change makes every confidence interval **wider**, i.e. it works against finding significant trends. It was made
for that reason only, and both versions are in the commit history.

## What we found (see `docs/results.md` for all numbers)

For MERRA-2 2-m air temperature, 1980–2025: warming is statistically significant and robust in the north and centre
of Chile (about +0.1 to +0.25 °C per decade), and **no significant trend is detected from Los Lagos southwards**
(Los Lagos, Aysén, Magallanes). The trend in Antofagasta is significantly larger than in Los Lagos; Los Lagos and
Magallanes cannot be told apart.

For GPM IMERG precipitation, 1998–2024: the central estimate is negative in every region from Valparaíso southwards,
but with only 27 years of a highly variable quantity most of these trends are **not statistically significant**.
Two regions show a significant, robust decrease (Los Ríos and Magallanes, about −11 to −14 % per decade); three more
(Bío-Bío, La Araucanía, Atacama) are significant with one method but not the other, and we say so. In Los Lagos the
estimate is −4.5 % per decade with a confidence interval that includes zero. Monthly precipitation is strongly
skewed, so the least-squares and rank-based slopes differ more than for temperature.

These are statements about these data products over these periods — not about causes, and not forecasts.

## Limitations

- MERRA-2 is a reanalysis, not a direct measurement; changes in the observing system can leave artificial jumps. Its ~50 km cells do not separate coast from mountains.
- The test looks for a straight-line trend over the whole period. It says nothing about causes and is not a forecast.
- "Not significant" does not mean "no change".
- With very persistent variables the significance test is still somewhat optimistic (8–9 % false positives instead of 5 % in our simulations).
- Measurement uncertainty of the data products is not propagated into the confidence intervals.
- Regional means hide differences inside a region. Polygons are simplified reference boundaries.

## Reproduce

Requires [uv](https://docs.astral.sh/uv/) (Python ≥ 3.12), Node 20, and a free [Earthdata Login](https://urs.earthdata.nasa.gov) token
(approve the "NASA GESDISC DATA ARCHIVE" application in your profile).

```bash
uv sync
export EARTHDATA_TOKEN=...            # never commit it
uv run python -m pipeline.fetch t2m   # ~4 min, 419 grid cells
uv run python -m pipeline.fetch precip
uv run python -m pipeline.build       # writes web/public/data/ and docs/results.md
uv run python -m pipeline.validate    # writes docs/validation.md
uv run pytest                         # synthetic test cases
cd web && npm ci && npm run dev
```

## Tests

`tests/test_trend_spec.py` was written from the written specification by a separate SI agent that was not allowed to
read the implementation (17 cases: no trend, known slopes, seasonality, autocorrelation, gaps, outliers, constant and
short series, bad input, unit and time shifts, region differences, multiple-testing adjustment).
`tests/test_long_memory.py` was added by the engine's author after the validation finding above. All test data are synthetic.

## References

Data
- Global Modeling and Assimilation Office (GMAO), MERRA-2 instM_2d_asm_Nx V5.12.4, GES DISC, doi:10.5067/5ESKGQTZG7FO.
- Huffman, G.J., et al., GPM IMERG Final Precipitation L3 1 month 0.1° × 0.1° V07, GES DISC, doi:10.5067/GPM/IMERG/3B-MONTH/07.
- NASA Giovanni and the GES DISC time-series service: https://giovanni.gsfc.nasa.gov/ , https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series
- NASA POWER (consistency check only): https://power.larc.nasa.gov/
- Region boundaries: geoBoundaries gbOpen CHL ADM1 (Runfola et al. 2020, doi:10.1371/journal.pone.0231866), source Biblioteca del Congreso Nacional de Chile / OCHA ROLAC, CC BY 3.0 IGO.

Methods
- Santer, B.D., et al. (2000), J. Geophys. Res. 105(D6), 7337–7356, doi:10.1029/1999JD901105.
- Santer, B.D., et al. (2008), Int. J. Climatol. 28, 1703–1722, doi:10.1002/joc.1756.
- Sen, P.K. (1968), J. Am. Stat. Assoc. 63, 1379–1389, doi:10.1080/01621459.1968.10480934.
- Mann, H.B. (1945), Econometrica 13, 245–259, doi:10.2307/1907187.
- Hamed, K.H., and A.R. Rao (1998), J. Hydrol. 204, 182–196, doi:10.1016/S0022-1694(97)00125-X.
- Benjamini, Y., and Y. Hochberg (1995), J. R. Stat. Soc. B 57, 289–300, doi:10.1111/j.2517-6161.1995.tb02031.x.
- Wasserstein, R.L., and N.A. Lazar (2016), Am. Stat. 70, 129–133, doi:10.1080/00031305.2016.1154108.
- Hussain, M., and I. Mahmud (2019), pyMannKendall, J. Open Source Softw. 4(39), 1556, doi:10.21105/joss.01556.

Software (all open source): Python — NumPy (BSD-3), SciPy (BSD-3), Shapely (BSD-3), Requests (Apache-2.0),
pyMannKendall (MIT), pytest (MIT). Web — React (MIT), Vite (MIT), TypeScript (Apache-2.0), Observable Plot (ISC), d3-geo (ISC).

## Use of SI

SI coding tools (Claude, Anthropic, via Claude Code) were used to write most of the code, tests and documentation
in this repository and to run the analysis, under the direction and review of the team. Files written this way carry
an "SI disclosure" note in their header, and commits are marked `Co-Authored-By: Claude`. No images, video or audio
were generated with SI. All numbers shown come from the reproducible code in `pipeline/`, never from a language model.

## License

Apache-2.0. See `LICENSE`. No NASA or Space Apps logos are used. NASA does not endorse this project.

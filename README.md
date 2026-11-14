# Trend Detective Lab

**What is changing, where, how fast — and how certain are we?**

An evidence-first climate trend laboratory: pick an Earth-science variable and a region, see the record, and get an
honest statistical answer — including whether two regions really differ.

- **Live app:** https://giuseppeprbst.github.io/trend-detective-lab/
- **Challenge:** NASA Space Apps Challenge 2026 — *Be An Earth System Trend Detective!*
- **Team:** ProGarLabs (Local Event: Quemchi, Chile) — Giuseppe Proboste, Fabiana García

## 1. The problem

Anyone can draw a line through a climate record. The hard part is knowing whether that line means anything.
Monthly climate data are not independent measurements, records are short, and "one region is significant and the
other is not" is routinely misread as "the two regions are different". This project lets a non-specialist run the
investigation properly and see **what the data allow us to conclude — and what they do not**.

## 2. The app

Choose a guided case or investigate freely: variable → region → time series → trend with its uncertainty →
comparison with a second region → the evidence behind every number. The web app **computes no statistics**: it only
displays what the reproducible pipeline in this repository calculated.

Three guided cases, all with real results:

| Case | Regions | What it teaches |
|---|---|---|
| A. A real difference? | Temperature, Los Lagos vs Antofagasta | The difference between the two trends is itself significant in MERRA-2 (ERA5 agrees; the Antofagasta station does not) |
| B. Too little evidence | Temperature, Los Lagos vs Magallanes | "Not significant" is not "no change": ERA5 and the Punta Arenas station show warming in Magallanes that MERRA-2 does not |
| C. One significant, one not | Precipitation, Los Lagos vs Magallanes | That pattern does **not** show the regions differ; and only one of several nominally significant regions survives adjustment for 16 tests |

All three use the comparisons written into the pre-registration. Their lessons were rewritten after the final results.

**Period selector.** Full record, WMO normal 1991–2020 (temperature) and 2000–2024 (common with soil moisture); every
window is recomputed by the pipeline and shown as a sensitivity check.

**Multivariable lab (exploratory).** Choose a phenomenon (water availability, Andean snow, climate) and the app suggests
variables by documented rules; compare trends, see year-to-year association of detrended anomalies, native-cell trend
maps, and the territorial case *Why does Antofagasta's coast behave differently from its interior?* (relief from a
12.5 m DEM and distance to the coast, processed in QGIS; ERA5 check).

## 3. NASA data

| Variable | Collection | Accessed through | Period used |
|---|---|---|---|
| Air temperature at 2 m | MERRA-2 `M2IMNXASM` v5.12.4 (`T2M`), doi:[10.5067/5ESKGQTZG7FO](https://doi.org/10.5067/5ESKGQTZG7FO) — a **reanalysis** | NASA **Giovanni** time-series service (GES DISC) — Giovanni and the GES DISC Hydrology Time Series are listed in the challenge Resources | 1980–2025 |
| Precipitation | GPM IMERG Final Run `GPM_3IMERGM` v07, doi:[10.5067/GPM/IMERG/3B-MONTH/07](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07) — satellite estimate merged with rain gauges | Same service | 1998–2024 |

One request per native grid cell (`https://api.giovanni.earthdata.nasa.gov/timeseries`): 419 MERRA-2 cells and
9,694 IMERG cells cover the 16 regions of Chile. `data/weights/*.csv` lists the cells and weights of every region.

## 4. Method

1. **Regional series.** Area-weighted mean of the native grid cells (weight = area of the cell inside the region). No resampling.
2. **Seasonal cycle removed.** Each month minus the mean of that calendar month.
3. **Main test.** The anomalies are averaged per calendar year; a least-squares line is fitted to the yearly values and its
   standard error is widened for year-to-year persistence (lag-1 effective sample size; Santer et al. 2000, 2008).
   Output: change per decade, 95 % confidence interval, two-sided p-value.
4. **Robustness check.** Theil–Sen slope and Mann–Kendall test on the same yearly values, with the same allowance for persistence.
   Verdict: *significant and robust* (both agree), *method-dependent* (they disagree), or *not significant*.
5. **Comparing two regions.** The same test on the **difference series** A − B.
6. **Many comparisons.** Benjamini–Hochberg adjusted p-values across the 16 regional trends, and separately across the
   120 pairwise differences. Pre-registered comparisons use the unadjusted p-value.

### Pre-registration and what changed afterwards

Regions (all 16, none dropped), periods (full records), the guided comparison (Los Lagos vs Antofagasta and vs
Magallanes), α = 0.05 and the methods were written into the **first commit, before any data were downloaded**
(`git show 4525404:README.md`). We then changed the main test twice, each time because a check failed, and each time
in the direction that makes significant results **harder** to obtain:

| Step | Main test | Why it changed | Evidence |
|---|---|---|---|
| Pre-registered | Least squares on monthly anomalies, lag-1 effective sample size | — | first commit |
| Revision 1 | Same, with a multi-lag effective sample size | Real residuals keep 2–3× more lag-2 correlation than a lag-1 model implies | `docs/validation.md` §1 |
| Revision 2 (final) | Least squares on **yearly means**, lag-1 effective sample size | A simulation study showed revision 1 still gave 10–13 % false positives where 5 % is promised | `docs/calibration.md` |

The calibration study compared nine procedures on eleven kinds of synthetic series with acceptance criteria fixed
beforehand. With slowly decaying memory the pre-registered test gave up to 47 % false positives, Newey–West 21–43 %,
a moving-block bootstrap 20 %, and the yearly-means test 9 %. **No method reached the nominal 5 % everywhere; we use
the best calibrated one, say so, and still show in the app what the two earlier methods would have concluded.**

## 5. Findings (all numbers in `docs/results.md`, generated by the pipeline)

**Temperature (MERRA-2 reanalysis, 1980–2025).**
- Warming is significant and robust in most of northern and central Chile: +0.10 to +0.25 °C per decade
  (11 of 16 regions with p < 0.05; 9 remain below 0.05 after adjustment for 16 regions).
- From Los Lagos southwards no significant trend is detected (Los Lagos +0.05 °C per decade, 95 % CI −0.04 to +0.14).
- Antofagasta warmed significantly faster than Los Lagos (difference 0.18 °C per decade, CI 0.05 to 0.31, p = 0.006).
- Los Lagos and Magallanes cannot be told apart (p = 0.13).

**Precipitation (IMERG, 1998–2024).**
- The central estimate is negative in every region from Coquimbo southwards, but with 27 years most are not significant.
- Only **Magallanes** shows a decrease that is significant, robust and survives adjustment for 16 regions
  (−11 % per decade, CI −17 to −5 %).
- La Araucanía, Los Ríos and Bío-Bío have p < 0.05 on their own but not after adjustment for 16 regions (adjusted p = 0.17).
  La Araucanía sits on the threshold: p = 0.044, and 0.051 with a slightly different lag-1 estimator we used before aligning the
  code with the calibration study.
- Los Lagos: −4.5 % per decade, with a confidence interval that includes zero.
- Magallanes is significant and Los Lagos is not — yet their difference is **not** significant (p = 0.52).

Under our pre-registered method several of these would have looked far more certain (for example Los Ríos
precipitation: p = 0.0003 then, p = 0.03 now, 0.17 after adjustment). That gap is the point of the project.

## 5b. Exploratory extensions (v2) — not confirmatory

Everything here was decided after the main results; families and corrections were written down before computing
(`docs/multivariable/HYPOTHESES_AND_TEST_FAMILIES.md`, `TERRITORIAL_EXPLORATORY_HYPOTHESES.md`). Numbers:
`docs/multivariable/MULTIVARIABLE_RESULTS.md`, `TERRITORIAL_RESULTS.md`; selection: `DISCOVERY_SELECTION.md`.

- **Antofagasta, coast vs interior (MERRA-2, 1980–2025).** Coastal cells (land share < 0.99, classified in QGIS) show no
  warming (−0.03 °C/decade, CI −0.19 to +0.14); interior cells warm +0.27 (CI +0.14 to +0.39). ERA5 at matching points shows
  the same contrast (−0.03 vs +0.28), and the coastal Antofagasta station (−0.09) sits with the coast. Against interior cells
  of similar elevation the coast still warms 0.20 °C/decade less (CI −0.25 to −0.14). Coast and elevation are strongly
  correlated (ρ = 0.90); a cooler ocean-influenced coast is plausible but not proven. This largely explains the earlier
  station/region disagreement.
- **Central Chile, rain and land water (GLDAS-2.1 model, 2000–2024).** Detrended yearly anomalies of IMERG precipitation and
  root-zone soil moisture correlate at r ≈ 0.8 from Valparaíso to Maule (adjusted p < 0.001 across 64 associations).
  Precipitation–evapotranspiration coupling is strong in the north and centre and disappears from La Araucanía southward,
  consistent with water-limited vs energy-limited evaporation (interpretation). GLDAS is forced by observed precipitation, so
  part of the agreement is built in.
- **Snow.** Warmer years tend to have less GLDAS snow in central regions, but only Los Lagos stays below 0.05 after
  correction. In Aysén and Magallanes GLDAS snow accumulates on glacier cells and is not seasonal snow.
- **Start-year sensitivity.** Precipitation trends for 2000–2024 look far stronger than for 1998–2024 (11 vs 4 regions with
  p < 0.05). The confirmatory result uses the full record.
- **Los Lagos (descriptive).** Cells with more plantation and agriculture (CONAF 2018) show steeper modelled soil-moisture
  decline (ρ ≈ −0.6), but GLDAS does not use the CONAF map and those covers sit in the lowland valley: location, not land
  use, may explain it. Not presented as a finding.

## 6. Validation

| Check | What it tests | Result |
|---|---|---|
| Unit tests (`tests/`) | The engine against known synthetic cases; 17 written from the specification by a separate SI agent that could not read the code | all pass |
| Calibration (`docs/calibration.md`) | False-positive rate, power, interval coverage of nine procedures | yearly-means test selected |
| Residual memory, period sensitivity (`docs/validation.md`) | Assumptions on the real data; effect of dropping two years at either end (temperature) | **4 of 16 temperature verdicts change** (Atacama, Coquimbo, Metropolitana, O'Higgins sit near the threshold); an earlier version of this README wrongly said none did |
| Time windows (`docs/multivariable/MULTIVARIABLE_RESULTS.md` E5) | Same test on other periods, both variables | Precipitation is very sensitive to the start year: 4 regions with p < 0.05 for 1998–2024, 11 for 2000–2024. Short-record precipitation trends are fragile |
| NASA POWER (`docs/validation.md`) | Our download, units and area weighting — **same underlying reanalysis, not independent** | mean abs. difference ≤ 0.02 °C |
| Spatial weights (`docs/validation.md` §4) | Weights vs true geodesic areas | within 1 % per cell |
| **NASA Giovanni area averages** (`docs/validation/GIOVANNI_COMPARISON.md`) | Our download, units, averaging and trend vs Giovanni's own *Time Series, Area-Averaged* service, on boxes of the same MERRA-2 cells in Antofagasta, Los Lagos and Magallanes | max. difference 0.0003 °C over 552 months; identical trends |
| QGIS grid check (`docs/gis/QGIS_WORKFLOW.md`) | MERRA-2 cell grid rebuilt in QGIS vs the pipeline's cell list | 51 / 51 cells identical (Antofagasta); 16 / 16 polygons valid |
| Weather stations (`docs/validation_external.md`) | Independent ground observations (Meteostat) at Puerto Montt, Antofagasta, Punta Arenas | Los Lagos consistent; Antofagasta temperature **inconsistent** (station −0.09 °C/decade vs regional +0.23); Magallanes partly (station shows warming and a weaker, non-significant drying) |
| ERA5 (`docs/validation_external.md`) | Another reanalysis, at the same five grid points per region | Los Lagos and Antofagasta consistent; Magallanes partly: ERA5 shows significant warming (+0.18 °C/decade) and no significant drying, MERRA-2/IMERG the opposite |

What this means: the north–south warming contrast and the Los Lagos results are supported by a second reanalysis; the
Magallanes results (no warming, significant drying) are **not** confirmed by ERA5 or by the Punta Arenas station and
should be read as product-dependent. A coastal station (Antofagasta, 135 m) and a mostly inland desert region are not the
same quantity. The exploratory coast/interior analysis (§5b) found that MERRA-2's coastal cells show no warming, like the
station, while interior cells warm; ERA5 shows the same contrast. The disagreement is largely a matter of *where* in the region.
ERA5 and MERRA-2 assimilate many of the same observations, so their agreement is supporting, not independent, evidence.

Giovanni offers no polygons for Chile's regions, so the Giovanni check uses boxes of whole cells inside each region: it
validates the computation exactly, not our treatment of region borders (checked separately against geodesic areas).

## 7. Limitations

- MERRA-2 is a reanalysis, not a measurement; its ~50 km cells do not separate coast from mountains, and most cells of a region straddle its border.
- The test looks for a straight-line trend over the whole period. It says nothing about causes and is not a forecast.
- "Not significant" is not "no change". The final test is cautious and will miss some real trends.
- The test is still not perfectly calibrated (worst simulated case: 8.6 % false positives for 46 years, 10.1 % for 27). No
  method met the 7.5 % criterion fixed beforehand; the fallback rule and the requirement of a confidence interval are
  stated as exceptions in `docs/calibration.md`.
- For Magallanes, independent checks disagree with our NASA products (see §6).
- Measurement uncertainty of the data products is not propagated.
- IMERG is less accurate over steep terrain; 27 years is short for precipitation.
- Two changes were made after pre-registration (documented above).

## 8. Architecture

```
NASA Giovanni time-series service ──► pipeline/fetch.py ──► data/raw (cache, not committed)
   (MERRA-2, IMERG, GLDAS)                │
              region polygons ──► pipeline/build.py ──► web/public/data/*.json + docs/results.md   (confirmatory)
   QGIS 4.2 (qgis/build_layers.py) ──► pipeline/multivar.py ──► multivar/windows/cells_*.json      (exploratory)
                                          │                      │
        pipeline/trend.py (all statistics)┘                      ▼
        calibration.py, validate.py, validate_external.py,       web/ (React, static) ──► GitHub Pages
        validate_giovanni.py (Giovanni ArAvTs)
```

No server, no database: a reproducible batch pipeline and a static site.

## 9. Reproduce

Requires [uv](https://docs.astral.sh/uv/) (Python ≥ 3.12), Node 20, and a free [Earthdata Login](https://urs.earthdata.nasa.gov)
token (approve the "NASA GESDISC DATA ARCHIVE" application in your profile).

```bash
uv sync
export EARTHDATA_TOKEN=...                    # never commit it
uv run python -m pipeline.fetch t2m           # ~4 min, 419 grid cells
uv run python -m pipeline.fetch precip        # ~1.5 h, 9,694 grid cells
uv run python -m pipeline.build               # web/public/data/, docs/results.md
uv run python -m pipeline.validate            # docs/validation.md
uv run python -m pipeline.validate_external   # docs/validation_external.md (stations, ERA5)
uv run python -m pipeline.calibration 800     # docs/calibration.md (synthetic)
for v in soilm_root soilm_surface evap swe; do uv run python -m pipeline.fetch $v; done   # GLDAS, ~15 min each
"<QGIS>/bin/python-qgis.bat" qgis/build_layers.py   # QGIS 4.2: geometry checks, coastal cells
uv run python -m pipeline.multivar            # exploratory lab, docs/multivariable/MULTIVARIABLE_RESULTS.md
"<QGIS>/bin/python-qgis.bat" qgis/make_project.py   # qgis/trend_detective_chile.qgz
uv run --with h5py python -m pipeline.validate_giovanni   # docs/validation/GIOVANNI_COMPARISON.md
uv run pytest
cd web && npm ci && npm run dev
```

## 10. Evidence of development during the event

Work started on 2026-11-14 at 09:03 (UTC−03:00), after the official start. The commit history is the record:
pre-registration first, then data, engine and tests, first results, validation, each method revision, and the app.

## 11. Use of SI

SI coding tools (Claude, Anthropic, via Claude Code) wrote most of the code, tests and documentation in this
repository and ran the analyses, under the direction and review of the team. Files written this way carry an
"SI disclosure" note in their header and commits are marked `Co-Authored-By: Claude`. No images, video or audio were
generated with SI. Every number shown comes from the reproducible code in `pipeline/`, never from a language model.

## 12. References

Data
- Global Modeling and Assimilation Office (GMAO), MERRA-2 instM_2d_asm_Nx V5.12.4, GES DISC, doi:10.5067/5ESKGQTZG7FO.
- Huffman, G.J., et al., GPM IMERG Final Precipitation L3 1 month 0.1° × 0.1° V07, GES DISC, doi:10.5067/GPM/IMERG/3B-MONTH/07.
- NASA Giovanni and the GES DISC time-series service: https://giovanni.gsfc.nasa.gov/ , https://disc.gsfc.nasa.gov/information/tools?title=Hydrology%20Time%20Series
- NASA POWER (consistency check): https://power.larc.nasa.gov/
- Meteostat monthly station data (validation only; CC BY-NC 4.0, not redistributed here — only derived statistics): https://meteostat.net/
- ERA5 (Hersbach et al. 2020, doi:10.1002/qj.3803), served by the Open-Meteo historical weather API (CC BY 4.0): https://open-meteo.com/ . Contains modified Copernicus Climate Change Service information.
- Beaudoing, H. and M. Rodell (2020), GLDAS Noah Land Surface Model L4 monthly 0.25° V2.1, GES DISC, doi:10.5067/SXAVCZFAQLNO; Rodell, M., et al. (2004), BAMS 85, 381–394, doi:10.1175/BAMS-85-3-381.
- CIREN (2016), DEM ALOS PALSAR regional mosaics (Antofagasta, Los Lagos), geoportal.cl; derived from the ASF ALOS PALSAR RTC DEM (ASF DAAC, https://asf.alaska.edu). JAXA/METI ALOS PALSAR.
- CONAF / MINAGRI, Catastro de los Recursos Vegetacionales y Uso de la Tierra: Antofagasta 2019, Los Lagos 2018, IDE MINAGRI (https://ide.minagri.gob.cl).
- Natural Earth 10 m land (public domain), https://www.naturalearthdata.com.
- Region boundaries: geoBoundaries gbOpen CHL ADM1 (Runfola et al. 2020, doi:10.1371/journal.pone.0231866); source Biblioteca del Congreso Nacional de Chile / OCHA ROLAC; CC BY 3.0 IGO.
- Data library handed out at the Quemchi venue (73 resources): audited in `docs/data/OFFICIAL_DATA_LIBRARY_AUDIT.md`.

Methods
- Santer, B.D., et al. (2000), J. Geophys. Res. 105(D6), 7337–7356, doi:10.1029/1999JD901105.
- Santer, B.D., et al. (2008), Int. J. Climatol. 28, 1703–1722, doi:10.1002/joc.1756.
- Sen, P.K. (1968), J. Am. Stat. Assoc. 63, 1379–1389, doi:10.1080/01621459.1968.10480934.
- Mann, H.B. (1945), Econometrica 13, 245–259, doi:10.2307/1907187.
- Hamed, K.H., and A.R. Rao (1998), J. Hydrol. 204, 182–196, doi:10.1016/S0022-1694(97)00125-X.
- Newey, W.K., and K.D. West (1987), Econometrica 55, 703–708, doi:10.2307/1913610.
- Bretherton, C.S., et al. (1999), J. Climate 12, 1990–2009, doi:10.1175/1520-0442(1999)012<1990:TENOSD>2.0.CO;2.
- Benjamini, Y., and Y. Hochberg (1995), J. R. Stat. Soc. B 57, 289–300, doi:10.1111/j.2517-6161.1995.tb02031.x.
- Wasserstein, R.L., and N.A. Lazar (2016), Am. Stat. 70, 129–133, doi:10.1080/00031305.2016.1154108.
- Hussain, M., and I. Mahmud (2019), pyMannKendall, J. Open Source Softw. 4(39), 1556, doi:10.21105/joss.01556.

Software (all open source): QGIS 4.2 (GPL-2.0+) with GDAL/OGR (MIT) for the spatial workflow (`qgis/`); h5py (BSD-3) for the Giovanni check. Python — NumPy (BSD-3), SciPy (BSD-3), Shapely (BSD-3), Requests (Apache-2.0),
pyMannKendall (MIT), pytest (MIT), pyproj (MIT). Web — React (MIT), Vite (MIT), TypeScript (Apache-2.0),
Observable Plot (ISC), d3-geo (ISC).

## 13. License and links

Apache-2.0 (`LICENSE`). No NASA or Space Apps logos are used. NASA does not endorse this project.

- Live app: https://giuseppeprbst.github.io/trend-detective-lab/
- Repository: https://github.com/GiuseppePrbst/trend-detective-lab
- Rules audit: `docs/competition/OFFICIAL_RULES_AUDIT.md`

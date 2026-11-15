# Final submission form — copy to paste (English)

*SI disclosure: drafted with an SI coding tool (Claude) for the team to review, adapt in its own words and paste. Nothing here submits anything.*

**Status checked on 2026-11-15 17:47 −03:00 (public team page, not logged in): the project "Project ProGarLabs" exists, is linked to the right challenge, has every field empty and is NOT submitted (`isSubmitted: false`, `savedAt: null`).** A team member must log in, fill the fields below, tick the declarations and click **Submit for Judging** before 23:59 local time, then check that the page says it was submitted.

Field names below are those the platform uses for the project (`name`, `summary`, `demoLink`, `projectLink`, `details`, `solution`, `aiToolsUsage`, `aiReferences`, `dataReferences`, `projectReferences`). Character limits were not visible without logging in: if a box is shorter, cut from the end of each paragraph.

Every number comes from the published results (`web/public/data/*.json`, `docs/discovery/EVIDENCE_CARDS.md`), checked on 2026-11-15.

---

## Project name

Trend Detective Lab

## Summary

Trend Detective Lab turns NASA Earth data into tested evidence about environmental change. On a 3D globe you explore Chile's 16 regions, open NASA trends with their 95 % intervals and p-values, test whether two trends really differ, and read what the evidence can — and cannot — show. Built by ProGarLabs with MERRA-2, GPM IMERG, GLDAS and MUR SST, an open reproducible pipeline and a public web app.

## Demo link (official demo: video of 30 seconds or less)

https://github.com/GiuseppePrbst/trend-detective-lab/releases/tag/nasa-spaceapps-2026-demo

(The release page plays nothing by itself: it lists the MP4, which opens and plays in the browser from https://github.com/GiuseppePrbst/trend-detective-lab/releases/download/nasa-spaceapps-2026-demo/trend-detective-lab-30s-demo.mp4 — 1920×1080, 30.0 s, SHA-256 `ef0b95684fd6a16a1e6e6ae9de161252874e569a9cff797635512f9fe646c7f5`; checked without logging in, 18:0x −03:00. If the form wants a direct video link, paste the second URL.)

Fallback if the video cannot be hosted in time: the 7-slide English deck `docs/presentation/TrendDetectiveLab_demo.pdf` (public link: https://github.com/GiuseppePrbst/trend-detective-lab/blob/main/docs/presentation/TrendDetectiveLab_demo.pdf).

## Project link

https://giuseppeprbst.github.io/trend-detective-lab/ — code, methods and results: https://github.com/GiuseppePrbst/trend-detective-lab

## Details (what it does, how it works, what it is built with)

Detecting a trend is easy; knowing what it means is not. Regional averages hide where change happens, products disagree, results depend on the period chosen, and "significant" is over-read.

Trend Detective Lab answers the challenge with three layers:

- **Discovery — Earth Atlas.** A CesiumJS globe with Chile's 16 regions coloured by their NASA trends (air temperature, precipitation), native NASA cells clipped to two study territories (Antofagasta, Los Lagos) with 3D relief, the highest and lowest cell trend shown automatically, statistical windows (1980–2025, 1980–2002, 2003–2025) and a colour scale that is either adjusted to the window or fixed across windows, always labelled. A 30-second film made from the same engine introduces the case.
- **Evidence — Research Lab.** For any region and variable: the time series, the trend with its 95 % interval, p-value and false-discovery-rate q across 16 regions, a direct test of the difference between two regions, sensitivity to the period, cross-checks against ERA5 and weather stations (with their dependencies stated) and evidence cards saying what each result supports and what it does not.
- **Reproducibility.** An open Python pipeline (fetch from the NASA Giovanni time-series service, aggregate, test, validate, build the JSON the app reads), 54 science tests and 37 frontend tests in CI, browser smoke tests, and every figure traceable to generated files.

Method: monthly anomalies → yearly means → least-squares slope with a lag-1 effective sample size (chosen and calibrated by simulation; worst simulated false-positive rates 8.6 % at 46 years and 10.1 % at 27 years, disclosed), Theil–Sen and Mann–Kendall as robustness checks, Benjamini–Hochberg across 16 regions, and differences tested on the difference series rather than by comparing two p-values.

Built with Python (NumPy, SciPy, Shapely, pyMannKendall), QGIS / GDAL, React, TypeScript, Vite, CesiumJS, Three.js, Observable Plot, GitHub Actions and GitHub Pages. Open source under Apache-2.0.

## Solution (how it addresses the challenge, key findings)

The challenge asks for a tool to select Earth-science variables, visualise their change over time and determine what is changing, where and whether it is significant. Trend Detective Lab does all four for Chile's 16 regions with NASA products, and adds what a careful reader needs: uncertainty, direct comparisons and disagreement between sources.

Three findings, each with its status:

1. **Confirmatory (pre-registered question).** In MERRA-2, 1980–2025, Antofagasta warmed by +0.23 °C per decade and Los Lagos by +0.05; the difference, tested directly, is +0.18 °C per decade (95 % CI +0.05 to +0.31, p = 0.006).
2. **Exploratory — the regional mean hides a contrast, and the contrast depends on the period.** Inside Antofagasta, coastal cells show −0.03 °C per decade and interior cells +0.27 (difference −0.29, p < 0.001) over 1980–2025; in 2003–2025 both warm (+0.43 and +0.52) and the difference is not significant. Coastal sea-surface temperature (NASA MUR, 2003–2025): +0.11 °C per decade, not significant. No cause is claimed.
3. **Datasets disagree.** In Magallanes, IMERG shows a significant precipitation decline (−12.2 mm/month per decade, 1998–2024, p = 0.001, q = 0.02) that neither the Punta Arenas station nor ERA5 reproduces; the app shows the disagreement instead of hiding it.

Limits stated in the app: trends only (no causes, no forecasts); reanalysis and model products are not direct measurements; 25–50 km cells cannot resolve finer terrain; coast and elevation are confounded at that scale; ERA5 and MERRA-2 share observations.

Users: students and teachers learning to read climate evidence, and regional planners as a first look. The pipeline is region-agnostic (region polygons + Giovanni variables).

## AI tools usage (multiple choice — tick what applies)

- Code generation / programming assistance — **yes** (Anthropic Claude via Claude Code; OpenAI Codex for one independent review)
- Writing / documentation assistance — **yes**
- Audio / music generation — **yes** (MiniMax Music 3.0: the film's instrumental music)
- Image or video generation — **no generative image or video model**: the film is rendered frame by frame from the application itself (see below)
- Data analysis by AI — **no**: every statistic comes from the team's reproducible Python code

## AI references (disclosure)

We used SI coding assistants — Anthropic Claude (Claude Code) for most of the code, tests and documentation, and OpenAI Codex for an independent review — under our direction. The idea, the scientific choices, the review and the decisions are ours (Giuseppe Proboste: data, GIS, statistics; Fabiana García: design, texts, review). Every number in the app, the film and this form is computed by our open Python pipeline from NASA data, not by a language model; files written with SI carry a disclosure note and commits are marked.

The 30-second film is a programmatic render of the live application (headless browser, one frame per 1/30 s, script in `web/scripts/render.mjs`); no image or video generator was used. Its instrumental music is original and was generated with MiniMax Music 3.0, edited to the film by our script (`web/scripts/mix_film_music.py`) and approved by the team; the track belongs to a team member, who approved its use. Credit in the film's description: *"Original instrumental music generated with MiniMax Music 3.0; edited and reviewed by ProGarLabs."* The web application's interface sounds are synthesised in the browser by our code.

## Data references (NASA data and resources)

- NASA Giovanni time-series service at GES DISC (challenge Resources tab):
  - MERRA-2 M2IMNXASM v5.12.4, 2-m air temperature, monthly, 0.5° × 0.625°, 1980–2025 — Global Modeling and Assimilation Office (GMAO), doi:10.5067/5ESKGQTZG7FO
  - GPM IMERG Final Run V07, monthly precipitation, 0.1°, 1998–2024 — doi:10.5067/GPM/IMERG/3B-MONTH/07
  - GLDAS-2.1 Noah, monthly, 0.25°, 2000–2024 (soil moisture, evapotranspiration, snow water equivalent) — doi:10.5067/SXAVCZFAQLNO
- NASA Giovanni area averages, used to validate our processing.
- NASA JPL MUR v4.1 sea-surface temperature, subset with NASA Harmony (PO.DAAC), 2003–2025 — doi:10.5067/GHGMR-4FJ04
- NASA EOSDIS GIBS Blue Marble (basemap of the globe; context only).

## Project references (other data, software, sources)

ERA5 reanalysis via Open-Meteo (Copernicus, CC BY 4.0); Meteostat weather stations (CC BY-NC 4.0); geoBoundaries ADM1 (CC BY 3.0 IGO); USGS GMTED2010 elevation; CIREN DEM (ALOS PALSAR) and CONAF land-use catastro, used with attribution as described in `docs/gis/DATA_LICENSES.md`; Natural Earth. Software: CesiumJS, Three.js, React, Vite, TypeScript, Observable Plot, d3-geo, zustand, NumPy, SciPy, Shapely, pyMannKendall, QGIS, GDAL, FFmpeg. Music: MiniMax Music 3.0. Full list with licences in the repository README.

## Declarations (a team member ticks them)

- Terms and Conditions — read and tick.
- "All work is original" — the team confirms; external resources are listed above.

## After clicking Submit for Judging

Open the public team page in a private window and check that the project shows its name, links and summary, and that the platform reports it as submitted.

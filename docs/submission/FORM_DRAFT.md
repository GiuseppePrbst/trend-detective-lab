# Submission form — draft answers (v3)

Builds on Fabiana's `docs/review/SUBMISSION_FORM_MATRIX.md`. **The real form was not inspected**: field names, required
fields and character limits must be checked on the authenticated page. A team member fills, ticks the declarations
(Terms and Conditions, original work) and clicks "Submit for Judging". Nothing here is submitted.

| Topic | Draft (English) | Source to check before pasting |
|---|---|---|
| Project name | Trend Detective Lab | — |
| Challenge | Be An Earth System Trend Detective! | team page |
| One-line summary | From an environmental question to an evidence-backed answer: explore NASA records for Chile's 16 regions, test trends and differences, and see what the evidence can — and cannot — prove. | app |
| Problem | Detecting a trend is easy; knowing what it means is not. Regional averages hide where change happens, products disagree, short records depend on their start year, and "significant" is over-read. | README "At a glance" |
| What we built | An open web app and reproducible pipeline: question-led variable suggestions with their integration status; time series, trends with 95 % intervals and p-values (autocorrelation-aware, calibrated by simulation); direct tests of differences between regions; fixed-window sensitivity; cross-checks against ERA5 and weather stations with their dependencies; territorial analysis in QGIS; and evidence cards stating what each result supports and what it does not. | app, `docs/discovery/EVIDENCE_CARDS.md` |
| Key results | Confirmatory: in MERRA-2 the regional trends of Antofagasta and Los Lagos differ (+0.18 °C/decade, p = 0.006). Exploratory: inside Antofagasta no statistically significant warming is detected in coastal cells while the interior warmed (difference −0.29 °C/decade), and ERA5 shows the same contrast; in Magallanes, IMERG's significant drying and MERRA-2's lack of warming are not reproduced by ERA5 or a station. | `docs/discovery/EVIDENCE_CARDS.md` (re-check after any rebuild) |
| NASA data and resources | NASA Giovanni (challenge Resources tab) time-series service at GES DISC: MERRA-2 M2IMNXASM v5.12.4 T2M (doi:10.5067/5ESKGQTZG7FO), GPM IMERG Final V07 monthly (doi:10.5067/GPM/IMERG/3B-MONTH/07), GLDAS-2.1 Noah monthly (doi:10.5067/SXAVCZFAQLNO). Giovanni area averages used to validate our processing. *(Add NASA JPL MUR v4.1 SST, doi:10.5067/GHGMR-4FJ04, only if the SST result is published.)* | README §3, §12 |
| Other data | ERA5 via Open-Meteo (Copernicus licence / CC BY 4.0), Meteostat stations (CC BY-NC 4.0), geoBoundaries (CC BY 3.0 IGO), CIREN DEM ALOS PALSAR and CONAF land-use catastro (used with attribution; see `docs/gis/DATA_LICENSES.md`), Natural Earth, USGS GMTED2010. | `docs/gis/DATA_LICENSES.md` |
| Tools | Python (NumPy, SciPy, Shapely, pyMannKendall), QGIS 4.2 / GDAL, React, TypeScript, Vite, Observable Plot; GitHub Actions; GitHub Pages. | README §12 |
| Links | App: https://giuseppeprbst.github.io/trend-detective-lab/ · Code: https://github.com/GiuseppePrbst/trend-detective-lab · Demo: *public link to the PDF deck or ≤ 30 s video* | test in a private window |
| Team | Giuseppe Proboste (data, GIS, statistics), Fabiana García (design, texts, independent review) — ProGarLabs, Local Event Quemchi. | team page |
| AI disclosure (team to confirm in its own words) | "We used SI coding assistants (Anthropic Claude via Claude Code; OpenAI Codex for an independent review) to write most of the code and documentation and to run analyses, under our direction. The idea, the scientific choices and the review are ours. Every number shown comes from our reproducible code, not from a language model. Files written with SI carry a disclosure note; commits are marked. No images, video or audio were generated with SI." | README §11 |
| Limitations to state | Trends only (no causes, no forecasts); the main test's worst simulated false-positive rate is 8.6 % (46 years) and 10.1 % (27 years) instead of 5 %; ERA5 and MERRA-2 share observations; 25–50 km cells cannot resolve finer terrain; exploratory analyses decided after the main results. | README §7 |

Before submitting: re-run `uv run pytest`, check the live site in a private window, and confirm every number against
`docs/discovery/EVIDENCE_CARDS.md`.

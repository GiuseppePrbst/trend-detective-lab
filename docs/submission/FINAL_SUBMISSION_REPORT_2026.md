# Final submission report — NASA Space Apps Challenge 2026

*SI disclosure: written by an SI coding tool (Claude) from verified checks; for the team. No personal data or credentials.*

**State at 20:50 −03:00, Sunday 15 November 2026: READY BUT NOT SUBMITTED.**
The project form is filled and saved (18:08, declarations ticked by the team) but the platform reports `isSubmitted: false` (last read 20:16). A team member must click **Submit for Judging** before 23:59 local time, then check the public team page.

## Published version

| Item | Value |
| --- | --- |
| Repository | https://github.com/GiuseppePrbst/trend-detective-lab (Apache-2.0) |
| `main` | `04c6b97` before this report's PR (its merge commit is the final one) — CI and GitHub Pages green at every merge |
| Live app | https://giuseppeprbst.github.io/trend-detective-lab/ |
| Presenter mode | https://giuseppeprbst.github.io/trend-detective-lab/?present=1 |
| Research Lab | https://giuseppeprbst.github.io/trend-detective-lab/?view=lab |
| Official demo (video, 30.0 s) | https://github.com/GiuseppePrbst/trend-detective-lab/releases/tag/nasa-spaceapps-2026-demo — MP4 SHA-256 `ef0b95684fd6a16a1e6e6ae9de161252874e569a9cff797635512f9fe646c7f5`, downloaded and played without logging in |
| Backup demo (7 slides) | `docs/presentation/TrendDetectiveLab_demo.pdf` |
| Recovery point | the merge commit of this report on `main` (or `04c6b97`); rollback of any later change: `git revert -m 1 <merge>` |

PRs of the final day: #13 Earth Atlas V2 · #14 release record · #15 SST study area · #16 colour scales · #17 film fixed scale · #18 film re-render · #19 presenter mode · #20 form copy · #21 demo link · #22 README · #23 six regional layers · #24 a11y and audit records · #25 first final report · #26 classroom investigation · #27 7-slide deck on Earth Atlas V2 · #28 welcome card · #29 judge experience audit · #30 report · #31 faster first load · #32 keyboard focus order · this report. Still open on purpose: #8, #12 (design contract and Fabiana's observations), #2.

## What the judges get

- **Earth Atlas:** CesiumJS globe; six regional layers for the 16 regions (MERRA-2 air temperature, IMERG precipitation; GLDAS root-zone and surface soil moisture, evapotranspiration, snow water equivalent — exploratory, model output); native MERRA-2 / GLDAS cells clipped to Antofagasta and Los Lagos on 3D relief; windows 1980–2025 / 1980–2002 / 2003–2025 with *spatial contrast* or *fixed comparison* colour scales; NASA MUR SST study area; highest/lowest cell trends; studies; flights.
- **Research Lab:** time series, trends with 95 % CI, p and q, direct difference tests, period sensitivity, ERA5 and station cross-checks, evidence cards.
- **Film** (30 s, programmatic render of the app, MiniMax music) and **presenter mode** (eight cues inside the live app).
- **Classroom investigation** (`docs/education/`): a 15-minute worksheet in the live app and a teacher guide with answers read from the published results (not yet tried with a class).
- **7-slide deck** regenerated on Earth Atlas V2 (`docs/presentation/TrendDetectiveLab_demo.pdf`).
- **README** rebuilt for judges: challenge, product, 60-second guide, three findings, NASA data table, method, validation, limits, reproducibility, AI disclosure, licences.

## Science (checked against the published JSON on 2026-11-15)

| Result | Value | Status |
| --- | --- | --- |
| Antofagasta − Los Lagos, MERRA-2 1980–2025 | +0.183 °C/decade (95 % CI +0.055 to +0.310), p = 0.0064 | confirmatory (pre-registered) |
| Antofagasta coast / interior, 1980–2025 | −0.03 / +0.27, difference −0.29, p < 0.001 | exploratory |
| Same, 2003–2025 | +0.43 / +0.52, difference −0.09, p = 0.63 (not significant) | exploratory — conclusion depends on the period |
| Coastal SST (NASA MUR), 2003–2025 | +0.11 °C/decade, p = 0.45 | registered hypothesis, not significant |
| Magallanes precipitation (IMERG), 1998–2024 | −12.2 mm/month/decade, p = 0.001, q = 0.021 | not reproduced by ERA5 or the Punta Arenas station |
| Regions warming (MERRA-2) | 11 of 16 with p < 0.05; 9 after Benjamini–Hochberg | confirmatory |

No trend was recomputed and no result file changed during the final day. Statistics come from the Python pipeline, never from a language model.

## Tests (last runs)

| Suite | Result |
| --- | --- |
| `uv run pytest -q` | 54 passed |
| `npm test` (vitest) | 43 passed |
| `npm run build` | clean (Node 20.11; CesiumJS declares ≥ 22.17 — documented) |
| `npm run smoke` against production (`a8cda70`) | 29 / 29 passed (seven viewports, no-WebGL fallback, old URLs, six layers, presenter mode, classroom walkthrough); `SLOW=1` check 24: globe usable after 16.0 s on an emulated 1.6 Mb/s connection |
| Judge walkthrough | six tasks in a fresh browser — `JUDGE_UX_AUDIT_2026.md` (not an independent user test) |
| First load (production, same script, empty cache, headless Chrome) | before #31: globe usable 16.3–17.2 s on an emulated 1.6 Mb/s + 150 ms connection, 2.1–3.3 s unthrottled, 2.66 MB before ready; after: **11.8–11.9 s**, **1.8–2.3 s**, **1.94 MB** (relief loaded after the globe, Cesium downloaded in parallel) |
| Keyboard | real Tab presses at 1440×900: header → layers panel → evidence panel → camera → windows → map markers, visible 3 px focus outline at every step (#32); smoke 01 asserts the order |

## Licences and AI

- Code and the project's documentation: Apache-2.0. Third-party data keep their licences; CIREN and CONAF sources are not redistributed (`docs/gis/DATA_LICENSES.md`). The video and its music are not under Apache-2.0.
- AI: Claude (Claude Code) and OpenAI Codex for code and documentation under the team's direction; MiniMax Music 3.0 for the film's instrumental music (AI-generated; labelled in the release text and in the MP4 metadata, MiniMax AIGC label kept; the track belongs to a team member, who approved its use). The film itself is a programmatic render; no image or video generator was used. README §15 and the form say so.
- No NASA or Space Apps logos; independent project.

## Internal evaluation (not official weights)

| Criterion | Score /5 | Main evidence |
| --- | --- | --- |
| Impact | 4.0 | Ready-to-use classroom investigation and teacher guide; six variables for all of Chile; no evidence of real use yet |
| Creativity | 4.1 | Globe + evidence + direct difference tests + film and presenter mode from one engine |
| Validity | 4.5 | Pre-registration, calibration by simulation, cross-checks, 126 automated checks (54 + 43 + 29), numbers audited, judge tasks verified in production |
| Relevance | 4.6 | All four challenge objectives; NASA data from the challenge Resources as the core |
| Presentation | 4.8 | README, 30 s film, deck on V2, presenter mode, welcome card that says what the app is; globe usable about 28 % sooner on slow connections; logical keyboard order |
| **Average** | **4.40** | |

**Eligibility: FAIL until submitted** — every requirement is met except the click on *Submit for Judging*.

## Open items

| Priority | Item | Owner |
| --- | --- | --- |
| P0 | Click **Submit for Judging**; check the public team page | team |
| P1 | The saved form text names two globe layers; six are now online (optional update before submitting) | team |
| P2 | First visit on a slow connection still takes about 12 s (Cesium bundle); no screen reader or phone tested | — |
| P2 | Real devices and screen readers were not tested; performance measured on one desktop GPU | — |

# Pitch and demo script (v2)

The deck is `TrendDetectiveLab_demo.pdf` (7 slides including the title, built by `pipeline/make_deck.py` from the
generated result files). Official demo limit: **7 slides or a video of 30 s or less** (Project Submission Guide). Check
with the Local Lead whether Quemchi also wants a live presentation.

Central message: *Trend Detective Lab reveals what regional climate averages hide — while showing what the evidence can
and cannot prove.*

## 30-second demo video (optional; record the real app)

| Time | On screen (https://giuseppeprbst.github.io/trend-detective-lab/) | Voice-over / subtitle |
|---|---|---|
| 0–5 s | Step 0: click "Coastal climate" → suggested variables with their status | "Start with a question; the app suggests which NASA data can answer it." |
| 5–12 s | Antofagasta case, steps 1–3: regional mean, station, coast vs interior chart | "Antofagasta is warming — but its coast is not. The regional average hid it." |
| 12–18 s | Step 4–5: relief map and ERA5 rows | "Relief and a second reanalysis support the contrast; the cause is not proven." |
| 18–25 s | Magallanes case: bars for IMERG, station, ERA5 | "Here datasets disagree, and we say so: significant is not certain." |
| 25–30 s | An evidence card | "Every result shows what it supports — and what it does not." |

Read every number off the screen when recording; they come from `docs/results.md` and
`docs/multivariable/MULTIVARIABLE_RESULTS.md`.

## Spoken pitch (about 2 minutes)

NASA gives us hundreds of Earth-system variables. The hard part is not getting the data — it is choosing the right
ones and knowing what they really tell us.

Trend Detective Lab is an open web app for Chile's 16 regions. You choose a variable, a region and a period; you see
the record, the trend, and how certain it is. Then you compare regions, and in the new multivariable lab you connect
rainfall with soil moisture, evapotranspiration and snow — all from NASA data obtained through Giovanni.

We don't just show climate trends. We show how confident we can be in them.

Our main study was pre-registered before we downloaded anything. We tested our statistics with simulations, changed
the method when it gave too many false alarms, and checked our numbers against NASA Giovanni's own area averages:
they match to a few ten-thousandths of a degree.

Then we used QGIS to look inside the regions. Antofagasta warmed faster than Los Lagos — that was our pre-registered
question. But over 1980–2025 we detect no significant warming in its coastal cells; the interior warmed. The contrast comes from the
1980s and 1990s, when the coastal cells cooled; since 2003 both have warmed. A second reanalysis and the coastal weather station
agree. A regional average can hide the most interesting part of the story.

In central Chile, rainfall and soil moisture rise and fall together from year to year. But the soil moisture comes from
a model that is itself driven by rainfall, so we call that consistency, not proof. And when we moved the start year of
the precipitation record by just two years, the number of regions with "significant" drying went from four to eleven.
That is exactly why we show uncertainty, corrections and time windows on every screen.

Trend Detective Lab is not a forecast or a warning system. It is a tool for learning how to investigate Earth-system
change honestly — including when the honest answer is "we can't tell yet".

## What not to say

- Not "Chile is drying" or "the coast is cooling": say what the test shows for which product, place and period.
- No causes. Correlation of model soil moisture with rainfall is not independent evidence.
- Separate confirmatory (pre-registered) from exploratory (multivariable lab, coast/interior, windows).
- Not "validated" for Magallanes: products disagree there.

## Territorial case storyboard — "Why does Antofagasta's coast behave differently from its interior?"

1. **Regional mean** (main app, Antofagasta): +0.23 °C/decade, significant. The coastal weather station shows none.
2. **Cells** (lab → coast panel): coastal MERRA-2 cells ≈ 0; interior ≈ +0.27 °C/decade.
3. **Relief** (map `docs/gis/maps/antofagasta_territorial.png`): coastal escarpment and desert interior from the CIREN DEM.
4. **Distance vs altitude** (two scatterplots): both rise inland; restricting the interior to the coastal elevation range
   (still ~360 m higher on average), the coast warms ~0.2 °C/decade less.
5. **Second opinion**: ERA5 at the same points shows the same contrast; the station sits with the coast.
6. **Careful reading**: an ocean-influenced coast is a plausible explanation, not a proven one; 50 km cells cannot separate
   coast from altitude completely. Exploratory.

# Trend Detective Lab — web app

Single-page static app that lets a non-specialist review the evidence for a climate trend in Chile's 16 regions.

**This app computes no statistics.** Every number (slopes, confidence intervals, p-values, verdicts, comparisons) is read from
the JSON files written by the Python pipeline to `public/data/` (see `../docs/data-contract.md`). The app only formats and
plots them; the CSV download re-formats the published series (monthly values and anomalies, plus the yearly means the
test uses). Trend lines and their 95 % bands are drawn from the published slope and CI bounds, pivoting at mid-period.

Optional `public/data/validation.json` adds an "Independent checks" card when it has an entry for the selected
variable and region; without it the app says that no independent check exists yet.

## Run

Requires Node 20.11+ and npm.

```sh
npm install
npm run dev      # development server
npm run build    # type-check + static build in dist/ (works under any sub-path, e.g. GitHub Pages)
npm run preview  # serve dist/
```

`npm run dev` with `?fixture=1` in the URL loads the dev-only fixture in `fixtures/` instead of `public/data/`.
The fixture is **SYNTHETIC** (not NASA data), is labelled as such on screen, and is never included in the production build.

## Dependencies

| Package | Use | Licence |
|---|---|---|
| react, react-dom 19.3.1 | UI | MIT |
| @observablehq/plot 0.6.19 (with d3) | charts and map legend | ISC |
| d3-geo 3.1.1 | SVG map projection | ISC |
| vite 6.4.6, @vitejs/plugin-react 4.7.0 | build (dev only) | MIT |
| typescript 5.8.3, @types/* | type checking (dev only) | Apache-2.0 / MIT |

Region boundaries: geoBoundaries ADM1 (CC BY 3.0 IGO). Data: NASA Giovanni / GES DISC (see the in-app evidence section for citations).

SI disclosure: parts of this code were written with SI coding tools (Claude) and reviewed by the team.
License: Apache-2.0.

# Session handoff (Fable 5.2 → Opus 5.5), 2026-11-14

Internal note for the team.

## State found at 11:28 (UTC−03:00)

- Repository `D:\repos\hackathon-nasa`, branch `improve/calibration-validation`, HEAD `5a5e09d`, 2 commits ahead of
  `origin/main` (`bcbd1d2`). The branch had never been pushed. No other worktrees, no stashes.
- Uncommitted: the second round of UI work (App, charts, format, map, styles, types, fixture), README rewrite,
  `docs/validation_external.md`, `web/public/data/validation.json`, `pipeline/make_deck.py`, the draft deck.
- Processes: only the Vite dev server (port 5179) and MCP servers. No pipeline was running.
- External validation had finished (file timestamp 14:24 UTC); calibration had run with 800 seeds.

## What this session changed

1. **Method audit.** The main test in `pipeline/trend.py` estimated the yearly lag-1 autocorrelation with a different
   estimator from the one used in the calibration study. Aligned with the calibration code. Effect: very small; the
   only verdict that changed was La Araucanía precipitation (p 0.051 → 0.044, nominal only; not significant after FDR).
2. **Calibration decision.** `docs/calibration.md` now states the exceptions openly: the fallback rule was not among
   the three listed criteria; only methods with a confidence interval were eligible (implicit); M8 had a marginally
   lower worst case than M6 (8.4 % vs 8.6 %, within Monte-Carlo error); the worst case at 27 years is 10.1 %; the
   missing-month table uses fewer series. Verdict: **B — keep the yearly method, with additional caveats.**
3. **Planned comparisons.** The `planned` flag now follows the pre-registration (Los Lagos vs Antofagasta and vs
   Magallanes, both variables), not the list of guided cases.
4. **Guided cases** rewritten to use only pre-registered pairs: T2M Los Lagos–Antofagasta; T2M Los Lagos–Magallanes;
   precipitation Los Lagos–Magallanes (with the multiple-comparison lesson). The post-hoc La Araucanía–Los Ríos case
   was removed.
5. Magallanes caveat added to the app limitations, README and deck (ERA5 and the Punta Arenas station disagree).
6. README findings, validation table, references (Meteostat CC BY-NC, Open-Meteo CC BY 4.0, Copernicus notice).
7. Deck regenerated with corrected wording and layout; `docs/presentation/PITCH_AND_DEMO.md` added.

## Checks run

- `uv run pytest`: 19 passed. `npm run build` (includes `tsc --noEmit`): OK, JS 561 kB (185 kB gzip).
- Browser at 1024 px and 375 px: no horizontal overflow, no console errors; the three cases show the expected numbers.
- No tokens in tracked files; `preparacion/`, `data/raw/`, `data/external/` are ignored.

## Still open

- Giovanni web area-average comparison (needs an interactive Earthdata login).
- Team review of texts; Local Lead: local judging time and format.
- Publish the deck (public link) or record the 30-s video; a person submits the form before Sun 15 Nov 23:59.
- Merging this branch into `main` triggers the Pages deploy: do it after review.

# Final delivery report — Immersive Earth and 30 s film

*SI disclosure: written by an SI coding tool (Claude); pending team review.* Date: 2026-11-15, America/Santiago.

## Web

| Item | Value |
| --- | --- |
| PR | [#10](https://github.com/GiuseppePrbst/trend-detective-lab/pull/10) — head `15d0f99` |
| Merge commit on `main` | `28687448ea342c4d8de3de4dbfe1a04a03059b05` (2026-11-15 14:33 UTC) |
| CI on PR / on `main` | success / success |
| Pages deploy run | `43724993998` — success |
| Public URL | https://giuseppeprbst.github.io/trend-detective-lab/ |
| Previous stable deploy | `6b4f643` |

Checked in production (1920×1080): new code served; Cesium `Assets/` and `Workers/` load from `/trend-detective-lab/cesium/` with HTTP 200; NASA GIBS tiles load; no console errors and no 4xx/5xx resources; `?mode=cinematic` plays and Esc stops it, handing the camera to the user at the current pose; `?embed=3d&scene=antofagasta&period=2003-2025&cam=oblique&exag=3&tex=relief` and `?view=lab` work.

Checked on the dev server: fly to Antofagasta, drag/wheel takeover, `?view=3d`, 1440×900 and 390×844 (no horizontal scroll, one expanded panel).

Not checked: real phones, FPS/memory, the no-WebGL fallback in a real browser without WebGL.

## Film

| File (local, git-ignored, `web/out/`) | Format |
| --- | --- |
| `trend-detective-lab-earth-experience-30s.mp4` | **Delivery master.** H.264, 1920×1080, 30 fps, 899 frames, 29.97 s, 34.2 MB, silent |
| `trend-detective-lab-earth-experience-30s-4k.mp4` | H.264, 3840×2160, 30 fps, 29.97 s, 107.1 MB, silent |
| `trend-detective-lab-film-1080p.mp4`, `trend-detective-lab-film-4k.mp4` | Full 30.000 s renders the delivery copies were cut from (stream copy, no re-encode) |

All decode without errors. Review sheet: [`contact_sheet_film_final.jpg`](contact_sheet_film_final.jpg). Storyboard: [`storyboard.png`](storyboard.png).

Figures on screen match `web/public/data/territory.json` → `antofagasta.t4`: 1980–2025 coast −0.03, interior +0.27 °C/decade, difference −0.29 significant; 2003–2025 coast +0.43, interior +0.52, difference −0.09 not significant. The film states that the conclusion depends on the period; it claims no cause.

Hand-off: the last frame is the interactive interface on the same scene and camera as the live app's end-of-film state (same `stateAt(TOTAL)` pose).

## Tests

- `uv run --python 3.13 pytest -q` → 46 passed (scientific pipeline; unchanged by this work).
- `npx tsc --noEmit` → clean. `vite build` → OK (Node 20.11; Cesium 1.147 declares `node >=22.17`, advisory only).
- No frontend unit or E2E tests exist.

## Not committed on purpose

Root files `nasa.svg` (NASA insignia), `progarlabs-isotipo-clean.svg`, `saas-animation.skill`; all renders in `web/out/`.

## Rollback

`git revert -m 1 28687448ea342c4d8de3de4dbfe1a04a03059b05` on `main`, push; Pages redeploys the previous build.

## Left for people

- Team review of the film and the site (Fabiana: design; Giuseppe: science).
- Upload the 1080p film where the submission form can link it (not done by the agent).
- Reconcile with Fabiana's local H1–H2 code if it is shared; PR #8 stays open.
- Optional: sound/narration (plan in `README.md`).
- Submitting the Space Apps form.

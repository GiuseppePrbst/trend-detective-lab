# Earth Atlas V2 — final report

*SI disclosure: written by an SI coding tool (Claude); pending review by Fabiana and Giuseppe.* 2026-11-15, America/Santiago.

Branch `feat/immersive-earth-atlas-v2`, from `main` at `60318fb`. **Not merged and not deployed**: production still serves V1.
What each request became is in [`V2_REQUIREMENTS_MATRIX.md`](V2_REQUIREMENTS_MATRIX.md); how the cartography works, in [`V2_CARTOGRAPHY.md`](V2_CARTOGRAPHY.md); sound, in [`V2_AUDIO.md`](V2_AUDIO.md).

## Tests

| Suite | Command | Result |
| --- | --- | --- |
| Python (science + atlas geometry) | `uv run pytest -q` | **54 passed** (46 existing + 8 in `tests/test_atlas.py`) |
| Frontend unit | `npm test` (vitest, in `web/`) | **19 passed** (`web/src/atlas.test.ts`) |
| Types and build | `npm run build` | clean, Node 20.11 |

CI now runs `npm test` before the build. There is **no browser end-to-end suite**; interactions were checked by hand in a browser and with the captures below. The 46 scientific tests say nothing about the frontend.

What the new tests assert: clipped footprints are exactly native cell ∩ region (nothing outside, nothing missing, valid polygons); the atlas file carries no statistics; SST is drawn on the sea only; place coordinates match the terrain scenes; the yearly series in the film reproduce the published slopes (1980–2025) and the published signs for 2003–2025; the film is 30 s, deterministic, keeps its camera and ends on the interactive pose; a flight between territories rises until no relief is on screen, moves without jumps and is instant with reduced motion; highest/lowest equal the ordering of the published slopes; studies point to real destinations.

## Captures (`docs/immersive/v2/`, 1440×900 unless stated)

| File | Shows |
| --- | --- |
| `before_earth.jpg` → `earth.jpg` | Production V1 vs V2 on load: flags, smaller window strip, guided case |
| `antofagasta.jpg`, `los_lagos.jpg` | Arrival from `?region=`: region-shaped relief on the globe, clipped cells, town and landmark icons, study pins, highest/lowest card |
| `cells_on_globe.jpg` | `relief=0`: the same cells as polygons on the curved globe |
| `regional_t2m.jpg` | Regional air-temperature layer for the 16 regions, region card for Maule |
| `lab.jpg` | Research Lab with the editorial layer |
| `mobile_before_after.jpg` (390×844) | V1, V2 on load, V2 in Antofagasta |
| `film_v1_v2.jpg` | Film at 11 s, 18 s and 23.5 s: V1 left, V2 right |
| `contact_sheet_film_v2.jpg` | Film V2, one frame every 2 s |

Checked by hand in the browser: flag → flight → territory; Antofagasta → Los Lagos and back; cell selection kept; region click and list; regional layers and table; Skip vs Stop; `?view=lab&q=coast`, `?embed=3d&scene=antofagasta&period=2003-2025&cam=oblique&exag=3&tex=relief`; no console errors in any of these.

Not checked: 1920×1080, 1366×768, 1280×720 and 768×1024 layouts; landscape phones; real devices; keyboard-only run-through; screen readers; print preview of the Lab; the no-WebGL fallback after these changes; frame rate, memory and load time.

## Film

All in `web/out/` (git-ignored, local):

| File | What |
| --- | --- |
| `trend-detective-lab-earth-experience-30s.mp4`, `…-30s-4k.mp4` | **V1, approved, untouched** |
| `trend-detective-lab-film-v2-1080p.mp4` | V2 full render: H.264, 1920×1080, 30 fps, 900 frames, 30.000 s, decodes clean |
| `trend-detective-lab-earth-experience-v2-30s.mp4` | V2 silent delivery copy, 29.97 s (stream copy) |
| `trend-detective-lab-earth-experience-v2-30s-audio.mp4` (+ `.wav`, `.cues.json`) | V2 with the sound mix: AAC, integrated loudness −21.8 LUFS, peak −5.5 dBFS, no clipping. **Not listened to; licence unconfirmed** |
| `events-v2.json` | Beat list of V2 |

V2 against the approved V1 — the camera path, shots, captions, numbers, title and last frame's pose are the same code. Three visible differences, for Fabiana to accept or reject:

1. A chart of yearly anomalies (top left, 14.2–24.9 s).
2. The relief has the region's shape and no block or flat ocean around it (her observation 8).
3. The SST area lies on the sea of the globe as a translucent, white-outlined polygon instead of a hatched box on the block.

Hand-off: `poseAt(30)` equals the interactive Antofagasta pose (unit test); the last frame shows the same panels the live app shows after "Skip intro".

## Scientific integrity

- No trend was recomputed or edited. New numbers on screen are either read from published JSON (regional trends, t4, SST) or are the largest/smallest of the published per-cell trends.
- The yearly series are exported by `pipeline/atlas.py` with the pipeline's own `annual_means` on the same cell groups as `territory.json` t4; a test ties their slopes to the published ones.
- The film still states that the conclusion depends on the period and shows 2003–2025 (both warm; difference not significant).
- "Highest/lowest cell trend" is labelled as a trend, with unit, product, window and p; never as an observed extreme.
- Clipping is cartographic; the interface says the value belongs to the whole native cell.
- SST is shown only for 2003–2025 and only over the sea; it is not offered as a national layer.
- No synthetic data was added. The regional layers print a SYNTHETIC notice if a file ever carries that flag.

## Not done, or only partly

- No national native-cell layer (the published files hold cells for two territories only).
- Studies: four cards, one image; no observation-site pins.
- Region search box; GLDAS regional variables on the globe.
- Significance as a pattern on the cells.
- Research Lab: no rewrite into paper sections per investigation; `?region=` does not preselect the Lab's region; two "back" links are visible.
- Sound: film mix unheard; narration unrecorded; licence unconfirmed.
- Browser E2E tests; accessibility audit; performance measurements; 4K render of V2.
- Node: CI and local remain on Node 20 although Cesium 1.147 declares ≥ 22.17.
- `docs/immersive/README.md` and the storyboard describe V1 except for the new V2 section.

## For people to decide

1. Fabiana: the three film differences above, the window strip, flags, cursor and icons.
2. Giuseppe: science wording on the globe (extremes, clipping note, regional layers) and whether V2 should replace V1 in production before the deadline.
3. Whoever holds the Epidemic Sound subscription: listen to the mix and confirm the licence, or keep the silent film.
4. Merging this branch and anything about the contest submission.

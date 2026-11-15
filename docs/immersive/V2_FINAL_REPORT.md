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
| Browser smoke | `npm run dev -- --port 5199`, then `npm run smoke` | **24 passed** (local, headless Chrome 157 with GPU) |

CI runs `npm test` before the build. The browser smoke run (`web/scripts/smoke.mjs`) is **not in CI**: it needs a GPU and the online basemap. The 46 scientific tests say nothing about the frontend.

What the smoke run does on the real page: Whole Earth draws; two flags; flag → flight → relief; the highest/lowest card equals the published per-cell slopes for Antofagasta 1980–2025, Antofagasta 2003–2025 and Los Lagos 2000–2024 without a click; a click keeps a cell; Antofagasta → Los Lagos with the relief off screen at the top of the arc; Escape stops a flight; 16 regions in the list, region card, regional layer, 16-row table, address keeps the region; the Research Lab opens on that region with one link back; Skip and Stop of the intro; `?embed=3d`; `?region=…&relief=0`; sound on/off/volume remembered; no floating element over another at seven viewport sizes; no-WebGL fallback; free orbit of both reliefs (captures). A console error fails the check it happens in.

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
| `mid_flight.jpg` | Antofagasta → Los Lagos, 2.5 s into the flight: both territories as cells on the globe, no relief on screen |
| `sst_2003_2025.jpg` | Antofagasta, window 2003–2025: the MUR SST area on the sea only |
| `orbit_*.jpg` | Free orbit of both reliefs: from the east, low oblique, from above |
| `layout_768x1024.jpg`, `layout_844x390.jpg`, `layout_1280x720_region.jpg` | Tablet, phone lying down, small laptop with a region card (after the layout fixes) |
| `lab_region.jpg`, `no_webgl.jpg` | Research Lab opened from Maule (one link back); the no-WebGL fallback |

Checked by hand in the browser: flag → flight → territory; Antofagasta → Los Lagos and back; cell selection kept; region click and list; regional layers and table; Skip vs Stop; `?view=lab&q=coast`, `?embed=3d&scene=antofagasta&period=2003-2025&cam=oblique&exag=3&tex=relief`; no console errors in any of these.

Not checked: real devices (phones were emulated viewports); keyboard-only run-through; screen readers; the magnifier's hot-spot on a high-DPR screen; a lost WebGL context or a basemap that fails to load mid-session.

## Measurements

One machine: headless Chrome 157, NVIDIA GTX 1650 SUPER (ANGLE D3D11), 1440×900, Vite dev server (unminified), measured by `smoke.mjs` over three runs. Not a benchmark.

| What | Value |
| --- | --- |
| Navigation → globe usable (status gone) | 2.4–3.3 s |
| Flight, Whole Earth → Antofagasta (until relief opaque and extremes shown) | 5.4 s |
| Flight, Antofagasta ↔ Los Lagos | 4.0–4.2 s |
| Frames per second, idle in a territory / during a flight | 137–144 / 136–143 (the display's rate) |
| JS heap after six flights between territories | 202–434 MB (varies with garbage collection; not a leak test) |

Not measured: GPU memory, load time of the production build on a slow network, low-end or mobile hardware.

## Film

All in `web/out/` (git-ignored, local):

| File | What |
| --- | --- |
| `trend-detective-lab-earth-experience-30s.mp4`, `…-30s-4k.mp4` | **V1, approved, untouched** |
| `trend-detective-lab-film-v2-1080p.mp4` | V2 full render: H.264, 1920×1080, 30 fps, 900 frames, 30.000 s, decodes clean. **Re-rendered in the closing pass** because the camera buttons moved (they show in the last 2.7 s); the earlier render is kept in `web/out/v2_prev/` |
| `trend-detective-lab-earth-experience-v2-30s.mp4` | V2 silent delivery copy (stream copy of the re-render: 900 frames, 30.000 s) |
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
- Research Lab: no rewrite into paper sections per investigation; print works but is not polished (narrow catalogue table, half-empty pages).
- Sound: film mix unheard; narration unrecorded; licence unconfirmed.
- Browser smoke run in CI; accessibility audit; performance on other hardware; 4K render of V2.
- Node: CI and local remain on Node 20 although Cesium 1.147 declares ≥ 22.17. Tests, build and the smoke run pass on 20.11, which shows that it works, not that it is supported. Left unchanged on purpose on delivery day (the team's machine and the Pages workflow are pinned to 20); afterwards: Node 22 LTS locally and `node-version: 22` in both workflows, then the same suites.
- `docs/immersive/README.md` and the storyboard describe V1 except for the new V2 section.

## For people to decide

1. Fabiana: the three film differences above, the window strip, flags, cursor and icons.
2. Giuseppe: science wording on the globe (extremes, clipping note, regional layers) and whether V2 should replace V1 in production before the deadline.
3. Whoever holds the Epidemic Sound subscription: listen to the mix and confirm the licence, or keep the silent film.
4. Merging this branch and anything about the contest submission.

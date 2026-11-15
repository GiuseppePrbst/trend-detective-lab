# Immersive Earth and the 30-second film

*SI disclosure: this document and the code it describes were written with the assistance of an SI coding tool (Claude) and are pending human team review.*

Trend Detective Lab now has three surfaces that share one scene, one data set and one colour scale.

| Surface | URL | What it is |
| --- | --- | --- |
| Immersive Earth | `./` | The planet fills the viewport; controls float over it. |
| Research Lab | `./?view=lab` (and every earlier link: `?q=…`, `?embed=3d…`, `?view=3d`, `#anchors`) | The complete scientific application, unchanged. |
| Cinematic mode | `./?mode=cinematic` | The 30 s introduction, played live on the same scene; it ends on the interactive state. |

If the browser has no WebGL, the entry opens the Research Lab (with its 2D maps) and says why.

## One scene, two engines, one camera

- **CesiumJS** draws the Earth: one persistent `Viewer`, never destroyed while the page lives, rendered **on demand** (no render loop of its own).
- **Three.js** draws the regional terrain and its native climate cells, on top of the globe and georeferenced on it. It only draws while the terrain is visible.
- Both follow one **georeferenced pose** (`engine/geo.ts`: target lon/lat, heading, pitch, range). Film keyframes, interactive flights and pointer input all produce poses, so the two engines cannot drift apart. The terrain appears as a function of camera range (`terrainAlpha`, `reliefRise` in `cinematic/timeline.ts`) — the same rule for the film and for free navigation.
- The terrain engine (`engine/terrain.ts`) was extracted from `terrain3d.tsx`; the Research Lab's 3D view imports it. There is one mesh builder, one overlay painter and one colour ramp.
- No tone mapping, bloom or depth of field is applied: cell colours must match the legend exactly. This is a deliberate limit on "cinematic" effects.

Files: `web/src/engine/{terrain,geo,earth}.ts`, `web/src/cinematic/timeline.ts`, `web/src/experiences/{stage.ts,immersive.tsx,immersive.css}`, `web/src/main.tsx`.

### Basemap and external services

- Basemap: **NASA Blue Marble: Next Generation** (shaded relief and bathymetry) from NASA EOSDIS **GIBS** public WMTS (`gibs.earthdata.nasa.gov`, no key, CORS open). It is context, labelled as such on screen; it is not one of the analysed datasets and is not on the challenge's Resources list.
- If GIBS cannot be reached, the app falls back to the **Natural Earth II** texture bundled with Cesium (public domain). The Methodology panel says which one is in use.
- No Cesium ion, no token, no terrain service, no paid service. Cesium's runtime files are copied from `node_modules` to `web/public/cesium/` by `npm run cesium` (run automatically by `dev` and `build`; the folder is git-ignored).
- Sun position is fixed at 2025-06-21 20:30 UTC so frames are reproducible. The day/night line is lighting, not data.

## Time: three different things

1. **Film time** (0–30 s): a camera and reveal schedule.
2. **Statistical period**: the window a trend was computed for (1980–2025, 1980–2002, 2003–2025 for Antofagasta; 2000–2024 for Los Lagos). The bottom dock selects one of these published results.
3. **Observation date**: not offered. No monthly or yearly frames are published, so none are drawn or interpolated. In the film the change of period is a dip to transparent and back, never a blend.

## The film

- Timeline: `web/src/cinematic/timeline.ts`. Every beat is a constant at the top; `stateAt(t)` is a pure function.
- Storyboard with real frames: [`storyboard.png`](storyboard.png) (source [`storyboard.html`](storyboard.html)); review sheet: [`contact_sheet_stills.jpg`](contact_sheet_stills.jpg).
- Figures on screen (coast, interior, difference, verdict) are read from `web/public/data/territory.json` when the frame is drawn.

Render (from `web/`, after `npm run build`; needs Chrome and ffmpeg):

```sh
npm run film -- video out/trend-detective-lab-film-1080p.mp4 --fps 30 --scale 1
npm run film -- video out/trend-detective-lab-film-4k.mp4 --fps 30 --scale 2
npm run film -- stills out/stills 1 7 11.6 16 24 30
npm run film -- events out/events.json        # beat list for sound sync
uv run --no-project --with pillow python scripts/contact_sheet.py out/stills out/sheet.jpg
```

`web/scripts/render.mjs` is adapted from the team's `saas-animation` skill: same page contract (`window.renderAt(t)`, `window.TOTAL`, `window.ready`, `window.EVENTS`), but each frame is a screenshot of the whole page, because the picture is two WebGL canvases plus the real interface. `renderAt` waits until every basemap tile for the view has arrived. The skill targets 8–20 s; this film is 30 s with six shots on one continuous, monotone camera spline. Rendered videos are not committed (`web/out/` is git-ignored).

### Departures from the skill's style rules, on purpose

- Terrain fades in over the globe (a dissolve in place) instead of a shape morph: the region stays where it is on the planet, which matters more here.
- No depth of field or motion blur: labels and cells must stay legible and true to the legend.

### Sound (proposal — nothing generated, no paid service used)

The picture is silent. Beats are in `out/events.json`.

| Time | Sound |
| --- | --- |
| 0.0 s | Low, quiet pad fades in; no melody |
| 4.0, 8.4 s | Soft filtered swell as the camera descends |
| 9.6 s | Low rumble rising slightly while the relief lifts |
| 13.4–17.6 s | Light, dry ticks, one per group of cells, panned west to east |
| 22.0 s | Short reversed swell into a single clean tone on the period change |
| 25.2 s | Warm chord under the title |
| 27.3–30 s | Pad resolves and fades; the last second is nearly silent |

The skill's `synth_sfx.py` and `mix.py` can build and place a free kit on these beats once the team approves the picture.

### Optional narration (English, human voice)

> Earth is changing. But change is not uniform. Look beyond regional averages: in Antofagasta, NASA's MERRA-2 reanalysis shows the coast and the interior diverging over 1980 to 2025 — yet since 2003 both warmed, and their difference is not significant. The conclusion depends on where, and when, you look. Trend Detective Lab. Explore Earth. Understand change.

Check the sentence against `territory.json` before recording: it states the direction of the contrast only, no figures and no cause.

## Design

- Colours: the PR #8 contract (`#060D1A`, `#101A2C`, `#34465C`, `#EFF6FF`, `#A8BDD0`, accent `#4CD9E6`, warning `#F59E0B`) plus ProGarLabs purple `#7B00FF` / `#330099`, taken from the ProGarLabs isotype file. Purple and cyan are never used for physical magnitudes; data use RdBu / BrBG.
- Type and shape grammar from the team's editorial design system (the Claude artifact given as reference): Anton capitals for display, Archivo for text, Space Mono for every datum and label, `01 _` indices, square corners, hard offset shadow, bottom bar with signature and folio. That artifact is themed for a different event; its event-specific blue and paper theme were **not** carried over.
- Fonts are self-hosted (`@fontsource`, SIL OFL).
- Panels are `closed | minimized | expanded`; the canvases never change size. On small screens one sheet is expanded at a time.

## Branding and attribution

- Text only: "Built by ProGarLabs · Using NASA Earth science data · Developed for NASA Space Apps Challenge 2026", plus "Independent project: not affiliated with or endorsed by NASA".
- **No NASA insignia and no Space Apps logo** are used anywhere (project rule; the NASA insignia may not be used without NASA's permission). The ProGarLabs isotype is the team's own.

## What is not done (honest list)

- Fabiana's local H1–H2 branches (`feat/immersive-foundation`, `feat/immersive-globe`) were not published anywhere reachable, so this base was rebuilt from the PR #8 specification. It must be reconciled with her code when it is shared.
- PR #8 asks for TanStack Query, Zod contracts and a `ClimateDataService` port; this slice adds Zustand only and reads the existing JSON through `data.ts`. No frontend unit or E2E tests were added.
- Variables in the immersive view are the two that have a terrain scene: MERRA-2 air temperature (Antofagasta) and GLDAS root-zone soil moisture (Los Lagos). IMERG, the other GLDAS variables and the 16-region results remain in the Research Lab.
- Compare and Trends panels show the Antofagasta coast/interior results; Los Lagos shows per-cell values only.
- The Three.js renderer is kept alive (idle, not drawing) when the camera returns to the whole Earth; it is disposed with the page.
- Not measured: FPS, memory, real phones, projector. Checked in a browser: 1440×900, 1440×810, 390×844 and 375×812 emulations; fly-to, skip intro, drag/zoom takeover, `?view=lab`, `?view=3d`, `?embed=3d&scene&period&cam&exag&tex`.
- Final film review sheet (frame every 2 s): [`contact_sheet_film_final.jpg`](contact_sheet_film_final.jpg).
- No sound, no narration recorded.

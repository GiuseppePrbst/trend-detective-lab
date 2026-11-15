// The master scene: one stage shared by free exploration and by the film.
// Cesium draws the planet and the data on its curved surface (clipped native cells, regional fills); Three.js draws the
// relief of a study territory, cut to the region's shape and bent with the planet. Both follow one georeferenced pose.
// Cesium is drawn on demand; Three.js only draws while the relief is visible. No trend is computed here.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import * as THREE from 'three';
import { create } from 'zustand';
import { EVENTS, DEST, flightPose, PERIOD_B, planFlight, poseAt, reliefRise, smooth, stateAt, terrainAlpha, TOTAL, WHOLE_EARTH, type FilmState, type Flight } from '../cinematic/timeline';
import { load } from '../data';
import { createEarth, type Earth, type RegionShape } from '../engine/earth';
import { FOV_Y, poseToLocal, toUV, type Pose } from '../engine/geo';
import { buildTerrain, colourDomain, EARTH_R, inside, KM, loadScene, paintMask, paintOverlay, ramp, SCENES, stopsFor, type Loaded, type Scene, type SceneId } from '../engine/terrain';
import { num, pval, signed, VERDICT_SHORT } from '../format';
import { extremesOf, kmBetween, sstLines, visibleCellAt, type AreaTrend, type Extreme } from './pure';
import type { Regions } from '../types';

export type Mode = 'explore' | 'trends' | 'compare' | 'methodology';
export type PanelState = 'closed' | 'minimized' | 'expanded';
/** what the globe is coloured by: the native cells of the two study territories, or one regional trend for the 16 regions */
export type Layer = 'cells' | 't2m' | 'precip';
export type Atlas = {
  cells: Record<SceneId, [number, number][][][][]>;
  sst_sea: [number, number][][][];
  places: { name: string; lat: number; lon: number; kind: 'city' | 'landmark'; scene: SceneId }[];
  series: { antofagasta: { years: number[]; coastal: number[]; interior: number[]; n_coastal: number; n_interior: number; unit: string; what: string; product: string } };
};
/** terrain scene id → region id of the published results (they differ: los_lagos vs los-lagos) */
export const REGION_OF: Record<SceneId, string> = { antofagasta: 'antofagasta', los_lagos: 'los-lagos' };
const IDS = Object.keys(SCENES) as SceneId[];
const DEFAULTS = { scene: 'antofagasta' as SceneId, period: SCENES.antofagasta.periods[0] as string, cells: true, sst: true, opacity: 0.55, exag: 2,
  selected: null as number | null, terrainOn: true, layer: 'cells' as Layer };

export type StageState = typeof DEFAULTS & {
  mode: Mode; left: PanelState; right: PanelState; hideUi: boolean;
  film: boolean; t: number;
  status: 'loading' | 'ready' | 'error'; error: string;
  near: boolean;                 // the camera is inside one of the two study territories
  region: string | null;         // selected region (one of the 16), by id
  regionNames: Record<string, string>;
  /** highest and lowest CELL TREND of the active territory and period (not observed extremes) */
  extremes: { scene: SceneId; period: string; max: Extreme; min: Extreme } | null;
  /** the selected cell, kept until it is closed (touch has no hover) */
  picked: { title: string; lines: string[]; note?: string } | null;
  atlas: Atlas | null;
  basemap: 'gibs' | 'bundled' | null;
  sstSlope: number | undefined;  // from sst.json, set by the UI once loaded
  sstTrend: (AreaTrend & { verdict: string }) | undefined;
  scale: number; sources: string[]; places: string[];
  tip: { x: number; y: number; lines: string[] } | null;
};
export const PHONE = '(max-width: 760px), (max-height: 500px)';   // same condition as the phone block of immersive.css
export const useStage = create<StageState>(() => ({
  ...DEFAULTS, mode: 'explore', left: matchMedia(PHONE).matches ? 'minimized' : 'expanded', right: matchMedia(PHONE).matches ? 'minimized' : 'expanded',   // phones open on the planet
  hideUi: false, film: false, t: 0,
  status: 'loading', error: '', near: false, region: null, regionNames: {}, extremes: null, picked: null, atlas: null,
  basemap: null, sstSlope: undefined, sstTrend: undefined, scale: 1, sources: [], places: [], tip: null,
}));

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const R = Math.PI / 180;
const bboxOf = (r: [number, number][]) => r.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
export async function mountStage(els: { root: HTMLElement; globe: HTMLElement; terrain: HTMLElement; input: HTMLElement; labels: HTMLElement; markers: HTMLElement }, capture: boolean) {
  const set = useStage.setState, get = useStage.getState;
  const [geo, atlas, ...metaList] = await Promise.all([load<Regions>('regions.geojson'), load<Atlas>('atlas.json'),
    ...IDS.map((id) => fetch(`${import.meta.env.BASE_URL}scene3d/${id}/scene.json`).then((r) => r.json() as Promise<Scene>))]);
  const metas = Object.fromEntries(IDS.map((id, i) => [id, metaList[i]])) as Record<SceneId, Scene>;
  const scaleOf = Object.fromEntries(IDS.map((id) => [id, colourDomain(metas[id], id)])) as Record<SceneId, number>;
  const feats = (geo?.features ?? []) as unknown as { properties: { id: string; name: string }; geometry: { type: string; coordinates: unknown } }[];
  const shapes: (RegionShape & { boxes: number[][]; box: number[] })[] = feats.map((f) => {
    const rings = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates as unknown[]).map((poly) => (poly as [number, number][][])[0]);   // outer ring of every polygon
    const boxes = rings.map(bboxOf);
    return { id: f.properties.id, rings, boxes, box: boxes[rings.reduce((m, r, i) => (r.length > rings[m].length ? i : m), 0)] };
  });
  set({ regionNames: Object.fromEntries(feats.map((f) => [f.properties.id, f.properties.name])), atlas });
  const earth: Earth = await createEarth(els.globe, shapes);
  if (atlas) for (const id of IDS) earth.addLayer(`cells:${id}`, atlas.cells[id]);
  if (atlas) {                                                // the ocean product lies on the sea of the globe, never on the land relief
    earth.addLayer('sst', [atlas.sst_sea]);                   // a barely visible wash, so the ocean stays the ocean
    earth.addDash('sst', atlas.sst_sea.map((rings) => rings[0]), '#8FE9F0');   // the study footprint, dashed
  }
  const regionAt = (ll: [number, number]) => shapes.find((sh) => sh.rings.some((r, i) => { const b = sh.boxes[i]; return ll[0] >= b[0] && ll[0] <= b[2] && ll[1] >= b[1] && ll[1] <= b[3] && inside(ll, r); }))?.id ?? null;
  const perOf = (id: SceneId, period: string) => ((SCENES[id].periods as readonly string[]).includes(period) ? period : SCENES[id].periods[0]);
  const css = (id: SceneId, slope: number) => `#${ramp(stopsFor(id) as unknown as string[], (slope / scaleOf[id] + 1) / 2).getHexString()}`;
  const layerCache = new Map<string, { fill: (string | null)[]; line: (string | null)[] }>();
  let regionFill: { version: string; colours: Record<string, string | null> } | null = null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;      // no tone mapping or bloom on purpose: cell colours must match the legend
  els.terrain.appendChild(renderer.domElement);
  const scene3 = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(FOV_Y, 1, 10, 20000);
  const paint = document.createElement('canvas'), maskCanvas = document.createElement('canvas');
  let terrain: ReturnType<typeof buildTerrain> | null = null, data: Loaded | null = null, loadedId: SceneId | null = null, wanted: SceneId | null = null;
  let paintKey = '', maskKey = '', frameKey = '', settled = false, dead = false, raf = 0;
  let clipUV: [number, number][][][][] | undefined, landUV: [number, number][][] = [];

  async function ensureScene(id: SceneId) {
    if (wanted === id) return;
    wanted = id;
    const d = await loadScene(id);
    if (wanted !== id || dead) return;
    terrain?.dispose();                                    // one regional relief in memory at a time
    data = d; loadedId = id; paintKey = ''; maskKey = ''; frameKey = '';
    terrain = buildTerrain(d, scene3, renderer.capabilities.getMaxAnisotropy(), true);
    const uv = (r: [number, number][]) => r.map(([lo, la]) => toUV(d.scene, lo, la));
    clipUV = atlas?.cells[id].map((polys) => polys.map((rings) => rings.map(uv)));       // visible footprint = native cell ∩ region
    landUV = (shapes.find((sh) => sh.id === REGION_OF[id])?.rings ?? []).map(uv);
    set({ sources: d.scene.sources, places: d.scene.places.map((p) => p.name) });
  }

  let W = 0, H = 0;
  const resize = () => {
    W = els.root.clientWidth; H = els.root.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H); cam.aspect = W / Math.max(1, H); cam.updateProjectionMatrix(); frameKey = '';
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(els.root);

  let pose: Pose = capture ? poseAt(0) : WHOLE_EARTH;
  let flight: (Flight & { t0: number; swap: SceneId | null }) | null = null;
  let filmT0 = 0;
  const v3 = new THREE.Vector3();

  /** lon/lat → screen. Inside the visible relief the point rides on the terrain; elsewhere it sits on the globe. */
  function toScreen(lon: number, lat: number, a: number, sceneId?: string): [number, number] | null {
    if (a > 0.5 && terrain && data && sceneId === loadedId) {
      const [u, v] = toUV(data.scene, lon, lat);
      if (u > 0 && u < 1 && v > 0 && v < 1) {
        const { nx, ny } = data.scene.grid, h = data.heights[Math.min(ny - 1, Math.floor(v * ny)) * nx + Math.min(nx - 1, Math.floor(u * nx))];
        const x = (u - 0.5) * terrain.W, z = (v - 0.5) * terrain.H;
        v3.set(x, (Math.max(0, h) / KM) * terrain.exag() - terrain.dropAt(x, z) + 2, z).project(cam);
        return v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1 ? [((v3.x + 1) / 2) * W, ((1 - v3.y) / 2) * H] : null;
      }
    }
    return earth.project(lon, lat);
  }
  const widths = new WeakMap<Element, number>();
  /** Georeferenced HTML markers (flags, places, studies, extremes): position, scale range, occlusion and label collisions. */
  function placeMarkers(range: number, a: number, film: boolean) {
    const taken: number[][] = [];
    for (const el of Array.from(els.markers.children) as HTMLElement[]) {
      const d = el.dataset;
      // a place label of the visible relief is drawn by the terrain itself (it rides on the mountains)
      const hidden = film || range > Number(d.max ?? Infinity) || range < Number(d.min ?? 0) || (d.yield === '1' && a > 0.5 && d.scene === loadedId);
      const xy = hidden ? null : toScreen(Number(d.lon), Number(d.lat), a, d.scene);
      if (!xy) { el.style.display = 'none'; continue; }
      el.style.display = '';
      let w = widths.get(el);
      if (w == null) { w = el.offsetWidth; widths.set(el, w); }
      const flip = el.classList.contains('im-flag') && xy[0] + w > W - 4;      // a flag near the right edge flies to the left
      el.classList.toggle('is-flip', flip);
      el.style.transform = `translate(${Math.round(xy[0] - (flip ? w - 2 : 0))}px, ${Math.round(xy[1])}px)`;
      const box = [xy[0] - 8, xy[1] - 22, xy[0] + w, xy[1] + 8];
      const crowded = d.keep !== '1' && taken.some((t) => box[0] < t[2] && box[2] > t[0] && box[1] < t[3] && box[3] > t[1]);
      el.classList.toggle('is-crowded', crowded);          // the icon stays, the name hides
      if (!crowded) taken.push(box);
    }
  }

  /** Draw one frame for a pose. With a film state, layers follow the timeline; otherwise they follow the controls. */
  function apply(fs: FilmState | null) {
    const s = get(), p = fs ? fs.pose : pose;
    const ui = fs ? fs.ui : s.hideUi ? 0 : 1;
    els.root.style.setProperty('--ui', String(ui));
    els.root.classList.toggle('ui-off', ui < 0.5);
    const per = loadedId ? (fs ? fs.period : perOf(loadedId, s.period)) : s.period;
    const nearK = terrainAlpha(p.range);
    const home = kmBetween(p, DEST[fs ? 'antofagasta' : s.scene]) < 700;      // inside the active study territory (whether or not its relief has loaded)
    const a = data && terrain && (fs || (s.terrainOn && home && loadedId === s.scene)) ? nearK : 0;
    const key = JSON.stringify([p, loadedId, per, s.period, s.scene, s.cells, s.sst, s.opacity, s.exag, s.selected, s.sstSlope, s.terrainOn, s.layer, s.region, regionFill?.version,
      s.extremes?.max.i, s.extremes?.min.i, els.markers.childElementCount, fs?.reveal, fs?.cellFade, W, H]);
    if (key === frameKey && settled) return;
    frameKey = key;

    earth.setPose(p);
    const inTerritory = nearK > 0.5 && home;
    earth.setOutlines((1 - smooth(Math.log(9000), Math.log(17000), Math.log(p.range))) * (1 - 0.75 * a), fs ? REGION_OF.antofagasta : s.region ?? (inTerritory && loadedId ? REGION_OF[loadedId] : null));
    // data on the curved globe: clipped native cells of both territories, or one regional trend for the 16 regions
    const far = 1 - smooth(Math.log(5200), Math.log(9500), Math.log(p.range));
    for (const id of IDS) {
      const pi = perOf(id, s.period), sel = s.scene === id ? s.selected : null, ver = `${id}|${pi}|${sel}`;
      let c = layerCache.get(ver);
      if (!c) {
        c = { fill: metas[id].cells.map((x) => (x.trends[pi] ? css(id, x.trends[pi].slope) : null)),
          line: metas[id].cells.map((x, i) => (!x.trends[pi] ? null : i === sel ? '#4CD9E6' : x.coastal ? '#0f0f0f' : '#3a3a3a')) };
        layerCache.set(ver, c);
      }
      earth.setLayer(`cells:${id}`, ver, c.fill, c.line, fs || s.layer !== 'cells' || !s.cells ? 0 : far * s.opacity * (id === loadedId ? 1 - a : 1));
    }
    // NASA MUR SST: one value for the sea box, only for the window it was computed for (2003–2025)
    // a study area, not a coloured cell: dashed turquoise outline and an 8 % wash, never the air-temperature colour scale
    const sstA = sstVisible(fs) ? (fs ? fs.cellFade : far) : 0;
    earth.setLayer('sst', 'study-area', ['#4CD9E6'], [null], sstA * 0.08);
    earth.setDash('sst', sstA * 0.9);
    if (regionFill && earth.hasLayer('regions')) earth.setLayer('regions', regionFill.version, shapes.map((sh) => regionFill!.colours[sh.id] ?? null), shapes.map(() => null), fs || s.layer === 'cells' ? 0 : 0.7);
    earth.render();
    settled = earth.loaded();

    els.terrain.style.opacity = String(a);
    els.terrain.style.visibility = a > 0.001 ? 'visible' : 'hidden';
    els.labels.style.opacity = String(smooth(0.7, 1, a));
    if (s.near !== inTerritory) set({ near: inTerritory });
    if (a > 0.001 && data && terrain && loadedId) {
      terrain.setExag(Math.round(s.exag * reliefRise(p.range) * 40) / 40);
      if (loadedId !== maskKey) { maskKey = loadedId; terrain.setMask(paintMask(data, landUV, false, maskCanvas)); }
      const ex = !fs && s.extremes?.scene === loadedId && s.extremes.period === per ? [s.extremes.max.i, s.extremes.min.i] : undefined;
      const o = { tex: 'relief', period: per, cells: s.cells && (!!fs || s.layer === 'cells'), opacity: s.opacity * (fs ? fs.cellFade : 1), D: scaleOf[loadedId], stops: stopsFor(loadedId) as unknown as string[],
        reveal: fs ? fs.reveal : 1, selected: s.scene === loadedId ? s.selected ?? undefined : undefined, marks: ex };
      const pk = loadedId + JSON.stringify(o);
      if (pk !== paintKey) { paintKey = pk; terrain.setMap(paintOverlay(data, { ...o, clip: clipUV }, paint)); }
      const L = poseToLocal(data.scene, terrain.W, terrain.H, p, EARTH_R);
      cam.position.set(...L.position); cam.up.set(...L.up); cam.lookAt(...L.target);
      renderer.render(scene3, cam);
      const named: number[][] = [];
      data.scene.places.forEach((pl, i) => {               // place labels ride on the terrain
        const d = els.labels.children[i] as HTMLElement | undefined;
        if (!d) return;
        const x = (pl.uv[0] - 0.5) * terrain!.W, z = (pl.uv[1] - 0.5) * terrain!.H;
        const v = v3.set(x, (pl.z / KM) * terrain!.exag() - terrain!.dropAt(x, z) + 2, z).project(cam);
        d.style.display = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 ? '' : 'none';
        const sx = ((v.x + 1) / 2) * W, sy = ((1 - v.y) / 2) * H, w = pl.name.length * 7.5 + 22;   // ponytail: width estimated from the name's length, measure the span if labels ever change font
        d.style.transform = `translate(${sx}px, ${sy}px)`;
        const crowded = d.style.display === '' && named.some((t) => sx < t[0] + t[2] && sx + w > t[0] && Math.abs(sy - t[1]) < 24);
        d.classList.toggle('is-crowded', crowded);        // as for the markers: the icon stays, the name hides
        if (!crowded && d.style.display === '') named.push([sx, sy, w]);
      });
    }
    placeMarkers(p.range, a, !!fs);
  }

  function sstVisible(fs: FilmState | null) {
    const s = get();
    return !!atlas && s.sst && s.sstSlope != null && (fs ? fs.period : perOf('antofagasta', s.period)) === '2003-2025' && (!!fs || (s.layer === 'cells' && s.cells));
  }
  /** the SST study area under a screen point (when it is shown): one area-averaged trend from sst.json */
  function sstAt(x: number, y: number) {
    const s = get(), ll = earth.pick(x, y);
    if (!ll || !atlas || !s.sstTrend || !sstVisible(null) || visibleCellAt(ll, [atlas.sst_sea]) !== 0) return null;
    return sstLines(s.sstTrend, VERDICT_SHORT[s.sstTrend.verdict as keyof typeof VERDICT_SHORT]?.toLowerCase() ?? s.sstTrend.verdict);
  }
  const SST_TITLE = 'NASA MUR SST · Coastal study area';
  function endFilm(at = TOTAL) {
    const fs = stateAt(at);
    pose = fs.pose;
    set({ film: false, t: 0, period: fs.period, hideUi: false });
    if (at >= TOTAL) set({ period: PERIOD_B, region: REGION_OF.antofagasta });
  }
  function tick(now: number) {
    if (dead) return;
    raf = requestAnimationFrame(tick);
    if (capture) return;                                   // frames are drawn by renderAt only
    const s = get();
    if (s.film) {
      const t = (now - filmT0) / 1000;
      if (t >= TOTAL) endFilm(); else { const fs = stateAt(t); set({ t, period: fs.period }); apply(fs); return; }
    }
    if (flight) {
      const k = flight.dur ? Math.min(1, (now - flight.t0) / flight.dur) : 1;
      pose = flightPose(flight, k);
      // the destination's relief replaces the origin's only while neither is on screen (at the top of the arc)
      if (flight.swap && (k >= 1 || terrainAlpha(pose.range) < 0.01)) { void ensureScene(flight.swap); flight.swap = null; }
      if (k >= 1) flight = null;
    } else if (pose.range < 3200) {                        // free navigation: the nearer study territory becomes the active one
      const n = IDS.reduce((m, id) => (kmBetween(pose, DEST[id]) < kmBetween(pose, DEST[m]) ? id : m));
      if (n !== wanted && kmBetween(pose, DEST[n]) < 700) { set({ scene: n, selected: null, picked: null, period: perOf(n, s.period) }); void ensureScene(n); }
    }
    apply(null);
  }

  // one camera control for every scale: drag spins the globe far away and orbits the terrain up close
  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0, pinch = 0;
  const interrupt = () => { flight = null; if (get().film) endFilm(get().t); };
  const ray = new THREE.Raycaster();
  function hit(ev: { clientX: number; clientY: number }): [number, number] | null {
    if (!terrain) return null;
    const r = els.input.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), cam);
    const h = ray.intersectObject(terrain.mesh)[0];
    return h?.uv ? [h.uv.x, 1 - h.uv.y] : null;
  }
  const onLand = (q: [number, number]) => landUV.some((r) => inside(q, r));      // the part of the relief the mask leaves visible
  const cellAt = (q: [number, number]) => (!get().cells || get().layer !== 'cells' || !data ? -1
    : clipUV ? visibleCellAt(q, clipUV) : onLand(q) ? data.scene.cells.findIndex((c) => inside(q, c.uv)) : -1);
  /** the cell under a lon/lat on the globe: inside its native box and inside its visible (clipped) footprint */
  function cellAtGeo(ll: [number, number]): { id: SceneId; i: number } | null {
    const s = get();
    if (!s.cells || s.layer !== 'cells' || !atlas) return null;
    for (const id of IDS) {
      const [dlat, dlon] = metas[id].cell_size_deg, pi = perOf(id, s.period);
      const i = metas[id].cells.findIndex((c, k) => c.trends[pi] && Math.abs(ll[0] - c.lon) <= dlon / 2 && Math.abs(ll[1] - c.lat) <= dlat / 2 && atlas.cells[id][k].some((rings) => inside(ll, rings[0])));
      if (i >= 0) return { id, i };
    }
    return null;
  }
  function cellLines(id: SceneId, i: number) {
    const cfg = SCENES[id], pi = perOf(id, get().period), c = metas[id].cells[i], t = c.trends[pi];
    const kind = c.coastal == null ? '' : c.coastal ? ' · coastal cell' : ' · interior cell';
    return [`${signed(t.slope)} ${cfg.unit} (${pi.replace('-', '–')})`, `95 % interval ${signed(t.ci_low)} to ${signed(t.ci_high)} · ${pval(t.p)}`, `Cell centre ${num(c.lat)}°, ${num(c.lon)}°${kind}`];
  }
  const onTerrain = () => !!terrain && els.terrain.style.visibility === 'visible' && Number(els.terrain.style.opacity) > 0.5;
  function hover(ev: PointerEvent) {
    const s = get(), r = els.input.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    let lines: string[] | null = null;
    if (onTerrain() && data && loadedId) {
      const q = hit(ev);
      if (q) {
        const i = cellAt(q);
        if (i >= 0 && data.scene.cells[i].trends[perOf(loadedId, s.period)]) lines = cellLines(loadedId, i);
        else if (!onLand(q)) { const t = sstAt(x, y); if (t) lines = [SST_TITLE, ...t.slice(0, 2)]; }
        else {
          const hk = Math.floor(q[1] * data.scene.grid.ny) * data.scene.grid.nx + Math.floor(q[0] * data.scene.grid.nx);
          lines = [data.heights[hk] === -32768 ? 'Ocean' : `Terrain ${Math.max(0, data.heights[hk])} m (2 km mean, GMTED2010)`];
        }
      }
    } else if (pose.range < 9500) {
      const ll = earth.pick(x, y), c = ll && cellAtGeo(ll), reg = ll && !c ? regionAt(ll) : null;
      const t = !c ? sstAt(x, y) : null;
      if (c) lines = cellLines(c.id, c.i);
      else if (t) lines = [SST_TITLE, ...t.slice(0, 2)];
      else if (reg) lines = [s.regionNames[reg] ?? reg, 'Click to open this region'];
    }
    els.input.classList.toggle('is-hot', !!lines);
    if (lines || s.tip) set({ tip: lines ? { x, y, lines } : null });
  }
  function select(id: SceneId, i: number) {
    const s = get();
    if (s.scene === id && s.selected === i) { set({ selected: null, picked: null }); return; }
    const c = metas[id].cells[i];
    set({ scene: id, period: perOf(id, s.period), selected: i, region: REGION_OF[id],
      picked: { title: `${id === 'antofagasta' ? 'MERRA-2' : 'GLDAS'} cell ${num(c.lat)}°, ${num(c.lon)}°`, lines: cellLines(id, i) } });
  }
  const onDown = (e: PointerEvent) => { els.input.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; pinch = 0; interrupt(); els.input.classList.add('is-drag'); };
  const onMove = (e: PointerEvent) => {
    const prev = pts.get(e.pointerId);
    if (!prev) { hover(e); return; }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 4 && get().tip) set({ tip: null });
    if (pts.size === 2) {                                  // pinch to zoom
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) pose = { ...pose, range: clamp((pose.range * pinch) / d, 180, 30000) };
      pinch = d;
      return;
    }
    if (get().near && !e.shiftKey && e.buttons !== 2) {
      pose = { ...pose, heading: pose.heading - dx * 0.25, pitch: clamp(pose.pitch - dy * 0.2, -89, -14) };
    } else {                                               // pan: move the target under the pointer
      const kpp = (2 * pose.range * Math.tan((FOV_Y * R) / 2)) / Math.max(1, H), h = pose.heading * R;
      const f = dy * kpp / Math.max(0.35, Math.sin(-pose.pitch * R)), r = -dx * kpp;
      const east = r * Math.cos(h) + f * Math.sin(h), north = -r * Math.sin(h) + f * Math.cos(h);
      pose = { ...pose, lat: clamp(pose.lat + north / 110.574, -85, 85), lon: pose.lon + east / (111.32 * Math.max(0.15, Math.cos(pose.lat * R))) };
    }
  };
  const pickSst = (x: number, y: number) => {
    const t = sstAt(x, y);
    if (t) set({ selected: null, picked: { title: SST_TITLE, lines: t.slice(0, 2), note: `${t[2]} NASA JPL MUR v4.1 (doi:10.5067/GHGMR-4FJ04).` } });
    return !!t;
  };
  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId); pinch = 0;
    els.input.classList.remove('is-drag');
    if (moved >= 5) return;
    const r = els.input.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (onTerrain() && loadedId) {
      const q = hit(e), i = q ? cellAt(q) : -1;
      if (i >= 0 && data!.scene.cells[i].trends[perOf(loadedId, get().period)]) select(loadedId, i);
      else if (!(q && !onLand(q) && pickSst(x, y))) set({ selected: null, picked: null });
      return;
    }
    const ll = earth.pick(x, y), c = ll && pose.range < 9500 ? cellAtGeo(ll) : null;
    if (c) select(c.id, c.i);
    else if (pose.range < 9500 && pickSst(x, y)) return;
    else set({ selected: null, picked: null, region: ll && pose.range < 12000 ? regionAt(ll) : null });
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); interrupt(); pose = { ...pose, range: clamp(pose.range * Math.exp(e.deltaY * 0.0012), 180, 30000) }; };
  const onLeave = () => set({ tip: null });
  const onCtx = (e: Event) => e.preventDefault();
  els.input.addEventListener('pointerdown', onDown); els.input.addEventListener('pointermove', onMove);
  els.input.addEventListener('pointerup', onUp); els.input.addEventListener('pointercancel', onUp);
  els.input.addEventListener('pointerleave', onLeave); els.input.addEventListener('wheel', onWheel, { passive: false });
  els.input.addEventListener('contextmenu', onCtx);

  const refreshExtremes = () => {
    const s = get(), pi = perOf(s.scene, s.period), e = extremesOf(metas[s.scene].cells, pi);
    if (s.extremes?.scene !== s.scene || s.extremes.period !== pi) set({ extremes: e ? { scene: s.scene, period: pi, ...e } : null, scale: scaleOf[s.scene] });
  };
  const unsub = useStage.subscribe((s, prev) => { if (s.scene !== prev.scene || s.period !== prev.period) refreshExtremes(); });
  refreshExtremes();
  const regionPose = (id: string): Pose | null => {
    const sh = shapes.find((x) => x.id === id);
    if (!sh) return null;
    const [x0, y0, x1, y1] = sh.box, lat = (y0 + y1) / 2;
    return { lon: (x0 + x1) / 2, lat, heading: 0, pitch: -72, range: clamp(Math.max((y1 - y0) * 111, (x1 - x0) * 111 * Math.cos(lat * R)) * 2.4, 420, 3400) };
  };
  const sceneOf = (region: string) => IDS.find((id) => REGION_OF[id] === region) ?? null;

  await ensureScene(DEFAULTS.scene);
  await document.fonts.ready;
  set({ status: 'ready', basemap: earth.basemap });
  raf = requestAnimationFrame(tick);

  const api = {
    /** Fly to the whole Earth, to one of the two study territories, or to any of the 16 regions (by id).
     *  The camera rises, travels along Chile and descends; any pointer, wheel or Escape input interrupts it. */
    flyTo(dest: SceneId | 'earth' | string) {
      if (get().film) endFilm(get().t);
      set({ tip: null });                                   // a tooltip belongs to the place the camera is leaving
      const id = dest in SCENES ? dest as SceneId : sceneOf(dest);
      const to = dest === 'earth' ? WHOLE_EARTH : id ? DEST[id] : regionPose(dest);
      if (!to) return;
      if (dest === 'earth') set({ region: null, selected: null, picked: null });
      else if (id) set({ scene: id, region: REGION_OF[id], selected: null, picked: null, period: perOf(id, get().period) });
      else set({ region: dest, selected: null, picked: null });
      flight = { ...planFlight(pose, to, kmBetween(pose, to), reduced()), t0: performance.now(), swap: id };
    },
    /** colours of the 16 regions for the regional layers (computed by the UI from the published regional trends) */
    setRegionFill(version: string, colours: Record<string, string | null>) {
      if (!earth.hasLayer('regions')) earth.addLayer('regions', shapes.map((sh) => sh.rings.filter((_, i) => { const b = sh.boxes[i]; return Math.hypot(b[2] - b[0], b[3] - b[1]) > 0.08; }).map((r) => [r])), true);
      regionFill = { version, colours }; frameKey = '';
    },
    nudge(k: 'in' | 'out' | 'left' | 'right') {
      interrupt();
      if (k === 'in' || k === 'out') pose = { ...pose, range: clamp(pose.range * (k === 'in' ? 0.75 : 1.33), 180, 30000) };
      else pose = { ...pose, heading: pose.heading + (k === 'left' ? -15 : 15) };
    },
    async play() {
      flight = null;
      await ensureScene('antofagasta');
      set({ ...DEFAULTS, film: true, t: 0, hideUi: false, tip: null, picked: null, region: null });
      filmT0 = performance.now();
    },
    /** Stop: the film ends where it is and the camera is yours. Skip: jump to the film's last frame, the interactive state. */
    stop: () => { if (get().film) endFilm(get().t); },
    skip: () => { if (get().film) endFilm(TOTAL); },
    interrupt,
    /** deterministic frame for capture: same state for the same t, every time */
    async renderAt(t: number, flush: (f: () => void) => void) {
      await ensureScene('antofagasta');
      const fs = stateAt(t);
      flush(() => set({ ...DEFAULTS, film: true, t, period: fs.period }));
      frameKey = ''; apply(fs);
      await earth.settle();
      frameKey = ''; apply(fs);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    dispose() {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); unsub();
      els.input.removeEventListener('pointerdown', onDown); els.input.removeEventListener('pointermove', onMove);
      els.input.removeEventListener('pointerup', onUp); els.input.removeEventListener('pointercancel', onUp);
      els.input.removeEventListener('pointerleave', onLeave); els.input.removeEventListener('wheel', onWheel);
      els.input.removeEventListener('contextmenu', onCtx);
      terrain?.dispose(); renderer.dispose(); renderer.domElement.remove(); earth.destroy();
    },
  };
  return api;
}
export type Stage = Awaited<ReturnType<typeof mountStage>>;
export { EVENTS, extremesOf, kmBetween, TOTAL };
export type { Extreme };

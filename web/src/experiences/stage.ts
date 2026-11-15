// The master scene: one stage shared by free exploration and by the film.
// Cesium draws the planet, Three.js draws the regional terrain on top of it, and both follow one georeferenced pose.
// Cesium is drawn on demand; Three.js only draws while the terrain is visible. No statistics are computed here.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import * as THREE from 'three';
import { create } from 'zustand';
import { EVENTS, DEST, lerpPose, PERIOD_B, poseAt, reliefRise, smooth, stateAt, terrainAlpha, TOTAL, WHOLE_EARTH, type FilmState } from '../cinematic/timeline';
import { load } from '../data';
import { createEarth, type Earth, type RegionShape } from '../engine/earth';
import { FOV_Y, poseToLocal, type Pose } from '../engine/geo';
import { buildTerrain, colourDomain, inside, KM, loadScene, paintOverlay, SCENES, stopsFor, type Loaded, type SceneId } from '../engine/terrain';
import { num, pval, signed } from '../format';
import type { Regions } from '../types';

export type Mode = 'explore' | 'trends' | 'compare' | 'methodology';
export type PanelState = 'closed' | 'minimized' | 'expanded';
/** terrain scene id → region id of the published results (they differ: los_lagos vs los-lagos) */
export const REGION_OF: Record<SceneId, string> = { antofagasta: 'antofagasta', los_lagos: 'los-lagos' };
const DEFAULTS = { scene: 'antofagasta' as SceneId, period: SCENES.antofagasta.periods[0] as string, cells: true, sst: true, opacity: 0.55, exag: 2, selected: null as number | null };

export type StageState = typeof DEFAULTS & {
  mode: Mode; left: PanelState; right: PanelState; hideUi: boolean;
  film: boolean; t: number;
  status: 'loading' | 'ready' | 'error'; error: string;
  near: boolean;                 // the regional terrain is on screen
  basemap: 'gibs' | 'bundled' | null;
  sstSlope: number | undefined;  // from sst.json, set by the UI once loaded
  scale: number; sources: string[]; places: string[];
  tip: { x: number; y: number; html: string } | null;
};
export const useStage = create<StageState>(() => ({
  ...DEFAULTS, mode: 'explore', left: matchMedia('(max-width: 760px)').matches ? 'minimized' : 'expanded', right: 'expanded', hideUi: false, film: false, t: 0,
  status: 'loading', error: '', near: false, basemap: null, sstSlope: undefined, scale: 1, sources: [], places: [], tip: null,
}));

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const R = Math.PI / 180;

export async function mountStage(els: { root: HTMLElement; globe: HTMLElement; terrain: HTMLElement; input: HTMLElement; labels: HTMLElement }, capture: boolean) {
  const set = useStage.setState, get = useStage.getState;
  const geo = await load<Regions>('regions.geojson');
  const shapes: RegionShape[] = ((geo?.features ?? []) as unknown as { properties: { id: string }; geometry: { type: string; coordinates: unknown } }[]).map((f) => ({
    id: f.properties.id,   // outer ring of every polygon
    rings: (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates as unknown[]).map((poly) => (poly as [number, number][][])[0]),
  }));
  const earth: Earth = await createEarth(els.globe, shapes);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;      // no tone mapping or bloom on purpose: cell colours must match the legend
  els.terrain.appendChild(renderer.domElement);
  const scene3 = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(FOV_Y, 1, 10, 20000);
  const paint = document.createElement('canvas');
  let terrain: ReturnType<typeof buildTerrain> | null = null, data: Loaded | null = null, loadedId: SceneId | null = null, wanted: SceneId | null = null;
  let paintKey = '', frameKey = '', settled = false, dead = false, raf = 0;

  async function ensureScene(id: SceneId) {
    if (wanted === id) return;
    wanted = id;
    const d = await loadScene(id);
    if (wanted !== id || dead) return;
    terrain?.dispose();
    data = d; loadedId = id; paintKey = ''; frameKey = '';
    terrain = buildTerrain(d, scene3, renderer.capabilities.getMaxAnisotropy());
    set({ scale: colourDomain(d.scene, id), sources: d.scene.sources, places: d.scene.places.map((p) => p.name) });
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
  let flight: { from: Pose; to: Pose; t0: number; dur: number } | null = null;
  let filmT0 = 0;

  /** Draw one frame for a pose. With a film state, layers follow the timeline; otherwise they follow the controls. */
  function apply(fs: FilmState | null) {
    const s = get(), p = fs ? fs.pose : pose;
    const ui = fs ? fs.ui : s.hideUi ? 0 : 1;
    els.root.style.setProperty('--ui', String(ui));
    els.root.classList.toggle('ui-off', ui < 0.5);
    const cfg = loadedId ? SCENES[loadedId] : null;
    const per = fs ? fs.period : cfg && (cfg.periods as readonly string[]).includes(s.period) ? s.period : cfg?.periods[0] ?? s.period;
    const a = data && terrain ? terrainAlpha(p.range) : 0;
    const key = JSON.stringify([p, loadedId, per, s.cells, s.sst, s.opacity, s.exag, s.selected, s.sstSlope, fs?.reveal, fs?.cellFade, W, H]);
    if (key === frameKey && settled) return;
    frameKey = key;

    earth.setPose(p);
    earth.setOutlines((1 - smooth(Math.log(9000), Math.log(17000), Math.log(p.range))) * (1 - 0.75 * a), loadedId ? REGION_OF[loadedId] : null);
    earth.render();
    settled = earth.loaded();

    els.terrain.style.opacity = String(a);
    els.terrain.style.visibility = a > 0.001 ? 'visible' : 'hidden';
    els.labels.style.opacity = String(smooth(0.7, 1, a));
    if (s.near !== a > 0.5) set({ near: a > 0.5 });
    if (!(a > 0.001) || !data || !terrain || !loadedId) return;
    terrain.setExag(Math.round(s.exag * reliefRise(p.range) * 40) / 40);
    const o = { tex: 'relief', period: per, cells: s.cells, opacity: s.opacity * (fs ? fs.cellFade : 1), D: s.scale, stops: stopsFor(loadedId),
      sstSlope: s.sst ? s.sstSlope : undefined, reveal: fs ? fs.reveal : 1, selected: s.selected ?? undefined };
    const pk = loadedId + JSON.stringify(o);
    if (pk !== paintKey) { paintKey = pk; terrain.setMap(paintOverlay(data, o, paint)); }
    const L = poseToLocal(data.scene, terrain.W, terrain.H, p);
    cam.position.set(...L.position); cam.lookAt(...L.target);
    renderer.render(scene3, cam);
    data.scene.places.forEach((pl, i) => {                 // place labels follow the terrain
      const d = els.labels.children[i] as HTMLElement | undefined;
      if (!d) return;
      const v = new THREE.Vector3((pl.uv[0] - 0.5) * terrain!.W, (pl.z / KM) * terrain!.exag() + 2, (pl.uv[1] - 0.5) * terrain!.H).project(cam);
      d.style.display = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1 ? '' : 'none';
      d.style.transform = `translate(${((v.x + 1) / 2) * W}px, ${((1 - v.y) / 2) * H}px)`;
    });
  }

  function endFilm(at = TOTAL) {
    const fs = stateAt(at);
    pose = fs.pose;
    set({ film: false, t: 0, period: fs.period, hideUi: false });
    if (at >= TOTAL) set({ period: PERIOD_B });
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
      const k = flight.dur ? (now - flight.t0) / flight.dur : 1;
      pose = lerpPose(flight.from, flight.to, Math.min(1, k));
      if (k >= 1) flight = null;
    }
    apply(null);
  }

  // one camera control for every scale: drag spins the globe far away and orbits the terrain up close
  const pts = new Map<number, { x: number; y: number }>();
  let moved = 0, pinch = 0;
  const interrupt = () => { flight = null; if (get().film) endFilm(get().t); };
  const ray = new THREE.Raycaster();
  function hit(ev: { clientX: number; clientY: number }): [number, number] | null {
    if (!terrain || !get().near) return null;
    const r = els.input.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1), cam);
    const h = ray.intersectObject(terrain.mesh)[0];
    return h?.uv ? [h.uv.x, 1 - h.uv.y] : null;
  }
  const cellAt = (q: [number, number]) => (get().cells && data ? data.scene.cells.findIndex((c) => inside(q, c.uv)) : -1);
  function hover(ev: PointerEvent) {
    const q = hit(ev), s = get();
    if (!q || !data || !loadedId) { if (s.tip) set({ tip: null }); return; }
    const cfg = SCENES[loadedId], per = (cfg.periods as readonly string[]).includes(s.period) ? s.period : cfg.periods[0];
    const i = cellAt(q), t = i >= 0 ? data.scene.cells[i].trends[per] : undefined;
    const r = els.input.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    if (t) {
      const c = data.scene.cells[i], kind = c.coastal == null ? '' : c.coastal ? ' · coastal cell' : ' · interior cell';
      set({ tip: { x, y, html: `<b>${signed(t.slope)} ${cfg.unit}</b> (${per.replace('-', '–')})<br>95 % interval ${signed(t.ci_low)} to ${signed(t.ci_high)} · ${pval(t.p)}<br>cell centre ${num(c.lat)}°, ${num(c.lon)}°${kind}` } });
      return;
    }
    const hk = Math.floor(q[1] * data.scene.grid.ny) * data.scene.grid.nx + Math.floor(q[0] * data.scene.grid.nx);
    set({ tip: { x, y, html: data.heights[hk] === -32768 ? 'Ocean — drawn as a flat surface (no bathymetry)' : `Terrain ${Math.max(0, data.heights[hk])} m (2 km mean, GMTED2010)` } });
  }
  const onDown = (e: PointerEvent) => { els.input.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; pinch = 0; interrupt(); };
  const onMove = (e: PointerEvent) => {
    const prev = pts.get(e.pointerId);
    if (!prev) { hover(e); return; }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved += Math.abs(dx) + Math.abs(dy);
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
  const onUp = (e: PointerEvent) => {
    pts.delete(e.pointerId); pinch = 0;
    if (moved < 5) { const q = hit(e), i = q ? cellAt(q) : -1; set({ selected: i >= 0 && i !== get().selected ? i : null }); }
  };
  const onWheel = (e: WheelEvent) => { e.preventDefault(); interrupt(); pose = { ...pose, range: clamp(pose.range * Math.exp(e.deltaY * 0.0012), 180, 30000) }; };
  const onLeave = () => set({ tip: null });
  const onCtx = (e: Event) => e.preventDefault();
  els.input.addEventListener('pointerdown', onDown); els.input.addEventListener('pointermove', onMove);
  els.input.addEventListener('pointerup', onUp); els.input.addEventListener('pointercancel', onUp);
  els.input.addEventListener('pointerleave', onLeave); els.input.addEventListener('wheel', onWheel, { passive: false });
  els.input.addEventListener('contextmenu', onCtx);

  await ensureScene(DEFAULTS.scene);
  await document.fonts.ready;
  set({ status: 'ready', basemap: earth.basemap });
  raf = requestAnimationFrame(tick);

  const api = {
    /** fly to a terrain scene or back to the whole Earth; any pointer or wheel input interrupts it */
    async flyTo(dest: SceneId | 'earth') {
      if (get().film) endFilm(get().t);
      if (dest !== 'earth') {
        set({ scene: dest, selected: null, period: (SCENES[dest].periods as readonly string[]).includes(get().period) ? get().period : SCENES[dest].periods[0] });
        await ensureScene(dest);
      }
      const to = dest === 'earth' ? WHOLE_EARTH : DEST[dest];
      const from = { ...pose, heading: to.heading + ((((pose.heading - to.heading) % 360) + 540) % 360) - 180 };
      flight = { from, to, t0: performance.now(), dur: reduced() ? 0 : 2400 };
    },
    nudge(k: 'in' | 'out' | 'left' | 'right') {
      interrupt();
      if (k === 'in' || k === 'out') pose = { ...pose, range: clamp(pose.range * (k === 'in' ? 0.75 : 1.33), 180, 30000) };
      else pose = { ...pose, heading: pose.heading + (k === 'left' ? -15 : 15) };
    },
    async play() {
      flight = null;
      await ensureScene('antofagasta');
      set({ ...DEFAULTS, film: true, t: 0, hideUi: false, tip: null });
      filmT0 = performance.now();
    },
    stop: () => { if (get().film) endFilm(get().t); },
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
      dead = true; cancelAnimationFrame(raf); ro.disconnect();
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
export { EVENTS, TOTAL };

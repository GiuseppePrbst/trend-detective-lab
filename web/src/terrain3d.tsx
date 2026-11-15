// 3D terrain view (Three.js). Loaded on demand (React.lazy) so the main app never depends on it.
// Everything drawn comes from files built by pipeline/scene3d.py and qgis/scripts/build_3d_terrain.py:
// heights (USGS GMTED2010, 2 km), baked relief texture, native climate cells with their computed trends.
// Nothing is calculated here except colours and positions.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildTerrain, colourDomain, inside, KM, loadScene, paintOverlay, SCENES, stopsFor, webglOk, type Loaded, type SceneId } from './engine/terrain';
import { num, pval, signed } from './format';
import type { SST, Territory } from './types';

const Q = new URLSearchParams(location.search);   // scene, period, cam, exag: reproducible views for the presentation shots
const period = (p: string) => p.replace('-', '–');

export default function Terrain3D({ terr, sst }: { terr: Territory | null; sst: SST | null }) {
  const [id, setId] = useState<SceneId>(() => (Q.get('scene') === 'los_lagos' ? 'los_lagos' : 'antofagasta'));
  const [per, setPer] = useState<string>(Q.get('period') ?? SCENES.antofagasta.periods[0]);
  const [tex, setTex] = useState(Q.get('tex') ?? 'relief');
  const [showCells, setShowCells] = useState(Q.get('cells') !== '0');
  const [showSst, setShowSst] = useState(Q.get('sst') !== '0');
  const [showLabels, setShowLabels] = useState(Q.get('labels') !== '0');
  const [opacity, setOpacity] = useState(0.55);
  const [exag, setExag] = useState(Number(Q.get('exag') ?? 2));
  const [data, setData] = useState<Loaded | null>(null);
  const [err, setErr] = useState('');
  const [tip, setTip] = useState<{ x: number; y: number; html: string } | null>(null);
  const mount = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ preset: (k: string) => void; setExag: (e: number) => void; setMap: (c: HTMLCanvasElement) => void } | null>(null);
  const can3d = useMemo(webglOk, []);
  const cfg = SCENES[id];
  const p = cfg.periods.includes(per as never) ? per : cfg.periods[0];

  useEffect(() => {
    setData(null); setErr('');
    let live = true;
    loadScene(id).then((d) => live && setData(d)).catch((e) => live && setErr(String(e)));
    return () => { live = false; };
  }, [id]);

  // fixed colour scale per scene (same for every period, so the periods can be compared)
  const D = useMemo(() => (data ? colourDomain(data.scene, id) : 1), [data, id]);
  const stops = stopsFor(id);
  const sstTrend = sst?.series.mur_sst?.trend;

  // texture = baked relief + draped overlays (redrawn on every toggle; cells keep their native footprint)
  const canvas = useMemo(() => (data
    ? paintOverlay(data, { tex, period: p, cells: showCells, opacity, D, stops, sstSlope: showSst ? sstTrend?.slope_per_decade : undefined })
    : null), [data, tex, showCells, showSst, opacity, p, D, stops, sstTrend]);

  // Three.js scene (rebuilt only when the terrain changes)
  useEffect(() => {
    if (!data || !mount.current || !can3d) return;
    const el = mount.current;
    const { scene: S } = data;
    const { nx, ny, res_m } = S.grid;
    const W = ((nx - 1) * res_m) / KM, H = ((ny - 1) * res_m) / KM;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#e9edf2');
    scene.fog = new THREE.Fog('#e9edf2', Math.max(W, H) * 1.6, Math.max(W, H) * 3.2);
    const camera = new THREE.PerspectiveCamera(35, 1, 10, 10000);   // near 10 (not 1): with near 1 the 24-bit depth buffer could not separate the sea from the base block (z-fighting speckle)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 40; controls.maxDistance = Math.max(W, H) * 2.5;

    const terrain = buildTerrain(data, scene, renderer.capabilities.getMaxAnisotropy());
    const { mesh } = terrain;
    terrain.setExag(exag);
    if (canvas) terrain.setMap(canvas);

    const presets: Record<string, () => void> = {
      overview: () => {                                     // oblique from the south-west: ocean, coast and Andes in one frame
        const k = Math.max(1, 1.3 / camera.aspect);           // narrow (phone) views step back so the whole region fits
        controls.target.set(W * 0.04, 0, H * 0.2);
        camera.position.set(W * 0.04 - W * 0.44 * k, Math.max(W, H) * 0.7 * k, H * 0.2 + H * 0.98 * k);
      },
      coast: () => { camera.position.set(-W * 0.86, Math.max(W, H) * 0.3, H * 0.3); controls.target.set(W * 0.08, 0, H * 0.02); },
      andes: () => { camera.position.set(W * 0.9, Math.max(W, H) * 0.35, -H * 0.15); controls.target.set(-W * 0.1, 0, 0); },
      south: () => { camera.position.set(-W * 0.1, Math.max(W, H) * 0.3, H * 1.05); controls.target.set(0, 0, -H * 0.05); },
    };
    let curExag = exag;
    api.current = {
      preset: (k) => { presets[k]?.(); controls.update(); },
      setExag: (e) => { curExag = e; terrain.setExag(e); },
      setMap: terrain.setMap,
    };

    const resize = () => {
      const w = el.clientWidth, h = Math.max(320, Math.min(Q.has('shot') ? 760 : 640, Math.round(w * 0.62)));
      renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    resize();
    (presets[Q.get('cam') ?? ''] ?? presets.overview)();     // after resize: the overview depends on the aspect ratio
    const ro = new ResizeObserver(resize); ro.observe(el);

    // place labels follow the terrain
    const toWorld = (u: number, v: number, z: number) => new THREE.Vector3((u - 0.5) * W, (z / KM) * curExag + 2, (v - 0.5) * H);
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let raf = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      const box = labelsRef.current;
      if (box) {
        const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
        S.places.forEach((pl, i) => {
          const d = box.children[i] as HTMLElement | undefined;
          if (!d) return;
          const v = toWorld(pl.uv[0], pl.uv[1], pl.z).project(camera);
          const vis = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
          d.style.display = vis ? '' : 'none';
          d.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onMove = (ev: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(mesh)[0];
      if (!hit?.uv) { setTip(null); return; }
      const q: [number, number] = [hit.uv.x, 1 - hit.uv.y];
      el.dispatchEvent(new CustomEvent('terrain-hover', { detail: { q, x: ev.clientX - r.left, y: ev.clientY - r.top } }));
    };
    const onLeave = () => setTip(null);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      terrain.dispose(); renderer.dispose(); el.removeChild(renderer.domElement);
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, can3d]);

  useEffect(() => { if (canvas) api.current?.setMap(canvas); }, [canvas]);
  useEffect(() => { api.current?.setExag(exag); }, [exag]);

  // hover: identify the native cell under the pointer (the values shown are the ones in the data files)
  useEffect(() => {
    const el = mount.current;
    if (!el || !data) return;
    const on = (e: Event) => {
      const { q, x, y } = (e as CustomEvent).detail as { q: [number, number]; x: number; y: number };
      const cell = showCells ? data.scene.cells.find((c) => inside(q, c.uv)) : undefined;
      if (cell?.trends[p]) {
        const t = cell.trends[p];
        const kind = cell.coastal == null ? '' : cell.coastal ? ' · coastal cell' : ' · interior cell';
        setTip({ x, y, html: `<b>${signed(t.slope)} ${cfg.unit}</b> (${period(p)})<br>95 % interval ${signed(t.ci_low)} to ${signed(t.ci_high)} · ${pval(t.p)}<br>cell centre ${num(cell.lat)}°, ${num(cell.lon)}°${kind}` });
        return;
      }
      const inSst = data.scene.sst_box && inside(q, data.scene.sst_box);
      const hk = Math.floor(q[1] * data.scene.grid.ny) * data.scene.grid.nx + Math.floor(q[0] * data.scene.grid.nx);
      const isSea = data.heights[hk] === -32768;
      if (isSea) setTip({ x, y, html: inSst && sstTrend && showSst && p === '2003-2025' ? `Coastal ocean box (NASA MUR SST, 2003–2025): <b>${signed(sstTrend.slope_per_decade)} °C per decade</b>, ${pval(sstTrend.p_value)}` : 'Ocean — drawn as a flat surface (no bathymetry)' });
      else setTip({ x, y, html: `Terrain ${Math.max(0, data.heights[hk])} m (2 km mean, GMTED2010)` });
    };
    el.addEventListener('terrain-hover', on);
    return () => el.removeEventListener('terrain-hover', on);
  }, [data, showCells, showSst, p, cfg.unit, sstTrend]);

  const t4 = terr?.antofagasta.t4.find((r) => r.period === period(p));
  const legend = Array.from({ length: 7 }, (_, i) => -D + (i * 2 * D) / 6);

  return (
    <div className="t3d">
      <div className="t3d-bar" role="group" aria-label="3D view controls">
        <label>Scene <select value={id} onChange={(e) => setId(e.target.value as SceneId)}>
          {Object.entries(SCENES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}</select></label>
        {cfg.periods.length > 1 && (
          <label>Period <select value={p} onChange={(e) => setPer(e.target.value)}>
            {cfg.periods.map((x) => <option key={x} value={x}>{period(x)}</option>)}</select></label>)}
        {data && data.scene.textures.length > 1 && (
          <label>Base map <select value={tex} onChange={(e) => setTex(e.target.value)}>
            <option value="relief">Relief</option><option value="landcover">Land cover (CONAF 2018)</option></select></label>)}
        <label>Vertical exaggeration <select value={exag} onChange={(e) => setExag(Number(e.target.value))}>
          {[1, 1.5, 2, 3].map((x) => <option key={x} value={x}>{x}×{x === 1 ? ' (true scale)' : ''}</option>)}</select></label>
        <label><input type="checkbox" checked={showCells} onChange={(e) => setShowCells(e.target.checked)} /> Climate cells</label>
        {id === 'antofagasta' && <label><input type="checkbox" checked={showSst} onChange={(e) => setShowSst(e.target.checked)} /> Ocean SST box (2003–2025)</label>}
        <label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Place names</label>
        <label>Cell opacity <input type="range" min={0.2} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} /></label>
      </div>
      {can3d ? (
        <div className="t3d-view">
          <div ref={mount} className="t3d-canvas" />
          {data && showLabels && (
            <div ref={labelsRef} className="t3d-labels" aria-hidden="true">
              {data.scene.places.map((pl) => <span key={pl.name}>{pl.name}</span>)}</div>)}
          {tip && <div className="t3d-tip" style={{ left: tip.x + 14, top: tip.y + 14 }} dangerouslySetInnerHTML={{ __html: tip.html }} />}
          {!data && !err && <p className="t3d-loading">Loading terrain…</p>}
          {err && <p className="t3d-loading">Could not load the 3D scene ({err}).</p>}
          <div className="t3d-cams" role="group" aria-label="Camera">
            {[['overview', 'Overview'], ['coast', 'From the ocean'], ['andes', 'From the Andes'], ['south', 'From the south']].map(([k, l]) =>
              <button key={k} type="button" onClick={() => api.current?.preset(k)}>{l}</button>)}
          </div>
        </div>
      ) : (
        <div className="t3d-fallback">
          <p>Your browser cannot show WebGL 3D graphics. The same information as a 2D map:</p>
          {cfg.fallback && <img src={`${import.meta.env.BASE_URL}${cfg.fallback}`} width={620} alt="2D map of the same cells over shaded relief." />}
        </div>
      )}
      <div className="t3d-legend">
        <div>
          <strong>{id === 'antofagasta' ? 'Air temperature trend' : 'Root-zone soil moisture trend'}, {cfg.unit}, {period(p)}</strong>
          <div className="t3d-ramp" style={{ background: `linear-gradient(to right, ${stops.join(',')})` }} />
          <div className="t3d-ticks">{legend.map((x, i) => <span key={i}>{id === 'antofagasta' ? signed(Math.round(x * 100) / 100 || 0) : signed(Math.round(x) || 0).replace('.00', '')}</span>)}</div>
          <p className="hint">{cfg.product}. One coloured footprint = one native cell and one trend; the terrain does not make the climate data finer.
            {cfg.periods.length > 1 && ' Scale fixed across periods. '}{id === 'antofagasta' && 'Thick black outline: coastal cells (land share < 0.99).'}
            {' '}Vertical exaggeration {exag}×{exag === 1 ? ' (true scale)' : ' — heights are stretched for legibility'}.</p>
        </div>
        {id === 'antofagasta' && t4 && (
          <div className="t3d-story">
            <strong>Coast vs interior, {t4.period} (area-weighted groups, exploratory)</strong>
            <p>Coastal cells {signed(t4.coastal.slope_per_decade)}, interior {signed(t4.interior.slope_per_decade)} °C per decade; difference
              {' '}{signed(t4.difference.slope_per_decade)} ({pval(t4.difference.p_value)}).
              {p === '1980-2025' && ' The regional average hides this contrast.'}
              {p === '1980-2002' && ' The contrast comes from these decades: the coastal cells cooled.'}
              {p === '2003-2025' && ` Both parts warmed and their difference is not significant. Coastal ocean (NASA MUR, hatched box over the sea): ${sstTrend ? `${signed(sstTrend.slope_per_decade)} °C per decade, ${pval(sstTrend.p_value)}` : 'not loaded'}.`}
            </p>
            <p className="hint">Patterns depend on the time period, the data source and the spatial scale. No cause is claimed. <a href="?q=coast">Open the Antofagasta case</a> · <a href="#h-evidence-cards">Evidence cards</a></p>
          </div>
        )}
        {id === 'los_lagos' && (
          <div className="t3d-story">
            <strong>Los Lagos: relief, land cover and modelled soil moisture</strong>
            <p>GLDAS is a model driven partly by observed rain; it does not use the CONAF land-cover map. Cells with more plantation and agriculture
              sit in the lowland central valley, so location, not land use, may explain their steeper modelled drying. Land cover is context, not a cause.</p>
            <p className="hint"><a href="#h-evidence-cards">Evidence cards</a></p>
          </div>
        )}
        <p className="hint t3d-sources">Sources: {data?.scene.sources.join(' · ')} · Climate: NASA {id === 'antofagasta' ? 'MERRA-2 (M2IMNXASM v5.12.4) and MUR v4.1 SST' : 'GLDAS-2.1 Noah'}.
          Scene CRS EPSG:{data?.scene.epsg}; heights in metres above the geoid; the ocean is drawn flat (no bathymetry). Built by
          {' '}<a href="https://github.com/GiuseppePrbst/trend-detective-lab/blob/main/qgis/scripts/build_3d_terrain.py">build_3d_terrain.py</a>.</p>
      </div>
    </div>
  );
}

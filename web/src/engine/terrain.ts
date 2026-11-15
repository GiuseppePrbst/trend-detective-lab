// Shared regional-terrain engine (Three.js): one source for the Research Lab 3D view, the immersive stage and the film.
// Everything drawn comes from files built by pipeline/scene3d.py and qgis/scripts/build_3d_terrain.py.
// Nothing is calculated here except colours and positions.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import * as THREE from 'three';

export type Trend = { slope: number; ci_low: number; ci_high: number; p: number };
export type Cell = { lat: number; lon: number; coastal?: boolean | null; trends: Record<string, Trend>; uv: [number, number][] };
export type Scene = {
  name: string; epsg: number; bounds_utm: [number, number, number, number]; grid: { nx: number; ny: number; res_m: number };
  texture: { nx: number; ny: number; res_m: number }; textures: string[]; z_max: number; variable: string;
  cell_size_deg: [number, number]; cells: Cell[]; places: { name: string; uv: [number, number]; z: number }[];
  sources: string[]; sst_box?: [number, number][];
};
export type Loaded = { scene: Scene; heights: Int16Array; images: Record<string, HTMLImageElement>; sea?: HTMLImageElement };

const BASE = `${import.meta.env.BASE_URL}scene3d/`;
export const SCENES = {
  antofagasta: { label: 'Antofagasta — air temperature (MERRA-2)', periods: ['1980-2025', '1980-2002', '2003-2025'], unit: '°C per decade',
    product: 'NASA MERRA-2 2-m air temperature, native cells 0.5° × 0.625° (about 55 × 64 km)', fallback: 'img/antofagasta_territorial.png' },
  los_lagos: { label: 'Los Lagos — root-zone soil moisture (GLDAS)', periods: ['2000-2024'], unit: 'mm per decade',
    product: 'NASA GLDAS-2.1 Noah root-zone soil moisture (a land-surface model), native cells 0.25° (about 28 × 21 km)', fallback: '' },
} as const;
export type SceneId = keyof typeof SCENES;
export const RDBU = ['#2166ac', '#67a9cf', '#d1e5f0', '#f7f7f7', '#fddbc7', '#ef8a62', '#b2182b'];
export const BRBG = ['#8c510a', '#d8b365', '#f6e8c3', '#f5f5f5', '#c7eae5', '#5ab4ac', '#01665e'];
export const stopsFor = (id: SceneId) => (id === 'antofagasta' ? RDBU : BRBG);
export const KM = 1000;

export function ramp(stops: string[], t: number): THREE.Color {
  const x = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  return new THREE.Color(stops[i]).lerp(new THREE.Color(stops[i + 1]), x - i);
}

export function inside(pt: [number, number], poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function img(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = src; });
}

export async function loadScene(id: SceneId): Promise<Loaded> {
  const scene: Scene = await (await fetch(`${BASE}${id}/scene.json`)).json();
  const heights = new Int16Array(await (await fetch(`${BASE}${id}/height.bin`)).arrayBuffer());
  const images: Record<string, HTMLImageElement> = {};
  for (const t of scene.textures) images[t] = await img(`${BASE}${id}/${t}.jpg`);
  const sea = scene.sst_box ? await img(`${BASE}${id}/sea.png`) : undefined;
  return { scene, heights, images, sea };
}

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

/** Fixed colour scale per scene (same for every period, so the periods can be compared). */
export function colourDomain(scene: Scene, id: SceneId) {
  const m = Math.max(...scene.cells.flatMap((c) => Object.values(c.trends).map((t) => Math.abs(t.slope))));
  return id === 'antofagasta' ? Math.ceil(m * 10) / 10 : Math.ceil(m / 10) * 10;
}

export type Overlay = {
  tex: string; period: string; cells: boolean; opacity: number; D: number; stops: string[];
  /** cell colour from engine/scale.ts (same function as the globe and the legend); default: the fixed diverging ramp D/stops */
  colour?: (slope: number) => string;
  /** slope of the coastal SST box, °C per decade; drawn only for 2003-2025, the period it was computed for */
  sstSlope?: number;
  /** 0..1: share of cells drawn, west to east (film only; every drawn cell keeps its own computed colour) */
  reveal?: number;
  /** index of the selected cell: outlined, never recoloured */
  selected?: number;
  /** visible footprint of each cell in texture coordinates (native cell ∩ region), polygons of rings; default: the native footprint */
  clip?: [number, number][][][][];
  /** indices of the cells with the highest and the lowest trend of the period: marked with a double outline, never recoloured */
  marks?: number[];
};
export const EARTH_R = 6371;   // km, mean radius: the terrain bends with the planet when it is drawn on the globe

/** Alpha mask of the terrain on the globe: the region's land (and the SST box while it is drawn). White = drawn. */
export function paintMask(data: Loaded, land: [number, number][][], sst: boolean, into: HTMLCanvasElement) {
  const W = 1024, H = Math.round((1024 * data.scene.grid.ny) / data.scene.grid.nx);
  if (into.width !== W || into.height !== H) { into.width = W; into.height = H; }
  const g = into.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  const add = (uv: [number, number][]) => { uv.forEach(([u, v], i) => (i ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H))); g.closePath(); };
  g.beginPath(); land.forEach(add); g.fill();
  if (sst && data.scene.sst_box) { g.beginPath(); add(data.scene.sst_box); g.fill(); }
  return into;
}

/** Texture = baked relief + draped overlays. Cells keep their native footprint. */
export function paintOverlay(data: Loaded, o: Overlay, into?: HTMLCanvasElement): HTMLCanvasElement {
  const base = data.images[o.tex] ?? data.images.relief;
  const c = into ?? document.createElement('canvas');
  if (c.width !== base.width || c.height !== base.height) { c.width = base.width; c.height = base.height; }
  const g = c.getContext('2d')!;
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]);
  g.drawImage(base, 0, 0);
  const W = c.width, H = c.height;
  const path = (uv: [number, number][]) => { g.beginPath(); uv.forEach(([u, v], i) => (i ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H))); g.closePath(); };
  if (o.sstSlope != null && data.scene.sst_box && data.sea && o.period === '2003-2025') {
    const s = document.createElement('canvas'); s.width = W; s.height = H;
    const og = s.getContext('2d')!;
    og.fillStyle = ramp(o.stops, (o.sstSlope / o.D + 1) / 2).getStyle();
    og.globalAlpha = o.opacity;
    og.beginPath(); data.scene.sst_box.forEach(([u, v], i) => (i ? og.lineTo(u * W, v * H) : og.moveTo(u * W, v * H))); og.closePath(); og.fill();
    og.save(); og.clip(); og.globalAlpha = 0.5; og.strokeStyle = '#ffffff'; og.lineWidth = 2;   // hatching: an ocean product, not an air-temperature cell
    for (let x = -H; x < W; x += 18) { og.beginPath(); og.moveTo(x, H); og.lineTo(x + H, 0); og.stroke(); }
    og.restore();
    og.globalAlpha = 1; og.globalCompositeOperation = 'destination-in';
    og.drawImage(data.sea, 0, 0, W, H);           // keep only the ocean part: SST is a sea variable
    g.drawImage(s, 0, 0);
    path(data.scene.sst_box); g.setLineDash([10, 8]); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
  }
  if (o.cells) {
    const cells = data.scene.cells;
    let rank: number[] | null = null;
    if (o.reveal != null && o.reveal < 1) {
      const order = cells.map((_, i) => i).sort((a, b) => cells[a].lon - cells[b].lon || cells[b].lat - cells[a].lat);
      rank = []; order.forEach((ci, r) => { rank![ci] = r; });
    }
    // the drawn shape of a cell: its clipped footprint when there is one, else the native footprint
    const shape = (i: number) => {
      const polys = o.clip?.[i];
      if (!polys) { path(cells[i].uv); return; }
      g.beginPath();
      for (const rings of polys) for (const r of rings) { r.forEach(([u, v], n) => (n ? g.lineTo(u * W, v * H) : g.moveTo(u * W, v * H))); g.closePath(); }
    };
    cells.forEach((cell, i) => {
      const t = cell.trends[o.period];
      if (!t) return;
      const k = rank ? Math.min(1, Math.max(0, o.reveal! * (cells.length + 4) - rank[i])) : 1;
      if (k <= 0) return;
      shape(i);
      g.globalAlpha = o.opacity * k;
      g.fillStyle = o.colour ? o.colour(t.slope) : ramp(o.stops, (t.slope / o.D + 1) / 2).getStyle();
      g.fill('evenodd');
      g.globalAlpha = k;
      g.strokeStyle = cell.coastal ? 'rgba(15,15,15,0.95)' : 'rgba(40,40,40,0.45)';
      g.lineWidth = cell.coastal ? 5 : 1.5;
      g.stroke();
    });
    g.globalAlpha = 1;
    const sel = o.selected != null ? cells[o.selected] : undefined;
    for (const m of o.marks ?? []) if (cells[m]?.trends[o.period] && (!rank || o.reveal! >= 1)) { shape(m); g.strokeStyle = '#EFF6FF'; g.lineWidth = 7; g.stroke(); g.strokeStyle = '#060D1A'; g.lineWidth = 2.5; g.stroke(); }
    if (sel?.trends[o.period]) { shape(o.selected!); g.strokeStyle = '#4CD9E6'; g.lineWidth = 9; g.stroke(); g.strokeStyle = '#060D1A'; g.lineWidth = 2; g.stroke(); }
  }
  return c;
}

/** Terrain mesh, block-diagram base and the north-west light. Axes: x east, y up, z south, in km; origin = scene centre at sea level. */
export function buildTerrain(data: Loaded, scene: THREE.Scene, anisotropy: number, onGlobe = false) {
  const { nx, ny, res_m } = data.scene.grid;
  const W = ((nx - 1) * res_m) / KM, H = ((ny - 1) * res_m) / KM;
  const geo = new THREE.PlaneGeometry(W, H, nx - 1, ny - 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const base = new Float32Array(nx * ny);
  for (let i = 0; i < ny; i++) for (let j = 0; j < nx; j++) {
    const k = i * nx + j, h = data.heights[k];
    base[k] = h === -32768 ? 0 : h / KM;                  // sea: flat surface at 0, not terrain
    uv.setXY(k, (j + 0.5) / nx, 1 - (i + 0.5) / ny);     // vertices sit at the 2 km cell centres
  }
  // on the globe the mesh follows the planet's curvature: each vertex drops by d²/2R from the tangent plane at the scene centre
  const dropAt = (x: number, z: number) => (onGlobe ? (x * x + z * z) / (2 * EARTH_R) : 0);
  let exag = -1;
  const setExag = (e: number) => {
    if (e === exag) return;
    exag = e;
    for (let k = 0; k < base.length; k++) pos.setZ(k, base[k] * e - dropAt(pos.getX(k), pos.getY(k)));
    pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  const tex = new THREE.CanvasTexture(document.createElement('canvas'));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, metalness: 0 });
  // on the globe only the region is drawn (alpha mask): no rectangular sheet and no block under it
  const mask = onGlobe ? new THREE.CanvasTexture(document.createElement('canvas')) : null;
  if (mask) { mat.alphaMap = mask; mat.alphaTest = 0.5; }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;                          // +y (north) -> -z; west = -x
  // block-diagram base under the scene (neutral; it is not data and not bathymetry)
  const block = new THREE.Mesh(new THREE.BoxGeometry(W, 12, H), new THREE.MeshStandardMaterial({ color: '#4a525c', roughness: 1 }));
  block.position.y = -6.5;                                  // top 0.5 km below the flat sea, well above depth precision
  const hemi = new THREE.HemisphereLight('#f6f3ec', '#5b5f66', 0.95);
  const sun = new THREE.DirectionalLight('#fffaf0', 1.25);
  sun.position.set(-W, Math.max(W, H) * 0.8, -H * 0.8);    // from the north-west, the cartographic convention
  scene.add(mesh, hemi, sun);
  if (!onGlobe) scene.add(block);
  return {
    W, H, mesh, setExag, dropAt,
    setMask: (c: HTMLCanvasElement) => { if (mask) { mask.image = c; mask.needsUpdate = true; } },
    exag: () => exag,
    setMap: (c: HTMLCanvasElement) => { tex.image = c; tex.needsUpdate = true; },
    dispose: () => { scene.remove(mesh, block, hemi, sun); geo.dispose(); mat.dispose(); tex.dispose(); mask?.dispose(); block.geometry.dispose(); (block.material as THREE.Material).dispose(); },
  };
}

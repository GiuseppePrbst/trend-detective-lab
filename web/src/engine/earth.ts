// Global Earth (CesiumJS): one persistent Viewer, rendered on demand, driven by the same poses as the terrain.
// Basemap: NASA GIBS Blue Marble (public WMTS, no key). If GIBS is unreachable, the Natural Earth II texture bundled with Cesium.
// No Cesium ion, no token, no terrain service. The basemap is context: it is not one of the analysed datasets.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { FOV_Y, type Pose } from './geo';

const R = Math.PI / 180;
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
export const BASEMAPS = {
  gibs: 'NASA Blue Marble: Next Generation (shaded relief and bathymetry), served by NASA EOSDIS GIBS',
  bundled: 'Natural Earth II (public domain), bundled offline fallback',
};
type Ring = [number, number][];
export type RegionShape = { id: string; rings: Ring[] };

const loadCesium = () => {
  (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;
  return import('cesium');
};
/** start downloading the Cesium bundle (about 1.4 MB gzipped) now, in parallel with the data files */
export const preloadCesium = () => { void loadCesium(); };

export async function createEarth(el: HTMLElement, regions: RegionShape[]) {
  const C = await loadCesium();
  const online = await fetch(GIBS.replace('{z}/{y}/{x}', '0/0/0'), { signal: AbortSignal.timeout(6000) }).then((r) => r.ok, () => false);
  const provider = online
    ? new C.UrlTemplateImageryProvider({ url: GIBS, maximumLevel: 8, credit: 'NASA EOSDIS GIBS — Blue Marble' })
    : await C.TileMapServiceImageryProvider.fromUrl(C.buildModuleUrl('Assets/Textures/NaturalEarthII'));
  const viewer = new C.Viewer(el, {
    baseLayer: new C.ImageryLayer(provider), baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false,
    navigationHelpButton: false, animation: false, timeline: false, fullscreenButton: false, infoBox: false, selectionIndicator: false,
    useDefaultRenderLoop: false,                       // drawn only when the stage asks: no second render loop
    contextOptions: { webgl: { preserveDrawingBuffer: true } },
  });
  const { scene, camera } = viewer;
  scene.screenSpaceCameraController.enableInputs = false;   // the stage owns the camera (one pose for both engines)
  scene.globe.baseColor = C.Color.fromCssColorString('#0b1d3a');
  scene.backgroundColor = C.Color.fromCssColorString('#060D1A');
  scene.globe.enableLighting = true;                   // day/night terminator from a fixed, declared instant: deterministic frames
  viewer.clock.shouldAnimate = false;
  viewer.clock.currentTime = C.JulianDate.fromIso8601('2025-06-21T20:30:00Z');

  // region outlines (geoBoundaries ADM1): largest ring of each region
  const lines = regions.map((r) => {
    const ring = r.rings.reduce((a, b) => (b.length > a.length ? b : a));
    return { id: r.id, e: viewer.entities.add({ polyline: { positions: C.Cartesian3.fromDegreesArray(ring.flat()), width: 1, material: C.Color.WHITE } }) };
  });
  let outlineKey = '';

  // ---- data layers on the curved globe: polygons on the ellipsoid, coloured per instance (no texture, no flat sheet) ----
  type Poly = [number, number][][];                    // rings, outer first
  type Layer = { fill: InstanceType<typeof C.Primitive>; line: InstanceType<typeof C.Primitive>; ids: string[][]; want: { fill: (string | null)[]; line: (string | null)[]; alpha: number } | null; key: string };
  const layers = new Map<string, Layer>();
  const hier = (rings: Poly) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(rings[0].flat()), rings.slice(1).map((h) => new C.PolygonHierarchy(C.Cartesian3.fromDegreesArray(h.flat()))));
  const clear = () => C.ColorGeometryInstanceAttribute.fromColor(new C.Color(0, 0, 0, 0));
  /** items[i] = the polygons of feature i (a native cell clipped to land, or a region). */
  function addLayer(name: string, items: Poly[][], asynchronous = false) {
    const ids = items.map((polys, i) => polys.map((_, j) => `${name}:${i}:${j}`));
    const inst = (outline: boolean) => items.flatMap((polys, i) => polys.map((rings, j) => new C.GeometryInstance({
      id: ids[i][j],
      geometry: outline
        ? new C.PolygonOutlineGeometry({ polygonHierarchy: hier(rings), arcType: C.ArcType.RHUMB, height: 0 })
        : new C.PolygonGeometry({ polygonHierarchy: hier(rings), arcType: C.ArcType.RHUMB, height: 0, vertexFormat: C.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT }),
      attributes: { color: clear() },
    })));
    const mk = (outline: boolean) => scene.primitives.add(new C.Primitive({
      geometryInstances: inst(outline), asynchronous, show: false,
      appearance: new C.PerInstanceColorAppearance({ flat: true, translucent: true }),
    })) as InstanceType<typeof C.Primitive>;
    layers.set(name, { fill: mk(false), line: mk(true), ids, want: null, key: '' });
  }
  /** Colours per feature (null = not drawn: no data is never zero) and one opacity for the fills. */
  function setLayer(name: string, version: string, fill: (string | null)[], line: (string | null)[], alpha: number) {
    const l = layers.get(name);
    if (!l) return;
    const key = alpha < 0.005 ? 'off' : `${version}|${Math.round(alpha * 100)}`;
    if (key === l.key) return;
    l.key = key; l.want = { fill, line, alpha };
  }
  function flush() {
    let pending = false;
    for (const l of layers.values()) {
      if (!l.want) continue;
      const on = l.want.alpha >= 0.005;
      l.fill.show = on; l.line.show = on;
      if (!on) { l.want = null; continue; }
      if (!l.fill.ready || !l.line.ready) { pending = true; continue; }
      l.ids.forEach((js, i) => js.forEach((id) => {
        const f = l.want!.fill[i], s = l.want!.line[i];
        l.fill.getGeometryInstanceAttributes(id).color = C.ColorGeometryInstanceAttribute.toValue(f ? C.Color.fromCssColorString(f).withAlpha(l.want!.alpha) : new C.Color(0, 0, 0, 0));
        l.line.getGeometryInstanceAttributes(id).color = C.ColorGeometryInstanceAttribute.toValue(s ? C.Color.fromCssColorString(s).withAlpha(Math.min(1, l.want!.alpha * 1.6)) : new C.Color(0, 0, 0, 0));
      }));
      l.want = null;
    }
    return pending;
  }
  // dashed study-area outlines (a delimitation, not data): polylines on the ellipsoid, like the region outlines
  const dashes = new Map<string, { es: InstanceType<typeof C.Entity>[]; css: string; key: string }>();
  function addDash(name: string, rings: Ring[], css: string) {
    dashes.set(name, { css, key: '', es: rings.map((r) => viewer.entities.add({ show: false, polyline: { positions: C.Cartesian3.fromDegreesArray(r.flat()),
      width: 1.6, arcType: C.ArcType.RHUMB, material: C.Color.WHITE } })) });
  }
  function setDash(name: string, alpha: number) {
    const d = dashes.get(name);
    const key = alpha < 0.01 ? 'off' : alpha.toFixed(2);
    if (!d || key === d.key) return;
    d.key = key;
    const m = new C.PolylineDashMaterialProperty({ color: C.Color.fromCssColorString(d.css).withAlpha(alpha), gapColor: C.Color.TRANSPARENT, dashLength: 12 });
    for (const e of d.es) { e.show = alpha >= 0.01; e.polyline!.material = m; }
  }
  let busy = false;
  const occluder = new C.EllipsoidalOccluder(C.Ellipsoid.WGS84, camera.positionWC);
  const scratch = new C.Cartesian2();

  return {
    basemap: online ? 'gibs' as const : 'bundled' as const,
    addLayer, setLayer, addDash, setDash,
    hasLayer: (name: string) => layers.has(name),
    /** lon/lat → canvas pixel, or null when the point is behind the planet or off screen */
    project(lon: number, lat: number): [number, number] | null {
      const c = C.Cartesian3.fromDegrees(lon, lat, 0);
      occluder.cameraPosition = camera.positionWC;
      if (!occluder.isPointVisible(c)) return null;
      const w = C.SceneTransforms.worldToWindowCoordinates(scene, c);
      return w ? [w.x, w.y] : null;
    },
    /** canvas pixel → lon/lat on the ellipsoid, or null in space */
    pick(x: number, y: number): [number, number] | null {
      scratch.x = x; scratch.y = y;
      const c = camera.pickEllipsoid(scratch, C.Ellipsoid.WGS84);
      if (!c) return null;
      const g = C.Cartographic.fromCartesian(c);
      return [g.longitude / R, g.latitude / R];
    },
    setPose(p: Pose) {
      camera.lookAt(C.Cartesian3.fromDegrees(p.lon, p.lat, 0), new C.HeadingPitchRange(p.heading * R, p.pitch * R, p.range * 1000));
      camera.lookAtTransform(C.Matrix4.IDENTITY);
    },
    /** alpha 0..1 for all outlines; the selected region is drawn in the accent colour */
    setOutlines(alpha: number, selected: string | null) {
      const key = `${alpha.toFixed(2)}|${selected}`;
      if (key === outlineKey) return;
      outlineKey = key;
      for (const l of lines) {
        const sel = l.id === selected;
        l.e.show = alpha > 0.01;
        l.e.polyline!.width = new C.ConstantProperty(sel ? 2.5 : 1);
        l.e.polyline!.material = new C.ColorMaterialProperty((sel ? C.Color.fromCssColorString('#4CD9E6') : C.Color.WHITE).withAlpha(alpha * (sel ? 1 : 0.35)));
      }
    },
    render() {
      viewer.resize();
      const a = scene.canvas.clientWidth / Math.max(1, scene.canvas.clientHeight);
      const f = camera.frustum as InstanceType<typeof C.PerspectiveFrustum>;
      f.fov = a >= 1 ? 2 * Math.atan(Math.tan((FOV_Y * R) / 2) * a) : FOV_Y * R;   // Cesium's fov is along the larger side
      busy = flush();
      viewer.render();
      if (!busy && [...layers.values()].some((l) => l.want)) { busy = flush(); viewer.render(); }
    },
    loaded: () => scene.globe.tilesLoaded && !busy,
    /** render until every tile for the current view has arrived (capture only) */
    async settle(maxMs = 20000) {
      const t0 = performance.now();
      for (;;) {
        this.render();
        if ((scene.globe.tilesLoaded && !busy) || performance.now() - t0 > maxMs) return;
        await new Promise((r) => setTimeout(r, 40));
      }
    },
    canvas: scene.canvas as HTMLCanvasElement,
    destroy: () => viewer.destroy(),
  };
}
export type Earth = Awaited<ReturnType<typeof createEarth>>;

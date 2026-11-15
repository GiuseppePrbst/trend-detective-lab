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

export async function createEarth(el: HTMLElement, regions: RegionShape[]) {
  (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`;
  const C = await import('cesium');
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

  return {
    basemap: online ? 'gibs' as const : 'bundled' as const,
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
      viewer.render();
    },
    loaded: () => scene.globe.tilesLoaded,
    /** render until every tile for the current view has arrived (capture only) */
    async settle(maxMs = 20000) {
      const t0 = performance.now();
      for (;;) {
        this.render();
        if (scene.globe.tilesLoaded || performance.now() - t0 > maxMs) return;
        await new Promise((r) => setTimeout(r, 40));
      }
    },
    canvas: scene.canvas as HTMLCanvasElement,
    destroy: () => viewer.destroy(),
  };
}
export type Earth = Awaited<ReturnType<typeof createEarth>>;

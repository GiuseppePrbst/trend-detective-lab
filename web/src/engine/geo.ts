// One camera definition for both engines. A pose is georeferenced (target on the ground + heading/pitch/range),
// so the Cesium globe and the Three.js terrain can be driven by the same keyframes.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import type { Scene } from './terrain';

/** target lon/lat in degrees; heading clockwise from north and pitch (negative = looking down) in degrees; range in km */
export type Pose = { lon: number; lat: number; heading: number; pitch: number; range: number };
export const FOV_Y = 35;   // vertical field of view, degrees, shared by both cameras

const R = Math.PI / 180;

/** WGS84 → UTM (Snyder's transverse Mercator series). Returns metres. */
export function utm(lon: number, lat: number, epsg: number): [number, number] {
  const zone = epsg % 100, south = Math.floor(epsg / 100) === 327;
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const p = lat * R, s = Math.sin(p), c = Math.cos(p), t = Math.tan(p);
  const N = a / Math.sqrt(1 - e2 * s * s), T = t * t, C = ep2 * c * c, A = (lon - (zone * 6 - 183)) * R * c;
  const M = a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * p - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * p)
    + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * p) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * p));
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  const y = k0 * (M + N * t * (A * A / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  return [x, south ? y + 10000000 : y];
}

/** lon/lat → texture coordinates of a scene (u east, v south), the convention of scene.json */
export function toUV(scene: Scene, lon: number, lat: number): [number, number] {
  const [x0, y0, x1, y1] = scene.bounds_utm, [x, y] = utm(lon, lat, scene.epsg);
  return [(x - x0) / (x1 - x0), (y1 - y) / (y1 - y0)];
}

/** Pose → Three.js camera position and target in the terrain's local frame (x east, y up, z south; km). */
export function poseToLocal(scene: Scene, W: number, H: number, p: Pose) {
  const [u, v] = toUV(scene, p.lon, p.lat);
  const target: [number, number, number] = [(u - 0.5) * W, 0, (v - 0.5) * H];
  const ch = Math.cos(p.heading * R), sh = Math.sin(p.heading * R), cp = Math.cos(p.pitch * R), sp = Math.sin(p.pitch * R);
  const position: [number, number, number] = [target[0] - sh * cp * p.range, -sp * p.range, target[2] + ch * cp * p.range];
  return { position, target };
}

// DEV self-check: the projection must put a known city where the pipeline put it.
if (import.meta.env.DEV) {
  const [x, y] = utm(-70.4, -23.65, 32719);   // reference from pyproj 4326 → 32719: 357212.33 E, 7383822.56 N
  console.assert(Math.abs(x - 357212.33) < 1 && Math.abs(y - 7383822.56) < 1, 'utm() self-check failed', x, y);
}

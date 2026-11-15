// Copies Cesium's static runtime files (workers, textures, third-party wasm) next to the app, so nothing loads from a CDN.
import { cpSync } from 'node:fs';
for (const d of ['Assets', 'Workers', 'ThirdParty']) cpSync(`node_modules/cesium/Build/Cesium/${d}`, `public/cesium/${d}`, { recursive: true });

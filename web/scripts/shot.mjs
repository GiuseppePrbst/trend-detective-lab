// Screenshots of the live application for visual QA (headless Chrome over the DevTools protocol, like render.mjs).
//   node --experimental-websocket scripts/shot.mjs <outDir> <base url> <width>x<height> name=query[@seconds] ...
//   e.g. node --experimental-websocket scripts/shot.mjs out/qa http://localhost:5199/ 1440x900 earth= antofagasta=?region=antofagasta@9
// Each shot loads <base><query>, waits <seconds> (default 9: basemap tiles and the flight) and saves <outDir>/<name>.jpg.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';

const [out, base, size, ...shots] = process.argv.slice(2);
if (!out || !base || !size || !shots.length) { console.error('usage: shot.mjs <outDir> <base url> <WxH> name=query[@seconds] ...'); process.exit(1); }
const [W, H] = size.split('x').map(Number);
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));
const port = 9300 + (process.pid % 600), prof = join(tmpdir(), `tdl-shot-${port}`);
const chrome = spawn(CHROME, ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${prof}`, `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
let tg; for (let i = 0; i < 160 && !tg; i++) { try { tg = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { await wait(250); } }
const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let mid = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++mid; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
try {
  mkdirSync(out, { recursive: true });
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 700 });
  for (const s of shots) {
    const [name, rest = ''] = [s.slice(0, s.indexOf('=')), s.slice(s.indexOf('=') + 1)];
    const [query, secs] = rest.split('@');
    await send('Page.navigate', { url: base + query });
    await wait((Number(secs) || 9) * 1000);
    writeFileSync(join(out, `${name}.jpg`), Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 })).result.data, 'base64'));
    console.log(name);
  }
} finally { ws.close(); chrome.kill(); try { rmSync(prof, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* the throwaway profile (about 100 MB) stays in the temp folder */ } }
process.exit(0);

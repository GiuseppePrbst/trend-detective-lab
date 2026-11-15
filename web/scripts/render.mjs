// Renders the film from the real application, frame by frame. Adapted from the team's `saas-animation` skill (scripts/render.mjs):
// same page contract (window.renderAt(t), window.TOTAL, window.ready, window.EVENTS), but each frame is a screenshot of the
// whole page instead of one canvas, because the picture is two WebGL canvases (Cesium + Three.js) plus the real interface.
//
//   node scripts/render.mjs stills <outDir> <t1> <t2> ...   [--scale 1] [--url http://localhost:5199/]
//   node scripts/render.mjs video  <out.mp4> [--fps 30] [--scale 1|2] [--audio file.wav] [--url ...]
//   node scripts/render.mjs events <out.json>
//
//   --scale 2 = 3840x2160 (the page is laid out at 1920x1080 and drawn at 2 device pixels per CSS pixel)
//   --url     an already running server; default: serve ./dist (run `npm run build` first)
// Needs: Node 18+ (WebSocket: Node 22+, or run with --experimental-websocket on Node 20/21), ffmpeg on PATH, Chrome (set CHROME=/path if not found).
// SI disclosure: adapted with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';

const argv = process.argv.slice(2);
const flag = (n) => { const i = argv.indexOf(n); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const FPS = +(flag('--fps') || 30), SCALE = +(flag('--scale') || 1), AUDIO = flag('--audio'), URL0 = flag('--url');
const [mode, out, ...rest] = argv;
if (!mode || !out) { console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(0, 12).join('\n')); process.exit(1); }

const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => existsSync(p));
if (!CHROME) { console.error('Chrome not found: set CHROME=/path/to/chrome'); process.exit(1); }

let server = null, base = URL0;
if (!base) {
  const ROOT = resolve('dist');
  if (!existsSync(join(ROOT, 'index.html'))) { console.error('dist/ not found: run `npm run build` first, or pass --url'); process.exit(1); }
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.json': 'application/json', '.geojson': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm' };
  server = createServer((req, res) => {
    let p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (p.startsWith(ROOT) && existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!p.startsWith(ROOT) || !existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(p).toLowerCase()] || 'application/octet-stream' }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
}

const port = 9300 + (process.pid % 600), prof = join(tmpdir(), `tdl-chrome-${port}`);
const chrome = spawn(CHROME, ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-device-scale-factor=1',
  `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
let tg; for (let i = 0; i < 160 && !tg; i++) { try { tg = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { await wait(250); } }
if (!tg) { console.error('Chrome did not start'); process.exit(1); }
const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let mid = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++mid; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(JSON.stringify(m.result.exceptionDetails).slice(0, 500)); return m.result.result.value; };
const done = (code) => { try { ws.close(); } catch { /* closing */ } chrome.kill(); server?.close(); try { rmSync(prof, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* the throwaway profile (about 100 MB) stays in the temp folder */ } process.exit(code); };
const shot = async (t, quality) => { await ev(`window.renderAt(${t}).then(() => true)`); return Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality })).result.data, 'base64'); };

try {
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: SCALE, mobile: false });
  await send('Page.navigate', { url: `${base}?capture=1` });
  for (let i = 0; i < 150; i++) { await wait(400); if (await ev('typeof window.renderAt === "function"')) break; }
  await ev('Promise.resolve(window.ready).then(() => true)');
  console.log(`basemap: ${await ev('document.querySelector(".im-root") ? "ready" : "missing"')}, gl: ${await ev('(() => { const g = document.createElement("canvas").getContext("webgl2"); const e = g && g.getExtension("WEBGL_debug_renderer_info"); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : "unknown"; })()')}`);
  if (mode === 'events') { const evs = await ev('JSON.stringify(window.EVENTS || [])'); writeFileSync(out, evs); console.log(`${JSON.parse(evs).length} events -> ${out}`); done(0); }
  if (mode === 'stills') {
    mkdirSync(out, { recursive: true });
    for (const t of rest.map(Number)) writeFileSync(join(out, `${t.toFixed(2).padStart(5, '0')}.jpg`), await shot(t, 90));
    console.log(`stills -> ${out}`); done(0);
  }
  const total = await ev('window.TOTAL'), n = Math.round(total * FPS), t0 = Date.now();
  const aud = AUDIO ? ['-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '320k'] : [];
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...aud,
    '-vf', 'scale=in_range=pc:out_range=tv', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart', '-t', String(n / FPS), resolve(out)], { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = ''; ff.stderr.on('data', (d) => { err += d; });
  const fin = new Promise((ok, no) => ff.on('close', (c) => (c === 0 ? ok() : no(new Error(err || 'ffmpeg failed')))));
  for (let f = 0; f < n; f++) {
    if (!ff.stdin.write(await shot(f / FPS, 95))) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % FPS === 0) process.stdout.write(`\r${f}/${n} frames`);
  }
  ff.stdin.end(); await fin;
  console.log(`\nSAVED ${out} (${n} frames at ${FPS} fps, ${((Date.now() - t0) / 60000).toFixed(1)} min)`); done(0);
} catch (e) { console.error('FAILED:', e.message); done(1); }

// Browser smoke tests of the live application (headless Chrome over the DevTools protocol, like shot.mjs; no new dependency).
//   node --experimental-websocket scripts/smoke.mjs <base url> [outDir]
//   e.g. npm run dev -- --port 5199   then   npm run smoke
// It drives the real page: flags, flights, extremes, regions, windows, cell selection, intro Skip/Stop, Research Lab,
// old URLs, the no-WebGL fallback, layout overlaps at several viewports, and a few timings (reported, never asserted).
// Needs network for the basemap. Not part of CI: a GPU-less runner would measure SwiftShader, not the app.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';

const [base = 'http://localhost:5199/', out = 'out/smoke'] = process.argv.slice(2);
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((p) => existsSync(p));
const port = 9300 + (process.pid % 600), prof = join(tmpdir(), `tdl-smoke-${port}`);
const chrome = spawn(CHROME, ['--headless=new', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--enable-precise-memory-info', `--remote-debugging-port=${port}`,
  `--user-data-dir=${prof}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
let tg; for (let i = 0; i < 160 && !tg; i++) { try { tg = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { await wait(250); } }
const ws = new WebSocket(tg.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; });
let mid = 0; const pend = new Map(), errors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++mid; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => {
  const r = (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result;
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const until = async (expression, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expression).catch(() => false)) return Date.now() - t0; await wait(100); } throw new Error(`timeout: ${expression}`); };
const size = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
const shot = async (name) => writeFileSync(join(out, `${name}.jpg`), Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality: 86 })).result.data, 'base64'));
const READY = `!!document.querySelector('.im-root') && !document.querySelector('.im-status')`;
const go = async (query, ready = READY) => { await send('Page.navigate', { url: base + query }); await wait(300); return until(ready, 40000); };
const TERR = `document.querySelector('.im-left select')?.value`;
const click = (text, scope = 'button, a') => ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)})].find((x) => x.offsetParent && x.textContent.trim().startsWith(${JSON.stringify(text)})); if (!b) throw new Error('no control: ' + ${JSON.stringify(text)}); b.click(); })()`);
const choose = (sel, value) => ev(`(() => { const s = document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, ${JSON.stringify(value)}); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
const tap = async (x, y) => { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); };
const ARRIVED = (id) => `${TERR} === '${id}' && !!document.querySelector('.im-extremes') && getComputedStyle(document.querySelector('.im-terrain')).opacity > 0.9`;
const EXTREMES = `[...document.querySelectorAll('.im-extremes b')].map((b) => b.textContent)`;
// highest / lowest of the published per-cell trends, formatted as the page formats them
const published = (scene, period) => ev(`fetch('scene3d/${scene}/scene.json').then((r) => r.json()).then((d) => { const v = d.cells.map((c) => c.trends['${period}']?.slope).filter(Number.isFinite);
  const f = (x) => (x < 0 ? '−' : '+') + Math.abs(x).toFixed(2); return [f(Math.max(...v)), f(Math.min(...v))]; })`);
const same = (a, b) => JSON.stringify(a).replaceAll('-', '−') === JSON.stringify(b).replaceAll('-', '−');
// boxes of the floating interface that must not cover one another
const OVERLAPS = `(() => { const q = ['.im-top', '.im-panel.im-left', '.im-panel.im-right', '.im-cam', '.im-extremes', '.im-dock', '.im-foot'];
  const b = q.map((s) => [s, document.querySelector(s)]).filter(([, e]) => e && e.offsetParent !== null && getComputedStyle(e).display !== 'none').map(([s, e]) => [s, e.getBoundingClientRect()]);
  const bad = []; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) { const [a, c] = [b[i][1], b[j][1]];
    if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) bad.push(b[i][0] + ' × ' + b[j][0]); }
  const off = b.filter(([, r]) => r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1).map(([s]) => s + ' off-screen');
  return [...bad, ...off]; })()`;

const results = [], metrics = {};
const test = async (name, fn) => {
  if (process.env.ONLY && !process.env.ONLY.split(',').some((p) => name.startsWith(p))) return;   // e.g. ONLY=21 npm run smoke
  const e0 = errors.length;
  try { const note = await fn(); const errs = errors.slice(e0); if (errs.length) throw new Error(`console: ${errs[0]}`); results.push({ name, ok: true, note }); console.log(`ok   ${name}${note ? ` — ${note}` : ''}`); }
  catch (e) { results.push({ name, ok: false, note: String(e.message ?? e) }); console.log(`FAIL ${name} — ${e.message ?? e}`); await shot(`FAIL_${results.length}`).catch(() => undefined); }
};
const assert = (c, msg) => { if (!c) throw new Error(msg); };

try {
  mkdirSync(out, { recursive: true });
  await send('Runtime.enable'); await send('Page.enable');
  await size(1440, 900);

  await test('01 Whole Earth loads and draws the planet', async () => {
    const t0 = Date.now(); await go(''); metrics.ready_ms = Date.now() - t0;
    assert(await ev(TERR) === 'earth', 'territory is not Whole Earth');
    assert(await ev(`document.querySelectorAll('h1').length`) === 1, 'the page needs exactly one h1 (screen readers)');
    await wait(4000);
    const px = await ev(`(() => { const c = document.querySelector('.im-globe canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'), p = new Uint8Array(4); gl.readPixels(c.width >> 1, c.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return [...p]; })()`);
    assert(px[0] + px[1] + px[2] > 30, `centre pixel is black: ${px}`);
    await shot('01_earth'); return `ready in ${metrics.ready_ms} ms`;
  });
  await test('02 two flags, sound off by default', async () => {
    const flags = await ev(`[...document.querySelectorAll('.im-flag')].filter((e) => e.style.display !== 'none').map((e) => e.textContent.trim())`);
    assert(same(flags, ['Antofagasta, Chile', 'Los Lagos, Chile']), `flags: ${flags}`);
    assert(await ev(`document.querySelector('.im-snd').textContent`) === 'Sound off', 'sound is not off by default');
    return flags.join(' / ');
  });
  await test('03 flag → flight → Antofagasta with relief', async () => {
    await ev(`document.querySelector('.im-flag').click()`);
    metrics.flight_earth_antofagasta_ms = await until(ARRIVED('antofagasta'));
    await wait(1500); await shot('03_antofagasta'); return `${metrics.flight_earth_antofagasta_ms} ms`;
  });
  await test('04 extremes appear without a click and equal the published cell trends', async () => {
    const [seen, want] = [await ev(EXTREMES), await published('antofagasta', '1980-2025')];
    assert(same(seen, want), `card ${seen} vs published ${want}`);
    assert((await ev(`document.querySelector('.im-extremes').textContent`)).includes('not observed extremes'), 'not labelled as trends');
    assert(await ev(`document.querySelectorAll('.im-ext').length`) === 2, 'no two markers on the cells');
    return seen.join(' / ');
  });
  await test('05 window 2003–2025: extremes follow, SST layer on', async () => {
    await click('2003–2025', '.im-dock button'); await wait(800);
    const [seen, want] = [await ev(EXTREMES), await published('antofagasta', '2003-2025')];
    assert(same(seen, want), `card ${seen} vs published ${want}`);
    assert((await ev(`document.querySelector('.im-extremes p').textContent`)).includes('2003–2025'), 'window not shown in the card');
    await shot('05_antofagasta_2003_2025'); await click('1980–2025', '.im-dock button'); return seen.join(' / ');
  });
  await test('06 a click keeps a cell selected', async () => {
    await tap(700, 440); await wait(500);
    const txt = await ev(`document.querySelector('.im-right').textContent`);
    assert(txt.includes('Selected cell'), 'no selected-cell card'); assert(/MERRA-2 cell/.test(txt), 'card has no cell title');
    await shot('06_cell'); await click('Close cell'); return txt.match(/MERRA-2 cell [^P]*?°, [^°]*°/)?.[0];
  });
  await test('07 Antofagasta → Los Lagos: one flight, no cut', async () => {
    await click('Travel to Los Lagos');
    let low = 1, top = 0; const t0 = Date.now();
    while (!(await ev(ARRIVED('los-lagos')).catch(() => false))) {          // sample the flight: the relief must fade out before the other fades in
      low = Math.min(low, Number(await ev(`getComputedStyle(document.querySelector('.im-terrain')).opacity`)));
      if (Date.now() - t0 > 2500 && !top) { top = 1; await shot('07_mid_flight'); }
      assert(Date.now() - t0 < 20000, 'flight did not arrive'); await wait(80);
    }
    metrics.flight_antofagasta_los_lagos_ms = Date.now() - t0;
    assert(low < 0.05, `relief never left the screen (min opacity ${low})`);
    const [seen, want] = [await ev(EXTREMES), await published('los_lagos', '2000-2024')];
    assert(same(seen, want), `card ${seen} vs published ${want}`);
    await wait(1500); await shot('07_los_lagos'); return `${metrics.flight_antofagasta_los_lagos_ms} ms, relief hidden at the top`;
  });
  await test('08 Los Lagos → Antofagasta, interrupted and resumed', async () => {
    await click('Travel to Antofagasta'); await wait(1200);
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await wait(600);
    const a = await ev(`document.querySelector('.im-ext, .im-flag')?.style.transform`); await wait(600);
    assert(a === await ev(`document.querySelector('.im-ext, .im-flag')?.style.transform`), 'camera still moving after Escape');
    await choose('.im-left select', 'antofagasta');
    metrics.flight_los_lagos_antofagasta_ms = await until(ARRIVED('antofagasta')); return `${metrics.flight_los_lagos_antofagasta_ms} ms after the interruption`;
  });
  await test('09 the 16 regions: list, region card, regional layer', async () => {
    const n = await ev(`document.querySelectorAll('.im-left select')[0].querySelectorAll('optgroup option').length`);   // the Territory list
    assert(n === 16, `${n} regions in the list`);
    await choose('.im-left select', 'maule'); await until(`document.querySelector('.im-right h3')?.textContent === 'Maule'`);
    await until(`document.querySelectorAll('.im-right .im-big').length === 2`);
    await choose('.im-left label:nth-of-type(2) select', 't2m'); await wait(5000);
    assert(new URL(await ev('location.href')).searchParams.get('region') === 'maule', 'address does not keep the region');
    await click('Trends'); await until(`document.querySelectorAll('.im-right tbody tr').length === 16`);
    await click('Explore'); await shot('09_maule_regional'); return (await ev(`[...document.querySelectorAll('.im-right .im-big')].map((b) => b.textContent)`)).join(' | ');
  });
  await test('10 Research Lab opens on the same region, one way back', async () => {
    await click('Research Lab');
    await until(`!!document.querySelector('.paper, main') && !!document.querySelector('#h-region')`);
    assert(new URL(await ev('location.href')).searchParams.get('region') === 'maule', 'Lab address lost the region');
    const backs = await ev(`[...document.querySelectorAll('a')].filter((a) => /globe|Immersive Earth/i.test(a.textContent)).map((a) => a.textContent.trim() + ' → ' + a.getAttribute('href'))`);
    assert(backs.length === 1, `${backs.length} links back: ${backs.join(' ; ')}`);
    assert(backs[0].endsWith('?region=maule'), `back link drops the region: ${backs[0]}`);
    assert(await ev(`document.querySelector('aside.side select').value`) === 'maule', 'the Lab did not preselect Maule');
    await shot('10_lab_maule'); return backs[0];
  });
  await test('11 intro: Skip jumps to the interactive last frame', async () => {
    await go('?mode=cinematic', `!!document.querySelector('.im-skip')`); await wait(2500); await shot('11_intro_2s');
    await click('Skip intro'); await until(`!document.querySelector('.is-film')`);
    assert(await ev(TERR) === 'antofagasta', 'Skip did not land in Antofagasta');
    assert(await ev(`document.querySelector('.im-dock [aria-pressed="true"]').textContent`) === '2003–2025', 'Skip did not land on the film\'s last window');
    await wait(2500); await shot('11_after_skip');
  });
  await test('12 intro: Stop stays where the camera is', async () => {
    await go('?mode=cinematic', `!!document.querySelector('.im-skip')`); await wait(2500);
    await click('Stop here'); await until(`!document.querySelector('.is-film')`);
    assert(await ev(TERR) === 'earth', 'Stop jumped into a territory');
    assert(await ev(`document.querySelectorAll('.im-flag').length`) === 2, 'no flags after Stop');
  });
  await test('13 old URL ?embed=3d still draws the terrain', async () => {
    await go('?embed=3d&scene=antofagasta&period=2003-2025&cam=oblique&exag=3&tex=relief', `!!document.querySelector('.embed3d canvas')`);
    await wait(3000); await shot('13_embed3d');
  });
  await test('14 shareable ?region=los-lagos&relief=0 draws cells on the globe', async () => {
    await go('?region=los-lagos&relief=0'); await until(`${TERR} === 'los-lagos' && !!document.querySelector('.im-extremes')`);
    assert(Number(await ev(`getComputedStyle(document.querySelector('.im-terrain')).opacity`)) === 0, 'relief drawn although relief=0');
    await wait(5000); await shot('14_los_lagos_cells_on_globe');
  });
  await test('15 sound: on/off, volume, remembered; the page works either way', async () => {
    await click('Sound off'); assert(await ev(`document.querySelector('.im-snd').textContent`) === 'Sound on', 'did not switch on');
    assert(await ev(`!!document.querySelector('.im-vol')`), 'no volume slider');
    assert(JSON.parse(await ev(`localStorage.getItem('tdl-sound')`)).on === true, 'choice not stored');
    await click('Trends'); await click('Explore'); await click('Sound on');
    assert(JSON.parse(await ev(`localStorage.getItem('tdl-sound')`)).on === false, 'switching off not stored');
  });

  await test('19 SST study area: card from sst.json on the sea, gone when switched off or outside 2003–2025', async () => {
    await go('?region=antofagasta&period=2003-2025'); await until(ARRIVED('antofagasta')); await wait(3500);
    await tap(520, 540); await wait(500);                                  // open Pacific inside the dashed outline (1440×900 arrival pose)
    const card = await ev(`document.querySelector('.im-right').textContent`);
    assert(card.includes('NASA MUR SST'), 'no SST card on the sea'); assert(card.includes('not a spatial temperature map'), 'card does not say it is one area average');
    const t = await ev(`fetch('data/sst.json').then((r) => r.json()).then((d) => d.series.mur_sst.trend.slope_per_decade.toFixed(2))`);
    assert(card.includes(t), `card does not show the published slope ${t}`);
    await ev(`[...document.querySelectorAll('.im-check')].find((l) => /SST/.test(l.textContent)).querySelector('input').click()`); await wait(400);
    await tap(520, 540); await wait(500);
    assert(!(await ev(`document.querySelector('.im-right').textContent`)).includes('NASA MUR SST'), 'SST card opens although the layer is off');
    await shot('19_sst_off');
    await go('?region=antofagasta&period=1980-2025'); await until(ARRIVED('antofagasta')); await wait(3000); await tap(520, 540); await wait(500);
    assert(!(await ev(`document.querySelector('.im-right').textContent`)).includes('NASA MUR SST'), 'SST card opens outside 2003–2025');
    return `+${t} °C per decade`;
  });

  await test('20 colour scale: spatial legend from the real cell range, Fixed comparison restores the common scale', async () => {
    await go('?region=antofagasta&period=2003-2025'); await until(ARRIVED('antofagasta')); await wait(2500);
    const leg = () => ev(`document.querySelector('.im-legend').textContent`);
    const a = await leg(), ex = await ev(`document.querySelector('.im-extremes')?.textContent ?? ''`);
    assert(/Spatial contrast/.test(a) && /not directly comparable between periods/.test(a), 'spatial legend or its warning missing');
    for (const v of ex.match(/[+−-]0\.\d\d/g)?.slice(0, 2) ?? []) assert(a.includes(v.replace('−', '-')) || a.includes(v), `legend does not end at the extreme ${v}`);
    await ev(`(() => { const el = [...document.querySelectorAll('.im-field')].find((f) => /Colour scale/.test(f.textContent)).querySelector('select');
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, 'fixed'); el.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await wait(600);
    const b = await leg();
    assert(/Fixed comparison/.test(b) && /directly comparable/.test(b) && /0\.70/.test(b), 'fixed legend wrong');
    await shot('20_fixed');
    return 'spatial ↔ fixed';
  });

  // presenter mode: the whole jury run with the real keys, timed; one capture per cue (out/<dir>/presenter/)
  await test('21 presenter mode: eight cues with the keyboard, ready in time, figures from the JSON, Lab and back', async () => {
    mkdirSync(join(out, 'presenter'), { recursive: true });
    const [pw, ph] = (process.env.PSIZE || '1440x900').split('x').map(Number); await size(pw, ph);   // PSIZE=1920x1080 for the backup captures
    const key = async (k, code) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: { ArrowRight: 39, ArrowLeft: 37, Home: 36 }[k] }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code }); };
    const READY = `document.querySelector('.pr-dot')?.classList.contains('is-ok')`;
    const t0 = Date.now(); await go('?present=1', `!!document.querySelector('.pr-start') && !!window.tdlStage`); metrics.presenter_load_ms = Date.now() - t0;
    await ev(`[...document.querySelectorAll('.pr-start button')].find((b) => b.textContent.startsWith('Rehearsal')).click()`);
    const t2m = await ev(`fetch('data/t2m.json').then((r) => r.json())`), f2 = (x) => `${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(2)}`;
    const want = { comparison: [f2(t2m.regions.antofagasta.trend.slope_per_decade), f2(t2m.regions['los-lagos'].trend.slope_per_decade), f2(t2m.comparisons['antofagasta|los-lagos'].slope_per_decade)] };
    const steps = ['01', '02', '03', '04', '05', '05b', '06', '07', '08'], times = {};
    for (let k = 0; k < steps.length; k++) {
      const s0 = Date.now();
      const before = await ev(`document.querySelector('.pr-n').textContent`);
      if (k) { await key('ArrowRight', 'ArrowRight'); await until(`document.querySelector('.pr-n').textContent !== ${JSON.stringify(before)}`, 5000); await wait(300); }
      await until(READY, 30000); times[steps[k]] = Date.now() - s0;
      const label = await ev(`document.querySelector('.pr-n').textContent`);
      assert(label.startsWith(steps[k].slice(0, 2)), `cue label ${label} instead of ${steps[k]}`);
      if (steps[k] === '03') { await wait(1500); assert(await ev(`!!document.querySelector('.is-film')`), 'the film is not playing'); await shot('presenter/cue-03'); await until(`!document.querySelector('.is-film')`, 35000); times['03_film_end'] = Date.now() - s0; continue; }
      if (steps[k] === '04') { const card = await ev(`document.querySelector('.pr-card').textContent`); for (const v of want.comparison) assert(card.includes(v), `card lacks ${v}: ${card}`); assert(card.includes('Pre-registered'), 'not labelled pre-registered'); }
      if (steps[k] === '05b') assert((await ev(`document.querySelector('.pr-card').textContent`)).includes('2003–2025'), 'cue 5b not on 2003–2025');
      if (steps[k] === '06' || steps[k] === '07') {
        const id = steps[k] === '06' ? 'h-coast' : 'h-magallanes';
        const top = await ev(`document.querySelector('.pr-lab').contentDocument.getElementById('${id}').getBoundingClientRect().top`);
        assert(top >= -5 && top < 120, `Lab section ${id} not at the top (${top})`);
        assert(await ev(`!!window.tdlStage && !!document.querySelector('.im-root')`), 'the globe was unmounted');
      }
      if (steps[k] === '08') assert((await ev(`document.querySelector('.pr-card').textContent`)).includes('Explore Earth. Understand Change.'), 'no closing card');
      await wait(steps[k].startsWith('0') && +steps[k].slice(0, 2) <= 2 ? 3500 : 2000); await shot(`presenter/cue-${steps[k]}`);
    }
    metrics.presenter_ready_ms = times;
    await key('ArrowLeft', 'ArrowLeft'); await wait(600); await until(READY, 15000);
    assert((await ev(`document.querySelector('.pr-n').textContent`)).startsWith('07'), 'back did not return to cue 7');
    await key('Home', 'Home'); await wait(600); await until(READY, 20000);
    assert(new URL(await ev('location.href')).searchParams.get('cue') === 'problem', 'address does not keep the cue');
    const log = await ev(`[...document.querySelectorAll('.pr-log tr')].length`);
    await ev(`[...document.querySelectorAll('.pr-bar button')].find((b) => b.textContent === 'Exit').click()`); await wait(1500);
    assert(!new URL(await ev('location.href')).searchParams.has('present'), 'exit kept present=1');
    await size(1440, 900);
    return `${pw}×${ph}, cue ready (ms): ${JSON.stringify(times)}; rehearsal log rows ${log}`;
  });

  await test('22 six regional layers: legend unit, 16-row table, region card, snow flags, no zero colours', async () => {
    const units = { t2m: '°C per decade', precip: 'mm/month per decade', soilm_root: 'mm per decade', soilm_surface: 'mm per decade', evap: 'mm/month per decade', swe: 'mm per decade' };
    const seen = [];
    for (const [id, unit] of Object.entries(units)) {
      await go(`?region=maule&layer=${id}`); await until(`document.querySelector('.im-left select:nth-of-type(1)') && [...document.querySelectorAll('.im-left select')][1].value === '${id}' && /Loading/.test(document.querySelector('.im-left').textContent) === false`, 20000);
      const leg = await ev(`document.querySelector('.im-legend').textContent`);
      assert(leg.includes(unit), `${id}: legend without unit ${unit}: ${leg.slice(0, 80)}`);
      assert(/regional mean/.test(leg) && /never zero/.test(leg), `${id}: legend note missing`);
      if (id !== 't2m' && id !== 'precip') assert(/land-surface model/.test(leg), `${id}: no model caveat`);
      await until(`[...document.querySelectorAll('.im-right .im-card')].some((c) => /${id === 't2m' ? 'Air temperature' : id === 'precip' ? 'Precipitation' : 'GLDAS'}/.test(c.textContent))`, 10000);
      await click('Trends'); await until(`document.querySelectorAll('.im-right tbody tr').length === 16`, 10000);
      const flagged = await ev(`[...document.querySelectorAll('.im-right tbody tr')].filter((r) => r.textContent.includes('*')).length`);
      if (id === 'swe') assert(flagged === 6, `snow: ${flagged} flagged regions instead of 6 (4 negligible + Aysén + Magallanes)`);
      else assert(flagged === 0, `${id}: ${flagged} rows flagged`);
      await click('Explore'); await wait(2500); await shot(`22_${id}`);
      seen.push(id);
    }
    return seen.join(', ');
  });

  // layout: nothing floating covers anything else, at the sizes the report had left unchecked
  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720], [768, 1024], [844, 390], [390, 844]]) {
    await test(`16 layout ${w}×${h}: Antofagasta and a region card`, async () => {
      await size(w, h); await go('?region=antofagasta'); await until(`${TERR} === 'antofagasta' && !!document.querySelector('.im-extremes, .im-panel.im-left.is-expanded')`); await wait(6500);
      const a = await ev(OVERLAPS); await shot(`16_${w}x${h}_antofagasta`);
      await go('?region=maule&layer=t2m'); await until(`document.querySelectorAll('.im-right .im-big').length === 2`).catch(() => undefined); await wait(5000);
      const b = await ev(OVERLAPS); await shot(`16_${w}x${h}_maule`);
      assert(!a.length && !b.length, [...a.map((x) => `territory: ${x}`), ...b.map((x) => `region: ${x}`)].join('; '));
    });
  }
  await size(1440, 900);

  await test('17 no WebGL → Research Lab with a notice, no globe', async () => {
    const { result } = await send('Page.addScriptToEvaluateOnNewDocument', { source: `{ const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (k, ...a) { return /webgl/.test(k) ? null : g.call(this, k, ...a); }; }` });
    try {
      await go('', `!!document.querySelector('#h-region')`);
      assert((await ev(`document.body.textContent`)).includes('cannot show WebGL'), 'no notice');
      assert(!(await ev(`!!document.querySelector('.im-root')`)), 'the globe was mounted without WebGL');
      await shot('17_no_webgl');
    } finally { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: result.identifier }); }
  });

  // free orbit: no assertion beyond "no error"; the captures are for the eye (does anything look like a flat sheet pasted on the planet?)
  await test('18 free orbit around both reliefs (captures for visual review)', async () => {
    const drag = async (dx, dy) => { await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 720, y: 470, button: 'left', buttons: 1, clickCount: 1 });
      for (let i = 1; i <= 10; i++) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 720 + (dx * i) / 10, y: 470 + (dy * i) / 10, button: 'left', buttons: 1 });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 720 + dx, y: 470 + dy, button: 'left', buttons: 0, clickCount: 1 }); await wait(2500); };
    const press = async (label, n) => { for (let i = 0; i < n; i++) await ev(`document.querySelector('[aria-label="${label}"]').click()`); await wait(2500); };
    for (const id of ['antofagasta', 'los-lagos']) {
      await go(`?region=${id}`); await until(ARRIVED(id)); await wait(4000);
      await press('Rotate left', 6); await shot(`18_${id}_from_the_east`);
      await drag(0, -220); await shot(`18_${id}_low_oblique`);
      await drag(0, 420); await shot(`18_${id}_from_above`);
      await press('Rotate right', 9); await drag(0, -200); await shot(`18_${id}_from_the_south_west`);
      await press('Zoom out', 3); await shot(`18_${id}_handover_range`);
      await press('Zoom out', 3); await shot(`18_${id}_cells_on_the_globe`);
    }
  });

  // measurements (this machine, headless Chrome with GPU; reported only)
  await go('?region=antofagasta'); await until(ARRIVED('antofagasta')); await wait(3000);
  const FPS = `new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 3000 ? requestAnimationFrame(f) : r(Math.round(n / 3)); }; requestAnimationFrame(f); })`;
  metrics.fps_idle_territory = await ev(FPS);
  await click('Travel to Los Lagos'); metrics.fps_during_flight = await ev(FPS); await until(ARRIVED('los-lagos'));
  for (let i = 0; i < 4; i++) { await choose('.im-left select', i % 2 ? 'los-lagos' : 'antofagasta'); await until(ARRIVED(i % 2 ? 'los-lagos' : 'antofagasta')); }
  metrics.js_heap_mb_after_6_flights = await ev(`Math.round(performance.memory.usedJSHeapSize / 1048576)`);
  metrics.gpu = await ev(`(() => { const gl = document.createElement('canvas').getContext('webgl2'), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  metrics.user_agent = await ev('navigator.userAgent');
} finally {
  const failed = results.filter((r) => !r.ok);
  writeFileSync(join(out, 'smoke.json'), JSON.stringify({ base, at: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, metrics }, null, 1));
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`); console.log(JSON.stringify(metrics, null, 1));
  ws.close(); chrome.kill();
  try { rmSync(prof, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* the throwaway profile (about 100 MB) stays in the temp folder */ }
  process.exit(failed.length ? 1 : 0);
}

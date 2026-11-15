// Immersive Earth: the planet fills the viewport and every control floats over it.
// All figures shown here are read from the pipeline's published files; none is computed or typed in.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import '@fontsource/anton/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './immersive.css';
import { CELLS_IN, PERIOD_A, PERIOD_B, PERIOD_SWAP, SHOTS, smooth, stateAt, UI_IN } from '../cinematic/timeline';
import { load } from '../data';
import { BASEMAPS } from '../engine/earth';
import { SCENES, stopsFor, type SceneId } from '../engine/terrain';
import { pval, signed, VERDICT_SHORT } from '../format';
import type { SST, Territory } from '../types';
import { EVENTS, mountStage, TOTAL, useStage, type Mode, type PanelState, type Stage } from './stage';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const LAB = '?view=lab';
const dash = (p: string) => p.replace('-', '–');
const MODES: [Mode, string][] = [['explore', 'Explore'], ['trends', 'Trends'], ['compare', 'Compare'], ['methodology', 'Methodology']];
const REGION_NAME: Record<SceneId, string> = { antofagasta: 'Antofagasta', los_lagos: 'Los Lagos' };

function setPanel(side: 'left' | 'right', v: PanelState) {
  const other = side === 'left' ? 'right' : 'left';
  // small screens: one expanded sheet at a time
  if (v === 'expanded' && matchMedia('(max-width: 760px)').matches && useStage.getState()[other] === 'expanded') useStage.setState({ [other]: 'minimized' } as never);
  useStage.setState({ [side]: v } as never);
}

function Panel({ side, index, title, children }: { side: 'left' | 'right'; index: string; title: string; children: ReactNode }) {
  const state = useStage((s) => s[side]);
  const id = `panel-${side}`;
  if (state === 'closed') {
    return <button type="button" className={`im-reopen im-${side} im-ui`} aria-expanded={false} aria-controls={id} onClick={() => setPanel(side, 'expanded')}>{index} _ {title}</button>;
  }
  return (
    <section className={`im-panel im-${side} im-ui is-${state}`} aria-label={title}>
      <header>
        <button type="button" className="im-ptitle" aria-expanded={state === 'expanded'} aria-controls={id}
          onClick={() => setPanel(side, state === 'expanded' ? 'minimized' : 'expanded')}>
          <span className="im-mono">{index} _</span> {title}
        </button>
        <button type="button" className="im-x" aria-label={`Close ${title}`} onClick={() => setPanel(side, 'closed')}>×</button>
      </header>
      <div id={id} className="im-pbody" hidden={state !== 'expanded'}>{children}</div>
    </section>
  );
}

function Legend({ compact = false }: { compact?: boolean }) {
  const scene = useStage((s) => s.scene), D = useStage((s) => s.scale);
  const cfg = SCENES[scene];
  const ticks = Array.from({ length: 7 }, (_, i) => -D + (i * 2 * D) / 6);
  return (
    <div className="im-legend">
      <div className="im-mono im-dim">{scene === 'antofagasta' ? 'Air temperature trend' : 'Root-zone soil moisture trend'} · {cfg.unit}</div>
      <div className="im-ramp" style={{ background: `linear-gradient(to right, ${stopsFor(scene).join(',')})` }} />
      <div className="im-ticks im-mono">{ticks.map((x, i) => <span key={i}>{scene === 'antofagasta' ? signed(Math.round(x * 100) / 100 || 0) : signed(Math.round(x) || 0).replace('.00', '')}</span>)}</div>
      {!compact && <p className="im-note">One coloured footprint = one native cell and one computed trend. Scale fixed across periods. Areas without a cell have no data drawn (never zero).
        {scene === 'antofagasta' && ' Thick outline: coastal cells. Hatched box over the sea: NASA MUR sea-surface temperature, 2003–2025 only.'}</p>}
    </div>
  );
}

function Controls({ stage }: { stage: Stage | null }) {
  const s = useStage();
  const cfg = SCENES[s.scene];
  const per = (cfg.periods as readonly string[]).includes(s.period) ? s.period : cfg.periods[0];
  return (
    <Panel side="left" index="01" title="Territory and layers">
      <label className="im-field"><span className="im-mono im-dim">Territory</span>
        <select value={s.near ? s.scene : 'earth'} onChange={(e) => stage?.flyTo(e.target.value as SceneId | 'earth')}>
          <option value="earth">Whole Earth</option>
          <option value="antofagasta">Antofagasta, Chile</option>
          <option value="los_lagos">Los Lagos, Chile</option>
        </select></label>
      <div className="im-field"><span className="im-mono im-dim">Variable in this territory</span>
        <p className="im-note">{cfg.product}.</p></div>
      <div className="im-field" role="group" aria-label="Statistical period"><span className="im-mono im-dim">Statistical period (trend window)</span>
        <div className="im-seg">{cfg.periods.map((p) =>
          <button key={p} type="button" aria-pressed={p === per} onClick={() => useStage.setState({ period: p })}>{dash(p)}</button>)}</div></div>
      <label className="im-check"><input type="checkbox" checked={s.cells} onChange={(e) => useStage.setState({ cells: e.target.checked })} /> Climate cells</label>
      {s.scene === 'antofagasta' && <label className="im-check"><input type="checkbox" checked={s.sst} onChange={(e) => useStage.setState({ sst: e.target.checked })} /> Ocean SST box (2003–2025)</label>}
      <label className="im-field"><span className="im-mono im-dim">Cell opacity {Math.round(s.opacity * 100)} %</span>
        <input type="range" min={0.2} max={1} step={0.05} value={s.opacity} onChange={(e) => useStage.setState({ opacity: Number(e.target.value) })} /></label>
      <label className="im-field"><span className="im-mono im-dim">Vertical exaggeration</span>
        <select value={s.exag} onChange={(e) => useStage.setState({ exag: Number(e.target.value) })}>
          {[1, 1.5, 2, 3].map((x) => <option key={x} value={x}>{x}×{x === 1 ? ' (true scale)' : ''}</option>)}</select></label>
      <Legend />
      {!s.near && <p className="im-note im-warn">Layers are drawn on the regional terrain. Zoom in or choose a territory.</p>}
    </Panel>
  );
}

type T4 = Territory['antofagasta']['t4'][number];
const Row = ({ label, t }: { label: string; t: T4['coastal'] }) => (
  <tr><th scope="row">{label}</th><td><b>{signed(t.slope_per_decade)}</b></td><td>{signed(t.ci_low)} to {signed(t.ci_high)}</td><td>{pval(t.p_value)}</td></tr>
);

function Evidence({ terr, sst, stage }: { terr: Territory | null; sst: SST | null; stage: Stage | null }) {
  const s = useStage();
  const cfg = SCENES[s.scene];
  const per = (cfg.periods as readonly string[]).includes(s.period) ? s.period : cfg.periods[0];
  const t4 = s.scene === 'antofagasta' ? terr?.antofagasta.t4 : undefined;
  const row = t4?.find((r) => r.period === dash(per));
  const mur = sst?.series.mur_sst?.trend;
  const title = { explore: 'Explore', trends: 'Trends', compare: 'Compare', methodology: 'Methodology' }[s.mode];
  return (
    <Panel side="right" index="02" title={title}>
      {s.mode === 'explore' && (s.near ? <>
        <h3 className="im-h">{REGION_NAME[s.scene]}</h3>
        <p className="im-note">{cfg.product}. Period {dash(per)}.</p>
        <p>Point at a cell to read its trend, 95 % interval and p-value. Click to keep it outlined. Drag to orbit, Shift-drag to move, wheel or pinch to zoom.</p>
        {s.selected != null && <p className="im-mono">Selected cell outlined in cyan. Its values appear when you point at it.</p>}
      </> : <>
        <h3 className="im-h">The planet is the interface</h3>
        <p>Drag to turn the Earth, zoom in on Chile, or fly straight to a study region. The regional terrain and its NASA cells appear as you approach.</p>
        <div className="im-seg">
          <button type="button" onClick={() => stage?.flyTo('antofagasta')}>Fly to Antofagasta</button>
          <button type="button" onClick={() => stage?.flyTo('los_lagos')}>Fly to Los Lagos</button>
        </div>
      </>)}
      {s.mode === 'trends' && (row ? <>
        <h3 className="im-h">Antofagasta, {row.period}</h3>
        <table className="im-table"><thead><tr><th>Group</th><th>°C per decade</th><th>95 % interval</th><th>p</th></tr></thead>
          <tbody><Row label="Coastal cells" t={row.coastal} /><Row label="Interior cells" t={row.interior} /></tbody></table>
        <p className="im-note">Area-weighted groups of native MERRA-2 cells; exploratory. A trend that is not significant is not evidence of stability.</p>
      </> : <p>{s.scene === 'los_lagos' ? 'Los Lagos: point at a cell on the terrain to read its GLDAS soil-moisture trend (2000–2024). Regional results are in the Research Lab.' : 'Results not loaded.'}</p>)}
      {s.mode === 'compare' && (t4 ? <>
        <h3 className="im-h">Coast minus interior</h3>
        <table className="im-table"><thead><tr><th>Period</th><th>Difference</th><th>95 % interval</th><th>p</th></tr></thead>
          <tbody>{t4.map((r) => <Row key={r.period} label={r.period} t={r.difference} />)}</tbody></table>
        <p className="im-note">Direct test of the difference series, °C per decade. The contrast depends on the period.
          {mur && ` Coastal ocean (NASA MUR SST, 2003–2025): ${signed(mur.slope_per_decade)} °C per decade, ${pval(mur.p_value)}; its interval includes zero.`} No cause is claimed.</p>
      </> : <p>Comparisons between territories and variables are in the Research Lab.</p>)}
      {s.mode === 'methodology' && <>
        <h3 className="im-h">Sources and limits</h3>
        <ul className="im-list">
          <li>MERRA-2 is a reanalysis and GLDAS a land-surface model: not direct satellite observations. MUR SST is a satellite-based blended analysis.</li>
          <li>Trends are computed by the open Python pipeline, never in the browser. Periods are statistical windows, not animation frames.</li>
          <li>The 2 km terrain does not make the climate cells finer. Relief exaggerated {s.exag}× for legibility; the ocean is drawn flat.</li>
          <li>Basemap (context only): {s.basemap ? BASEMAPS[s.basemap] : 'loading'}. Sun position fixed at 2025-06-21 20:30 UTC.</li>
          {s.sources.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </>}
      <a className="im-cta" href={s.scene === 'antofagasta' ? `${LAB}&q=coast` : LAB}>View scientific evidence ↗</a>
    </Panel>
  );
}

/** The real statistical windows on a year axis. It selects a computed result; it does not animate dates. */
function Dock() {
  const scene = useStage((s) => s.scene), period = useStage((s) => s.period);
  const cfg = SCENES[scene];
  const per = (cfg.periods as readonly string[]).includes(period) ? period : cfg.periods[0];
  const y0 = 1980, y1 = 2025;
  return (
    <div className="im-dock im-ui" role="group" aria-label="Statistical period">
      <span className="im-mono im-dim">{y0}</span>
      <div className="im-axis">{cfg.periods.map((p, i) => {
        const [a, b] = p.split('-').map(Number);
        return <button key={p} type="button" aria-pressed={p === per} style={{ left: `${((a - y0) / (y1 - y0)) * 100}%`, width: `${((b - a) / (y1 - y0)) * 100}%`, top: `${i * 12}px` }}
          onClick={() => useStage.setState({ period: p })} title={`Trend window ${dash(p)}`}><span className="im-mono">{dash(p)}</span></button>;
      })}</div>
      <span className="im-mono im-dim">{y1}</span>
    </div>
  );
}

function Words({ text, t, t0, t1 }: { text: string; t: number; t0: number; t1: number }) {
  return <>{text.split(' ').map((w, i) => {
    const a = smooth(t0 + i * 0.08, t0 + i * 0.08 + 0.55, t), k = a * (1 - smooth(t1 + i * 0.03, t1 + i * 0.03 + 0.4, t));
    return <span key={i} style={{ opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - a) * 0.3}em)` }}>{w}&nbsp;</span>;
  })}</>;
}

function Film({ terr }: { terr: Territory | null }) {
  const t = useStage((s) => s.t), basemap = useStage((s) => s.basemap);
  const fs = stateAt(t), sh = fs.shot;
  const row = terr?.antofagasta.t4.find((r) => r.period === dash(fs.period));
  const sub = {
    1: `Basemap: ${basemap === 'bundled' ? 'Natural Earth II' : 'NASA Blue Marble'} — a context image, not a measurement of change.`,
    2: 'Regional outlines: geoBoundaries ADM1. The cyan outline is the study region.',
    3: 'Pacific Ocean · Coastal Range · Atacama Desert · Andes. Relief exaggerated 2×.',
    4: 'MERRA-2 is a reanalysis: a model constrained by observations. 2-m air temperature trend per native cell, 1980–2025.',
    5: '', 6: '',
  }[sh.n];
  const inn = sh.t0 + 0.35, out = sh.t1 - 0.75;
  const chips = sh.n === 5 ? smooth(19.6, 20.3, t) * fs.cellFade * (1 - smooth(24.4, 24.9, t)) : 0;
  const legend = smooth(CELLS_IN[0], CELLS_IN[0] + 0.8, t) * (1 - smooth(UI_IN[0], UI_IN[0] + 1, t));
  return (
    <div className="im-film" aria-hidden="true">
      {sh.line && <div className="im-caption">
        <div className="im-mono im-eyebrow" style={{ opacity: smooth(inn, inn + 0.5, t) * (1 - smooth(out, out + 0.4, t)) }}>0{sh.n} _ {sh.title.toUpperCase()}</div>
        <div className="im-display"><Words text={sh.line} t={t} t0={inn} t1={out} /></div>
        {sub && <div className="im-sub" style={{ opacity: smooth(inn + 0.7, inn + 1.3, t) * (1 - smooth(out, out + 0.4, t)) }}>{sub}</div>}
      </div>}
      {row && <div className="im-chips" style={{ opacity: chips }}>
        <div className="im-period im-mono">{row.period}</div>
        <div><span className="im-mono">COAST</span><b>{signed(row.coastal.slope_per_decade)}</b></div>
        <div><span className="im-mono">INTERIOR</span><b>{signed(row.interior.slope_per_decade)}</b></div>
        <div className="im-mono im-chipnote">°C per decade · MERRA-2 · difference {signed(row.difference.slope_per_decade)}: {VERDICT_SHORT[row.difference.verdict].toLowerCase()}</div>
      </div>}
      <div className="im-filmlegend" style={{ opacity: legend }}><Legend compact /></div>
      <div className="im-title" style={{ opacity: fs.title, filter: `blur(${(1 - fs.title) * 14}px)` }}>
        <div className="im-display">Trend Detective Lab</div>
        <div className="im-sub">Explore Earth. Understand Change.</div>
        <div className="im-mono im-credits">Built by ProGarLabs · Using NASA Earth science data · Developed for NASA Space Apps Challenge 2026</div>
      </div>
      <div className="im-folio im-mono" style={{ opacity: 1 - fs.ui }}><span>// ProGarLabs</span><span>{sh.n < 4 ? 'Trend Detective Lab' : `MERRA-2 · ${t < PERIOD_SWAP ? dash(PERIOD_A) : dash(PERIOD_B)}`}</span><span>0{sh.n} / 0{SHOTS.length}</span></div>
    </div>
  );
}

export default function Immersive() {
  const root = useRef<HTMLDivElement>(null), globe = useRef<HTMLDivElement>(null), terrain = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLDivElement>(null), labels = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [terr, setTerr] = useState<Territory | null>(null);
  const [sst, setSst] = useState<SST | null>(null);
  const s = useStage();

  useEffect(() => {
    load<Territory>('territory.json').then(setTerr, () => undefined);
    load<SST>('sst.json').then((d) => { setSst(d); useStage.setState({ sstSlope: d?.series.mur_sst?.trend.slope_per_decade }); }, () => undefined);
  }, []);

  useEffect(() => {
    let dead = false, st: Stage | null = null, done: () => void = () => undefined;
    const w = window as unknown as Record<string, unknown>;
    w.TOTAL = TOTAL; w.EVENTS = EVENTS;                      // page contract of the render script
    w.ready = new Promise<void>((r) => { done = r; });
    mountStage({ root: root.current!, globe: globe.current!, terrain: terrain.current!, input: input.current!, labels: labels.current! }, CAPTURE)
      .then(async (x) => {
        if (dead) { x.dispose(); return; }
        st = x; setStage(x);
        w.renderAt = (t: number) => x.renderAt(t, flushSync);
        if (Q.has('t')) await x.renderAt(Number(Q.get('t')), flushSync);
        else if (Q.get('mode') === 'cinematic' && !CAPTURE && !matchMedia('(prefers-reduced-motion: reduce)').matches) await x.play();
        done();
      })
      .catch((e) => useStage.setState({ status: 'error', error: String(e) }));
    return () => { dead = true; st?.dispose(); };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useStage.getState().film) stage?.stop(); else useStage.setState({ hideUi: false });
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [stage]);

  return (
    <div ref={root} className={`im-root${s.film ? ' is-film' : ''}`}>
      <div ref={globe} className="im-globe" />
      <div ref={terrain} className="im-terrain" />
      <div ref={input} className="im-input" aria-label="Earth view. Drag to turn, scroll to zoom." role="application" />
      <PlaceLabels ref={labels} />
      {s.tip && !s.film && <div className="im-tip" style={{ left: s.tip.x + 14, top: s.tip.y + 14 }} dangerouslySetInnerHTML={{ __html: s.tip.html }} />}

      {s.status !== 'ready' && <div className="im-status im-mono" role="status">{s.status === 'error' ? <>Could not start the 3D view ({s.error}). <a href={LAB}>Open the Research Lab</a></> : 'Loading Earth…'}</div>}
      {s.film && <Film terr={terr} />}
      {s.film && !CAPTURE && <button type="button" className="im-skip im-mono" onClick={() => stage?.stop()}>Skip intro (Esc)</button>}
      {s.hideUi && !s.film && <button type="button" className="im-skip im-mono" onClick={() => useStage.setState({ hideUi: false })}>Exit immersive mode (Esc)</button>}

      <header className="im-top im-ui">
        <a className="im-brand" href="./" aria-label="Trend Detective Lab, home">
          <img src={`${import.meta.env.BASE_URL}img/progarlabs-isotipo.svg`} alt="" width={30} height={30} />
          <span><strong>Trend Detective Lab</strong><em className="im-mono">Built by ProGarLabs</em></span>
        </a>
        <nav aria-label="Modes">{MODES.map(([m, l]) =>
          <button key={m} type="button" aria-pressed={s.mode === m} onClick={() => { useStage.setState({ mode: m }); setPanel('right', 'expanded'); }}>{l}</button>)}</nav>
        <div className="im-actions">
          <button type="button" onClick={() => stage?.play()}>Play intro</button>
          <button type="button" onClick={() => useStage.setState({ hideUi: true })}>Immersive mode</button>
          <a href={LAB}>Research Lab ↗</a>
        </div>
      </header>
      <Controls stage={stage} />
      <Evidence terr={terr} sst={sst} stage={stage} />
      <div className="im-cam im-ui" role="group" aria-label="Camera">
        <button type="button" aria-label="Zoom in" onClick={() => stage?.nudge('in')}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => stage?.nudge('out')}>−</button>
        <button type="button" aria-label="Rotate left" onClick={() => stage?.nudge('left')}>⟲</button>
        <button type="button" aria-label="Rotate right" onClick={() => stage?.nudge('right')}>⟳</button>
        <button type="button" aria-label="Whole Earth" onClick={() => stage?.flyTo('earth')}>◯</button>
      </div>
      <Dock />
      <footer className="im-foot im-ui im-mono">
        <span>// ProGarLabs · Using NASA Earth science data · Developed for NASA Space Apps Challenge 2026</span>
        <span>Independent project: not affiliated with or endorsed by NASA</span>
      </footer>
    </div>
  );
}

function PlaceLabels({ ref }: { ref: React.RefObject<HTMLDivElement | null> }) {
  const names = useStage((s) => s.places);
  return <div ref={ref} className="im-labels" aria-hidden="true">{names.map((n) => <span key={n}>{n}</span>)}</div>;
}

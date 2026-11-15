// Immersive Earth: the planet fills the viewport and every control floats over it.
// All figures shown here are read from the pipeline's published files; none is computed or typed in
// (the only arithmetic is picking the largest and smallest of the published per-cell trends).
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import '@fontsource/anton/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import './immersive.css';
import { CELLS_IN, CHART, PERIOD_A, PERIOD_B, PERIOD_SWAP, SHOTS, smooth, stateAt, UI_IN } from '../cinematic/timeline';
import { load } from '../data';
import { BASEMAPS } from '../engine/earth';
import { BRBG, ramp, RDBU, SCENES, stopsFor, type SceneId } from '../engine/terrain';
import { num, pval, signed, VERDICT_SHORT } from '../format';
import type { Catalog, SST, Territory, VariableData } from '../types';
import { sound } from './sound';
import { EVENTS, mountStage, REGION_OF, TOTAL, useStage, type Atlas, type Layer, type Mode, type PanelState, type Stage } from './stage';
import { STUDIES, type Study } from './studies';

const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
const LAB = '?view=lab';
const dash = (p: string) => p.replace('-', '–');
const MODES: [Mode, string][] = [['explore', 'Explore'], ['trends', 'Trends'], ['compare', 'Compare'], ['methodology', 'Methodology']];
const REGION_NAME: Record<SceneId, string> = { antofagasta: 'Antofagasta', los_lagos: 'Los Lagos' };
// the two flags of the whole-Earth view: the territories that have a relief scene (pins on Antofagasta city and Puerto Montt)
const FLAGS: { id: SceneId; label: string; lon: number; lat: number }[] = [
  { id: 'antofagasta', label: 'Antofagasta, Chile', lon: -70.4, lat: -23.65 },
  { id: 'los_lagos', label: 'Los Lagos, Chile', lon: -72.94, lat: -41.47 },
];
const REGIONAL: Record<Exclude<Layer, 'cells'>, { file: string; label: string; stops: string[]; short: string }> = {
  t2m: { file: 't2m.json', label: 'Air temperature trend, regional mean', stops: RDBU, short: 'Air temperature' },
  precip: { file: 'precip.json', label: 'Precipitation trend, regional mean', stops: BRBG, short: 'Precipitation' },
};
type Regional = Partial<Record<Exclude<Layer, 'cells'>, VariableData | null>>;
/** symmetric colour domain of a regional layer: the largest published |trend|, rounded up to one significant step */
const domainOf = (d: VariableData) => {
  const m = Math.max(...Object.values(d.regions).map((r) => Math.abs(r.trend.slope_per_decade)));
  const step = 10 ** Math.floor(Math.log10(m));
  return Math.ceil(m / step) * step;
};

function setPanel(side: 'left' | 'right', v: PanelState) {
  const other = side === 'left' ? 'right' : 'left';
  // small screens: one expanded sheet at a time
  if (v === 'expanded' && matchMedia('(max-width: 760px)').matches && useStage.getState()[other] === 'expanded') useStage.setState({ [other]: 'minimized' } as never);
  useStage.setState({ [side]: v } as never);
  sound.cue('panel');
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

function Legend({ compact = false, regional, cat }: { compact?: boolean; regional?: Regional; cat?: Catalog | null }) {
  const scene = useStage((s) => s.scene), D0 = useStage((s) => s.scale), layer = useStage((s) => s.layer);
  const cfg = SCENES[scene];
  const reg = !compact && layer !== 'cells' ? regional?.[layer] : null;
  const D = reg ? domainOf(reg) : D0, stops = reg && layer !== 'cells' ? REGIONAL[layer].stops : stopsFor(scene);
  const unit = reg ? cat?.variables.find((v) => v.id === layer)?.trend_unit ?? '' : cfg.unit;
  const ticks = Array.from({ length: 7 }, (_, i) => -D + (i * 2 * D) / 6);
  return (
    <div className="im-legend">
      <div className="im-mono im-dim">{reg && layer !== 'cells' ? REGIONAL[layer].label : scene === 'antofagasta' ? 'Air temperature trend' : 'Root-zone soil moisture trend'} · {unit}</div>
      <div className="im-ramp" style={{ background: `linear-gradient(to right, ${stops.join(',')})` }} />
      <div className="im-ticks im-mono">{ticks.map((x, i) => <span key={i}>{D >= 10 ? signed(Math.round(x) || 0).replace('.00', '') : signed(Math.round(x * 100) / 100 || 0)}</span>)}</div>
      {!compact && (reg
        ? <p className="im-note">One colour = one region's mean trend over its whole record. Colour shows the size of the trend, not whether it is significant: see the table in Trends. Regions without a value are left uncoloured (never zero).</p>
        : <p className="im-note">One coloured footprint = one native cell and one computed trend, drawn only over the region's land; the value is still that of the whole native cell. Scale fixed across periods. No cell, no colour (never zero).
          {scene === 'antofagasta' && ' Dark outline: coastal cells. White-outlined area over the sea: NASA MUR sea-surface temperature, one value for the box, 2003–2025 only.'}</p>)}
    </div>
  );
}

function Controls({ stage, cat, regional }: { stage: Stage | null; cat: Catalog | null; regional: Regional }) {
  const s = useStage();
  const cfg = SCENES[s.scene];
  const per = (cfg.periods as readonly string[]).includes(s.period) ? s.period : cfg.periods[0];
  const here = s.region ?? (s.near ? REGION_OF[s.scene] : 'earth');
  return (
    <Panel side="left" index="01" title="Territory and layers">
      <label className="im-field"><span className="im-mono im-dim">Territory</span>
        <select value={here} onChange={(e) => { sound.cue('fly'); stage?.flyTo(e.target.value); }}>
          <option value="earth">Whole Earth</option>
          <optgroup label="Regions of Chile, north to south">
            {(cat?.regions ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}{Object.values(REGION_OF).includes(r.id) ? ' — 3D relief' : ''}</option>)}
          </optgroup>
        </select></label>
      <label className="im-field"><span className="im-mono im-dim">Data on the globe</span>
        <select value={s.layer} onChange={(e) => { sound.cue('layer'); useStage.setState({ layer: e.target.value as Layer, selected: null, picked: null }); }}>
          <option value="cells">Native cells — the two study territories</option>
          <option value="t2m">Regional trend — air temperature, 16 regions</option>
          <option value="precip">Regional trend — precipitation, 16 regions</option>
        </select></label>
      {s.layer === 'cells' ? <>
        <div className="im-field"><span className="im-mono im-dim">Variable in {REGION_NAME[s.scene]}</span>
          <p className="im-note">{cfg.product}.</p></div>
        <label className="im-check"><input type="checkbox" checked={s.cells} onChange={(e) => { sound.cue('layer'); useStage.setState({ cells: e.target.checked }); }} /> Climate cells</label>
        {s.scene === 'antofagasta' && <label className="im-check"><input type="checkbox" checked={s.sst} onChange={(e) => { sound.cue('layer'); useStage.setState({ sst: e.target.checked }); }} /> Ocean SST box (2003–2025)</label>}
        <label className="im-check"><input type="checkbox" checked={s.terrainOn} onChange={(e) => { sound.cue('terrain'); useStage.setState({ terrainOn: e.target.checked }); }} /> 3D relief up close (scientific terrain)</label>
        <label className="im-field"><span className="im-mono im-dim">Cell opacity {Math.round(s.opacity * 100)} %</span>
          <input type="range" min={0.2} max={1} step={0.05} value={s.opacity} onChange={(e) => useStage.setState({ opacity: Number(e.target.value) })} /></label>
        {s.terrainOn && <label className="im-field"><span className="im-mono im-dim">Vertical exaggeration of the relief</span>
          <select value={s.exag} onChange={(e) => useStage.setState({ exag: Number(e.target.value) })}>
            {[1, 1.5, 2, 3].map((x) => <option key={x} value={x}>{x}×{x === 1 ? ' (true scale)' : ''}</option>)}</select></label>}
      </> : <div className="im-field"><span className="im-mono im-dim">Product</span>
        <p className="im-note">{cat?.variables.find((v) => v.id === s.layer)?.product ?? ''}, {cat?.variables.find((v) => v.id === s.layer)?.period.join('–')}. {regional[s.layer] === undefined ? 'Loading…' : regional[s.layer] === null ? 'Not available.' : regional[s.layer]?.SYNTHETIC ? 'SYNTHETIC DEMO DATA — not NASA observations.' : ''}</p></div>}
      <Legend regional={regional} cat={cat} />
      <p className="im-note im-mono">Window: {dash(per)}</p>
    </Panel>
  );
}

type T4 = Territory['antofagasta']['t4'][number];
const Row = ({ label, t }: { label: string; t: T4['coastal'] }) => (
  <tr><th scope="row">{label}</th><td><b>{signed(t.slope_per_decade)}</b></td><td>{signed(t.ci_low)} to {signed(t.ci_high)}</td><td>{pval(t.p_value)}</td></tr>
);

/** What the published regional files say about one region. */
function RegionCard({ id, cat, regional, stage }: { id: string; cat: Catalog | null; regional: Regional; stage: Stage | null }) {
  const name = useStage((s) => s.regionNames[id]) ?? id;
  const scene = (Object.keys(REGION_OF) as SceneId[]).find((k) => REGION_OF[k] === id);
  return <>
    <h3 className="im-h">{name}</h3>
    {(['t2m', 'precip'] as const).map((v) => {
      const info = cat?.variables.find((x) => x.id === v), d = regional[v], t = d?.regions[id]?.trend;
      return <div key={v} className="im-card">
        <div className="im-mono im-dim">{info?.label ?? v} · {info?.product}</div>
        {d === undefined ? <p className="im-note">Loading…</p> : !t ? <p className="im-note">No result published for this region and product.</p> : <>
          <p className="im-big"><b>{signed(t.slope_per_decade)}</b> <span>{info?.trend_unit}</span></p>
          <p className="im-note">{t.start.slice(0, 4)}–{t.end.slice(0, 4)} · 95 % interval {signed(t.ci_low)} to {signed(t.ci_high)} · {pval(t.p_value)}{t.p_adjusted != null && ` · q = ${t.p_adjusted.toFixed(3)} (16 regions)`}<br />
            {VERDICT_SHORT[t.verdict]}{t.significant_after_fdr ? ', and significant after adjusting for 16 regions' : ''}. Regional mean of native {info?.grid} cells; {info?.nature_label?.toLowerCase()}.
            {d?.SYNTHETIC && <b className="im-warn"> SYNTHETIC DEMO DATA.</b>}</p>
        </>}
      </div>;
    })}
    <div className="im-seg">
      <button type="button" onClick={() => { sound.cue('fly'); stage?.flyTo(id); }}>{scene ? 'Enter the territory' : 'Fly to the region'}</button>
      <button type="button" onClick={() => useStage.setState({ region: null })}>Close</button>
    </div>
    {!scene && <p className="im-note">This region has regional results only. Native-cell maps and 3D relief exist for Antofagasta and Los Lagos.</p>}
  </>;
}

function StudyCard({ st, data, stage, close }: { st: Study; data: { terr: Territory | null; sst: SST | null; precip: VariableData | null }; stage: Stage | null; close: () => void }) {
  const result = st.result(data);
  return <>
    <div className="im-mono im-dim">{st.kind} · {st.place}</div>
    <h3 className="im-h">{st.title}</h3>
    {st.image && <figure className="im-fig"><img src={`${import.meta.env.BASE_URL}${st.image.src}`} alt={st.image.alt} loading="lazy" /><figcaption className="im-note">{st.image.credit}</figcaption></figure>}
    <p><b>{st.question}</b></p>
    {result && <p>{result}</p>}
    <p className="im-note">{st.product} · {st.period}.<br />{st.limit}</p>
    <div className="im-seg">
      <button type="button" onClick={() => { sound.cue('fly'); stage?.flyTo(st.fly); }}>Go to the study area</button>
      <button type="button" onClick={close}>Close</button>
    </div>
    <a className="im-cta" href={st.lab}>Read the full study ↗</a>
  </>;
}

function Evidence({ terr, sst, stage, cat, regional, study, setStudy }: { terr: Territory | null; sst: SST | null; stage: Stage | null; cat: Catalog | null; regional: Regional; study: Study | null; setStudy: (s: Study | null) => void }) {
  const s = useStage();
  const cfg = SCENES[s.scene];
  const per = (cfg.periods as readonly string[]).includes(s.period) ? s.period : cfg.periods[0];
  const t4 = s.scene === 'antofagasta' ? terr?.antofagasta.t4 : undefined;
  const row = t4?.find((r) => r.period === dash(per));
  const mur = sst?.series.mur_sst?.trend;
  const title = { explore: 'Explore', trends: 'Trends', compare: 'Compare', methodology: 'Methodology' }[s.mode];
  const reg = s.layer !== 'cells' ? regional[s.layer] : null, info = cat?.variables.find((v) => v.id === s.layer);
  const sceneRegion = s.region && Object.values(REGION_OF).includes(s.region);
  return (
    <Panel side="right" index="02" title={study ? 'Study' : title}>
      {study ? <StudyCard st={study} data={{ terr, sst, precip: regional.precip ?? null }} stage={stage} close={() => setStudy(null)} />
        : <>
          {s.mode === 'explore' && (s.picked ? <>
            <div className="im-mono im-dim">Selected cell · outlined in cyan</div>
            <h3 className="im-h">{s.picked.title}</h3>
            <p className="im-big"><b>{s.picked.lines[0].split(' ')[0]}</b> <span>{s.picked.lines[0].split(' ').slice(1).join(' ')}</span></p>
            {s.picked.lines.slice(1).map((l) => <p key={l} className="im-note">{l}</p>)}
            <p className="im-note">{cfg.product}. The value is the trend of the whole native cell, also where only part of it is drawn.</p>
            <div className="im-seg"><button type="button" onClick={() => useStage.setState({ selected: null, picked: null })}>Close cell</button></div>
          </> : s.region && !(s.near && sceneRegion) ? <RegionCard id={s.region} cat={cat} regional={regional} stage={stage} />
            : s.near ? <>
              <h3 className="im-h">{REGION_NAME[s.scene]}</h3>
              <p className="im-note">{cfg.product}. Period {dash(per)}.</p>
              <p>Point at a cell to read its trend, 95 % interval and p-value; click or tap to keep it. Drag to orbit, Shift-drag to move, wheel or pinch to zoom.</p>
              <div className="im-seg">
                <button type="button" onClick={() => { sound.cue('fly'); stage?.flyTo(s.scene === 'antofagasta' ? 'los_lagos' : 'antofagasta'); }}>Travel to {REGION_NAME[s.scene === 'antofagasta' ? 'los_lagos' : 'antofagasta']}</button>
                <button type="button" onClick={() => { sound.cue('fly'); stage?.flyTo('earth'); }}>Whole Earth</button>
              </div>
            </> : <>
              <h3 className="im-h">The planet is the interface</h3>
              <p>Drag to turn the Earth and zoom in on Chile. Pick a flag, click any of the 16 regions, or start with a guided case.</p>
              <button type="button" className="im-guide" onClick={() => { sound.cue('fly'); useStage.setState({ layer: 'cells', cells: true, period: '1980-2025', mode: 'explore' }); stage?.flyTo('antofagasta'); setStudy(STUDIES[0]); }}>
                <span className="im-mono">Guided case</span>Investigate a changing coastline →</button>
            </>)}
          {s.mode === 'trends' && (reg && s.layer !== 'cells' ? <>
            <h3 className="im-h">{REGIONAL[s.layer].short}, 16 regions</h3>
            <table className="im-table im-tight"><thead><tr><th>Region</th><th>{info?.trend_unit}</th><th>p</th><th>q</th><th /></tr></thead>
              <tbody>{(cat?.regions ?? []).map((r) => { const t = reg.regions[r.id]?.trend; return (
                <tr key={r.id} className={s.region === r.id ? 'is-on' : ''}><th scope="row"><button type="button" className="im-link" onClick={() => useStage.setState({ region: r.id, mode: 'explore' })}>{r.name}</button></th>
                  {t ? <><td><b>{signed(t.slope_per_decade)}</b></td><td>{t.p_value < 0.001 ? '<0.001' : t.p_value.toFixed(3)}</td><td>{t.p_adjusted != null ? t.p_adjusted.toFixed(3) : '—'}</td><td>{t.significant_after_fdr ? '●' : t.p_value < 0.05 ? '○' : ''}</td></> : <td colSpan={4}>no result</td>}</tr>); })}</tbody></table>
            <p className="im-note">{info?.product}, {info?.period.join('–')}. p: this region alone; q: adjusted for 16 regions (false discovery rate). ● significant after adjustment, ○ only before. A trend that is not significant is not evidence of stability.</p>
          </> : row ? <>
            <h3 className="im-h">Antofagasta, {row.period}</h3>
            <table className="im-table"><thead><tr><th>Group</th><th>°C per decade</th><th>95 % interval</th><th>p</th></tr></thead>
              <tbody><Row label="Coastal cells" t={row.coastal} /><Row label="Interior cells" t={row.interior} /></tbody></table>
            <p className="im-note">Area-weighted groups of native MERRA-2 cells; exploratory. A trend that is not significant is not evidence of stability. For all 16 regions choose a regional layer in "Data on the globe".</p>
          </> : <p>{s.scene === 'los_lagos' ? 'Los Lagos: point at a cell to read its GLDAS soil-moisture trend (2000–2024). For all 16 regions choose a regional layer in "Data on the globe".' : 'Results not loaded.'}</p>)}
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
              <li>MERRA-2 is a reanalysis and GLDAS a land-surface model: not direct satellite observations. MUR SST is a satellite-based blended analysis; IMERG merges satellite estimates with gauges.</li>
              <li>Trends are computed by the open Python pipeline, never in the browser. Periods are statistical windows, not animation frames.</li>
              <li>Cells are drawn only over the region's land (native footprint ∩ region boundary). The clipping is cartographic: each value is still the trend of the whole native cell.</li>
              <li>"Highest" and "lowest" are the largest and smallest per-cell trends of the period shown — not observed maxima or records.</li>
              <li>The 2 km relief does not make the climate cells finer. Relief exaggerated {s.exag}× for legibility.</li>
              <li>Basemap (context only): {s.basemap ? BASEMAPS[s.basemap] : 'loading'}. Sun position fixed at 2025-06-21 20:30 UTC.</li>
              <li>Interface sounds are synthesised in the browser; no audio file is shipped.</li>
              {s.sources.map((x) => <li key={x}>{x}</li>)}
            </ul>
          </>}
          <a className="im-cta" href={s.scene === 'antofagasta' ? `${LAB}&q=coast` : LAB}>View scientific evidence ↗</a>
        </>}
    </Panel>
  );
}

/** Highest and lowest per-cell trend of the territory on screen: shown without any click. */
function Extremes() {
  const s = useStage();
  const e = s.extremes;
  if (!e || !s.near || s.layer !== 'cells' || !s.cells || e.scene !== s.scene) return null;
  const cfg = SCENES[e.scene], product = e.scene === 'antofagasta' ? 'MERRA-2' : 'GLDAS-2.1';
  const item = (label: string, x: typeof e.max) => (
    <div><span className="im-mono im-dim">{label}</span><b>{signed(x.slope)}</b>
      <span className="im-mono im-dim">cell {num(x.lat)}°, {num(x.lon)}° · {pval(x.p)}</span></div>);
  return (
    <aside className="im-extremes im-ui" aria-label="Highest and lowest cell trend">
      {item('Highest cell trend', e.max)}{item('Lowest cell trend', e.min)}
      <p className="im-mono im-dim">{cfg.unit} · {product} · {dash(e.period)} · trends, not observed extremes</p>
    </aside>
  );
}

/** The computed statistical windows. It selects a published result; it is not a time slider and animates nothing. */
function Dock() {
  const scene = useStage((s) => s.scene), period = useStage((s) => s.period), layer = useStage((s) => s.layer);
  const [open, setOpen] = useState(false);
  const cfg = SCENES[scene];
  const per = (cfg.periods as readonly string[]).includes(period) ? period : cfg.periods[0];
  if (layer !== 'cells') return null;
  return (
    <div className={`im-dock im-ui${open ? ' is-open' : ''}`} role="group" aria-label="Statistical window">
      <span className="im-mono im-dim">Statistical window</span>
      {cfg.periods.map((p) => <button key={p} type="button" aria-pressed={p === per}
        onClick={() => { if (p === per && cfg.periods.length > 1) { setOpen(!open); return; } sound.cue('period'); useStage.setState({ period: p }); setOpen(false); }}>{dash(p)}</button>)}
    </div>
  );
}

function Words({ text, t, t0, t1 }: { text: string; t: number; t0: number; t1: number }) {
  return <>{text.split(' ').map((w, i) => {
    const a = smooth(t0 + i * 0.08, t0 + i * 0.08 + 0.55, t), k = a * (1 - smooth(t1 + i * 0.03, t1 + i * 0.03 + 0.4, t));
    return <span key={i} style={{ opacity: k, filter: `blur(${(1 - k) * 12}px)`, transform: `translateY(${(1 - a) * 0.3}em)` }}>{w}&nbsp;</span>;
  })}</>;
}

/** The yearly values behind the trends, drawn year by year. Every point is a published value; nothing is interpolated between years. */
function FilmChart({ t, series }: { t: number; series: Atlas['series']['antofagasta'] }) {
  const { years, coastal, interior } = series;
  const op = smooth(CHART.in, CHART.in + 0.6, t) * (1 - smooth(CHART.out, CHART.out + 0.5, t));
  if (op <= 0) return null;
  const n = years.length, shown = Math.max(1, Math.min(n, Math.floor(((t - CHART.draw[0]) / (CHART.draw[1] - CHART.draw[0])) * (n - 1)) + 1));
  const all = [...coastal, ...interior], lo = Math.floor(Math.min(...all) * 2) / 2, hi = Math.ceil(Math.max(...all) * 2) / 2;
  const X = (i: number) => 8 + (i / (n - 1)) * 86, Y = (v: number) => 34 - ((v - lo) / (hi - lo)) * 26;
  const line = (vs: number[]) => vs.slice(0, shown).map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(2)} ${Y(v).toFixed(2)}`).join('');
  const i2003 = years.indexOf(2003), recent = smooth(PERIOD_SWAP - 0.3, PERIOD_SWAP + 0.3, t), last = shown - 1;
  return (
    <div className="im-chart" style={{ opacity: op }}>
      <div className="im-mono im-charthead"><span>Yearly anomaly · °C · MERRA-2 2-m air temperature</span><b>{years[last]}</b></div>
      <svg viewBox="0 0 100 40" role="img" aria-label="Yearly temperature anomaly of coastal and interior cells of Antofagasta, 1980 to 2025">
        {i2003 >= 0 && <rect x={X(i2003)} y={8} width={X(n - 1) - X(i2003)} height={26} fill="#EFF6FF" opacity={0.1 * recent} />}
        <line x1={8} x2={94} y1={Y(0)} y2={Y(0)} stroke="#A8BDD0" strokeWidth={0.15} strokeDasharray="0.8 0.8" />
        {[lo, 0, hi].map((v) => <text key={v} x={6.6} y={Y(v) + 0.8} textAnchor="end" className="im-charttick">{signed(v)}</text>)}
        {[0, i2003, n - 1].filter((i) => i >= 0).map((i) => <text key={i} x={X(i)} y={38.4} textAnchor="middle" className="im-charttick">{years[i]}</text>)}
        <path d={line(interior)} fill="none" stroke="#FFB45C" strokeWidth={0.5} strokeLinejoin="round" />
        <path d={line(coastal)} fill="none" stroke="#EFF6FF" strokeWidth={0.5} strokeLinejoin="round" />
        <circle cx={X(last)} cy={Y(interior[last])} r={0.8} fill="#FFB45C" /><circle cx={X(last)} cy={Y(coastal[last])} r={0.8} fill="#EFF6FF" />
        <text x={8} y={5.4} className="im-chartkey" fill="#EFF6FF">— Coast ({series.n_coastal} cells)</text>
        <text x={36} y={5.4} className="im-chartkey" fill="#FFB45C">— Interior ({series.n_interior} cells)</text>
      </svg>
      <div className="im-mono im-chartnote">Each point: yearly mean of monthly anomalies, area-weighted cells. Values per year, not the fitted trend.</div>
    </div>
  );
}

function Film({ terr, atlas }: { terr: Territory | null; atlas: Atlas | null }) {
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
      {atlas && <FilmChart t={t} series={atlas.series.antofagasta} />}
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

/** Georeferenced markers. The stage moves them every frame from data-lon / data-lat (scale range, occlusion, collisions). */
function Markers({ stage, setStudy }: { stage: Stage | null; setStudy: (s: Study | null) => void }) {
  const atlas = useStage((s) => s.atlas), e = useStage((s) => s.extremes), layer = useStage((s) => s.layer), cells = useStage((s) => s.cells);
  const ex = e && layer === 'cells' && cells ? ([['max', '▲', e.max], ['min', '▼', e.min]] as const) : [];
  return <>
    {FLAGS.map((f) => <button key={f.id} type="button" className="im-flag" data-lon={f.lon} data-lat={f.lat} data-min={3000} data-keep="1"
      onClick={() => { sound.cue('fly'); stage?.flyTo(f.id); }}><i aria-hidden="true" /><span className="im-mono">{f.label}</span></button>)}
    {ex.map(([k, sym, x]) => <div key={k} className={`im-ext is-${k}`} data-lon={x.lon} data-lat={x.lat} data-max={3000} data-scene={e!.scene} data-keep="1" aria-hidden="true">
      <i>{sym}</i><span className="im-mono">{signed(x.slope)}</span></div>)}
    {STUDIES.map((st) => <button key={st.id} type="button" className="im-study" data-lon={st.lon} data-lat={st.lat} data-max={7500} data-min={900} title={`${st.kind}: ${st.title}`}
      onClick={() => { sound.cue('select'); setStudy(st); useStage.setState({ mode: 'explore', right: 'expanded' }); }}><i aria-hidden="true" /><span>{st.title}</span></button>)}
    {(atlas?.places ?? []).map((p) => <div key={p.name} className={`im-place is-${p.kind}`} data-lon={p.lon} data-lat={p.lat} data-max={4200} data-scene={p.scene} data-yield="1"
      title={`${p.name} (${p.kind === 'city' ? 'city or town' : 'landmark'})`}><i aria-hidden="true" /><span>{p.name}</span></div>)}
  </>;
}

export default function Immersive() {
  const root = useRef<HTMLDivElement>(null), globe = useRef<HTMLDivElement>(null), terrain = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLDivElement>(null), labels = useRef<HTMLDivElement>(null), markers = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [terr, setTerr] = useState<Territory | null>(null);
  const [sst, setSst] = useState<SST | null>(null);
  const [cat, setCat] = useState<Catalog | null>(null);
  const [regional, setRegional] = useState<Regional>({});
  const [study, setStudy] = useState<Study | null>(null);
  const [snd, setSnd] = useState(sound.enabled());
  const s = useStage();

  useEffect(() => {
    load<Territory>('territory.json').then(setTerr, () => undefined);
    load<Catalog>('catalog.json').then(setCat, () => undefined);
    load<SST>('sst.json').then((d) => { setSst(d); useStage.setState({ sstSlope: d?.series.mur_sst?.trend.slope_per_decade }); }, () => undefined);
  }, []);

  // regional files are fetched only when a region, a regional layer or a study needs them
  const want = s.region || study ? (['t2m', 'precip'] as const) : s.layer !== 'cells' ? [s.layer] : [];
  useEffect(() => {
    for (const v of want) if (!(v in regional)) {
      setRegional((r) => ({ ...r, [v]: undefined }));
      load<VariableData>(REGIONAL[v].file).then((d) => setRegional((r) => ({ ...r, [v]: d })), () => setRegional((r) => ({ ...r, [v]: null })));
    }
  }, [want.join()]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const d = s.layer !== 'cells' ? regional[s.layer] : null;
    if (!stage || !d || s.layer === 'cells') return;
    const D = domainOf(d), stops = REGIONAL[s.layer].stops;
    stage.setRegionFill(s.layer, Object.fromEntries(Object.entries(d.regions).map(([id, r]) => [id, Number.isFinite(r.trend?.slope_per_decade) ? `#${ramp(stops, (r.trend.slope_per_decade / D + 1) / 2).getHexString()}` : null])));
  }, [stage, s.layer, regional]);

  useEffect(() => {
    let dead = false, st: Stage | null = null, done: () => void = () => undefined;
    const w = window as unknown as Record<string, unknown>;
    w.TOTAL = TOTAL; w.EVENTS = EVENTS;                      // page contract of the render script
    w.ready = new Promise<void>((r) => { done = r; });
    mountStage({ root: root.current!, globe: globe.current!, terrain: terrain.current!, input: input.current!, labels: labels.current!, markers: markers.current! }, CAPTURE)
      .then(async (x) => {
        if (dead) { x.dispose(); return; }
        st = x; setStage(x);
        w.renderAt = (t: number) => x.renderAt(t, flushSync);
        if (Q.has('t')) await x.renderAt(Number(Q.get('t')), flushSync);
        else if (Q.get('mode') === 'cinematic' && !CAPTURE && !matchMedia('(prefers-reduced-motion: reduce)').matches) await x.play();
        else if (!CAPTURE) {                                  // shareable state: ?region=<id>&layer=cells|t2m|precip&relief=0
          const layer = Q.get('layer');
          if (layer === 't2m' || layer === 'precip') useStage.setState({ layer });
          if (Q.get('relief') === '0') useStage.setState({ terrainOn: false });
          if (Q.get('region')) x.flyTo(Q.get('region')!);     // also the way back from the Research Lab
        }
        done();
      })
      .catch((e) => useStage.setState({ status: 'error', error: String(e) }));
    return () => { dead = true; st?.dispose(); };
  }, []);

  useEffect(() => {                                           // the address keeps the selected region, so the view can be shared
    if (CAPTURE || !stage) return;
    const u = new URL(location.href);
    if (s.region) u.searchParams.set('region', s.region); else u.searchParams.delete('region');
    history.replaceState(null, '', u);
  }, [stage, s.region]);
  useEffect(() => { if (s.picked) sound.cue('select'); }, [s.picked]);
  useEffect(() => { if (s.near) sound.cue('arrive'); }, [s.near, s.scene]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Escape stops whatever moves the camera, where it is; it never jumps
      if (useStage.getState().film) stage?.stop(); else { stage?.interrupt(); useStage.setState({ hideUi: false }); }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [stage]);

  return (
    <div ref={root} className={`im-root${s.film ? ' is-film' : ''}`}>
      <div ref={globe} className="im-globe" />
      <div ref={terrain} className="im-terrain" />
      <div ref={input} className="im-input" aria-label="Earth view. Drag to turn, scroll to zoom, click a region or a cell to inspect it. Every region is also in the Territory list." role="application" />
      <PlaceLabels ref={labels} />
      <div ref={markers} className="im-markers im-ui"><Markers stage={stage} setStudy={setStudy} /></div>
      {s.tip && !s.film && <div className="im-tip" style={{ left: s.tip.x + 18, top: s.tip.y + 18 }}>{s.tip.lines.map((l, i) => (i ? <div key={l}>{l}</div> : <b key={l}>{l}</b>))}</div>}

      {s.status !== 'ready' && <div className="im-status im-mono" role="status">{s.status === 'error' ? <>Could not start the 3D view ({s.error}). <a href={LAB}>Open the Research Lab</a></> : 'Loading Earth…'}</div>}
      {s.film && <Film terr={terr} atlas={s.atlas} />}
      {s.film && !CAPTURE && <div className="im-skip">
        <button type="button" className="im-mono" onClick={() => stage?.skip()}>Skip intro</button>
        <button type="button" className="im-mono" onClick={() => stage?.stop()}>Stop here (Esc)</button>
      </div>}
      {s.hideUi && !s.film && <div className="im-skip"><button type="button" className="im-mono" onClick={() => useStage.setState({ hideUi: false })}>Exit immersive mode (Esc)</button></div>}

      <header className="im-top im-ui">
        <a className="im-brand" href="./" aria-label="Trend Detective Lab, home">
          <img src={`${import.meta.env.BASE_URL}img/progarlabs-isotipo.svg`} alt="" width={30} height={30} />
          <span><strong>Trend Detective Lab</strong><em className="im-mono">Built by ProGarLabs</em></span>
        </a>
        <nav aria-label="Modes">{MODES.map(([m, l]) =>
          <button key={m} type="button" aria-pressed={s.mode === m} onClick={() => { useStage.setState({ mode: m }); setStudy(null); setPanel('right', 'expanded'); }}>{l}</button>)}</nav>
        <div className="im-actions">
          <button type="button" onClick={() => stage?.play()}>Play intro</button>
          <button type="button" onClick={() => useStage.setState({ hideUi: true })}>Immersive mode</button>
          <button type="button" className="im-snd" aria-pressed={snd} onClick={() => { sound.setEnabled(!snd); setSnd(!snd); }}>Sound {snd ? 'on' : 'off'}</button>
          {snd && <input className="im-vol" type="range" min={0} max={1} step={0.05} defaultValue={sound.volume()} aria-label="Sound volume" onChange={(e) => sound.setVolume(Number(e.target.value))} />}
          <a href={s.region ? `${LAB}&region=${s.region}` : LAB}>Research Lab ↗</a>
        </div>
      </header>
      <Controls stage={stage} cat={cat} regional={regional} />
      <Evidence terr={terr} sst={sst} stage={stage} cat={cat} regional={regional} study={study} setStudy={setStudy} />
      <div className="im-cam im-ui" role="group" aria-label="Camera">
        <button type="button" aria-label="Zoom in" onClick={() => stage?.nudge('in')}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => stage?.nudge('out')}>−</button>
        <button type="button" aria-label="Rotate left" onClick={() => stage?.nudge('left')}>⟲</button>
        <button type="button" aria-label="Rotate right" onClick={() => stage?.nudge('right')}>⟳</button>
        <button type="button" aria-label="Whole Earth" onClick={() => stage?.flyTo('earth')}>◯</button>
      </div>
      <Extremes />
      <Dock />
      <footer className="im-foot im-ui im-mono">
        <span>// ProGarLabs · Using NASA Earth science data · Developed for NASA Space Apps Challenge 2026</span>
        <span>Independent project: not affiliated with or endorsed by NASA</span>
      </footer>
    </div>
  );
}

function PlaceLabels({ ref }: { ref: React.RefObject<HTMLDivElement | null> }) {
  const names = useStage((s) => s.places), atlas = useStage((s) => s.atlas);
  return <div ref={ref} className="im-labels" aria-hidden="true">{names.map((n) => <span key={n} className={`is-${atlas?.places.find((p) => p.name === n)?.kind ?? 'city'}`}>{n}</span>)}</div>;
}

// SI disclosure: developed with Claude and revised with OpenAI Codex; human team review is pending for the revision.
// Trend Detective Lab — displays results computed by the Python pipeline. It computes no statistics.
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { COLOR_A, COLOR_B, intervals, PlotFigure, timeline, type Interval } from './charts';
import { FIXTURE, load } from './data';
import {
  GLOSSARY, level, MAP_STATUS, mapStatus, num, orient, pval, sentence, signed, sourceShort, VERDICT, VERDICT_SHORT, WARNING,
} from './format';
import { Lab } from './lab';
import { ChileMap, rewind } from './map';
import type {
  Alt, Catalog, CellMap, Check, GuidedCase, MultiVar, Regions, RegionSeries, Trend, Validation, VariableData, VariableInfo, Verdict,
  Territory, WindowEntry, Windows,
} from './types';

export const REPO_URL = 'https://github.com/GiuseppePrbst/trend-detective-lab';

type Loaded<T> = { state: 'loading' } | { state: 'missing' } | { state: 'error'; message: string } | { state: 'ok'; data: T };

function useFile<T>(name: string | null): Loaded<T> {
  const [cache, setCache] = useState<Record<string, Loaded<T>>>({});
  useEffect(() => {
    if (!name || cache[name]) return;
    setCache((c) => ({ ...c, [name]: { state: 'loading' } }));
    load<T>(name)
      .then((data) => setCache((c) => ({ ...c, [name]: data === null ? { state: 'missing' } : { state: 'ok', data } })))
      .catch((e: Error) => setCache((c) => ({ ...c, [name]: { state: 'error', message: e.message } })));
  }, [name, cache]);
  return (name && cache[name]) || { state: 'loading' };
}

function Status({ what, s }: { what: string; s: Loaded<unknown> }) {
  if (s.state === 'loading') return <p className="status" role="status">Loading {what}…</p>;
  if (s.state === 'missing') return <p className="status">{what[0].toUpperCase() + what.slice(1)}: not available yet.</p>;
  if (s.state === 'error') return <p className="status error" role="alert">Could not load {what}: {s.message}</p>;
  return null;
}

/** A "?" button that reveals a short plain-language explanation right after it. */
function Explain({ term, children }: { term: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" className="q" aria-expanded={open} aria-controls={id} aria-label={`What is ${term}?`}
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}>?</button>
      <span id={id} className="explain" hidden={!open}>{children}</span>
    </>
  );
}

const VerdictBadge = ({ v }: { v: Verdict }) => <span className={`vbadge v-${v}`}>{VERDICT_SHORT[v]}</span>;

export default function App() {
  const catalog = useFile<Catalog>('catalog.json');
  const geoFile = useFile<Regions>('regions.geojson');
  const validation = useFile<Validation>('validation.json');
  const mvFile = useFile<MultiVar>('multivar.json');
  const winFile = useFile<Windows>('windows.json');
  const cellsT = useFile<CellMap>('cells_t2m.json');
  const cellsS = useFile<CellMap>('cells_soilm_root.json');
  const terrFile = useFile<Territory>('territory.json');
  const cat = catalog.state === 'ok' ? catalog.data : null;

  const [varId, setVarId] = useState<string | null>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [mode, setMode] = useState<'values' | 'anomalies'>('anomalies');
  const exploreRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!cat || varId) return;
    setVarId(cat.variables[0]?.id ?? null);
    const preferred = cat.regions.find((r) => r.id === 'los-lagos') ?? cat.regions[0];
    setA(preferred?.id ?? '');
  }, [cat, varId]);

  const varFile = useFile<VariableData>(varId ? `${varId}.json` : null);
  const v = cat?.variables.find((x) => x.id === varId);
  const data = varFile.state === 'ok' ? varFile.data : null;
  const geo = useMemo(() => (geoFile.state === 'ok' ? rewind(geoFile.data) : null), [geoFile]);
  const names = useMemo(() => Object.fromEntries((cat?.regions ?? []).map((r) => [r.id, r.name])), [cat]);
  const trends = useMemo(
    () => Object.fromEntries(Object.entries(data?.regions ?? {}).map(([id, r]) => [id, r.trend])) as Record<string, Trend>,
    [data],
  );
  const ra = data?.regions[a];
  const rb = b ? data?.regions[b] : undefined;
  const synthetic = FIXTURE || cat?.SYNTHETIC || data?.SYNTHETIC;
  // The guided case whose selection is currently on screen (if any).
  const activeCase = cat?.guided.find((g) => g.variable === varId && g.a === a && g.b === b);
  const checks = validation.state === 'ok' ? validation.data.checks.filter((c) => c.variable === varId && c.region === a) : [];

  const startCase = (g: GuidedCase) => {
    setVarId(g.variable);
    setA(g.a);
    setB(g.b);
    setMode('anomalies');
    requestAnimationFrame(() => {
      exploreRef.current?.focus();
      exploreRef.current?.scrollIntoView({ block: 'start' });
    });
  };

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap">
          <p className="eyebrow">Trend Detective Lab</p>
          <h1>What is changing, where, how fast — and how certain are we?</h1>
          <p className="lede">
            Pick a region of Chile and a climate variable, look at the record, and see what a careful statistical test
            can — and cannot — tell you.
          </p>
          <p className="source">Data: NASA Giovanni / GES DISC</p>
        </div>
      </header>

      {synthetic && (
        <div className="synthetic" role="note">
          SYNTHETIC fixture data for development — these are not NASA observations and not real results.
        </div>
      )}

      <main id="main" className="wrap">
        <Status what="the catalogue" s={catalog} />
        {cat && (
          <>
            <section aria-labelledby="h-cases">
              <h2 id="h-cases"><span className="step">1</span> Start with a case</h2>
              <p>Each case sets a variable and two regions to compare. Or choose your own below.</p>
              <ul className="cases">
                {cat.guided.map((g) => {
                  const ok = cat.variables.some((x) => x.id === g.variable);
                  return (
                    <li key={g.title}>
                      <button className={`case${g === activeCase ? ' is-on' : ''}`} onClick={() => startCase(g)} disabled={!ok}
                        aria-pressed={g === activeCase}>
                        <strong>{g.title}</strong>
                        <span>{g.variable === 'precip' && g.a === 'los-lagos' && g.b === 'magallanes' ? 'IMERG shows a significant decline in Magallanes, but not Los Lagos. Do their trends differ? Other sources do not fully confirm the Magallanes result.' : g.question}</span>
                        {!ok && <em>Data not available yet</em>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="h-var">
              <h2 id="h-var"><span className="step">2</span> Choose a variable</h2>
              <p className="hint">Each product uses its full published period. Selecting a different period and recalculating the trend is not available yet.</p>
              <fieldset className="vars">
                <legend className="sr-only">Variable</legend>
                {cat.variables.map((x) => (
                  <div key={x.id} className={`var-card${x.id === varId ? ' is-on' : ''}`}>
                    <label className="var-pick">
                      <input type="radio" name="variable" value={x.id} checked={x.id === varId} onChange={() => setVarId(x.id)} />
                      <span className="var-title">{x.label}</span>
                    </label>
                    <span className="var-def">{x.definition}</span>
                    <span>
                      <span className="badge">{x.nature_label}</span>{' '}
                      <Explain term={`a ${x.nature.replace('_', ' + ')} product`}>
                        {GLOSSARY[x.nature as keyof typeof GLOSSARY] ?? x.nature_label}
                      </Explain>
                    </span>
                    <span className="var-meta">{x.product} · {x.period[0]}–{x.period[1]}</span>
                  </div>
                ))}
              </fieldset>
            </section>

            {v && (
              <Workspace
                cat={cat} v={v} varFile={varFile} data={data} geo={geo} geoFile={geoFile} names={names} trends={trends}
                a={a} b={b}
                setA={(id) => {
                  setA(id);
                  if (id === b) setB('');
                }}
                setB={setB} ra={ra} rb={rb} mode={mode} setMode={setMode} exploreRef={exploreRef}
                synthetic={!!synthetic} activeCase={activeCase} checks={checks} validation={validation}
                windows={winFile.state === 'ok' ? winFile.data : null}
              />
            )}
            {mvFile.state === 'ok' ? (
              <Lab mv={mvFile.data} names={names} geo={geo} cellsT2m={cellsT.state === 'ok' ? cellsT.data : null}
                cellsSm={cellsS.state === 'ok' ? cellsS.data : null} terr={terrFile.state === 'ok' ? terrFile.data : null} />
            ) : <Status what="the multivariable lab" s={mvFile} />}
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>Team ProGarLabs · Built during NASA Space Apps Challenge 2026 · License Apache-2.0 · <a href={REPO_URL}>Source repository</a></p>
          <p>Use of SI: Parts of this code were written with SI coding tools (Claude and OpenAI Codex); the team is responsible for review.</p>
          {cat && <p className="muted">Data files generated {cat.generated_at}.</p>}
        </div>
      </footer>
    </>
  );
}

function Workspace(p: {
  cat: Catalog;
  v: VariableInfo;
  varFile: Loaded<VariableData>;
  data: VariableData | null;
  geo: Regions | null;
  geoFile: Loaded<Regions>;
  names: Record<string, string>;
  trends: Record<string, Trend>;
  a: string;
  b: string;
  setA: (id: string) => void;
  setB: (id: string) => void;
  ra?: RegionSeries;
  rb?: RegionSeries;
  mode: 'values' | 'anomalies';
  setMode: (m: 'values' | 'anomalies') => void;
  exploreRef: React.RefObject<HTMLHeadingElement | null>;
  synthetic: boolean;
  activeCase?: GuidedCase;
  checks: Check[];
  validation: Loaded<Validation>;
  windows: Windows | null;
}) {
  const { cat, v, varFile, data, geo, geoFile, names, trends, a, b, setA, setB, rb, mode, setMode } = p;
  const wins = p.windows?.[v.id];
  const [wid, setWid] = useState('full');
  useEffect(() => setWid('full'), [v.id]);
  const ra = useMemo(() => applyWindow(p.ra, wid === 'full' ? undefined : wins?.[wid], a), [p.ra, wins, wid, a]);
  const [mapOpen, setMapOpen] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  const nameA = names[a] ?? a;
  const nameB = names[b] ?? b;
  const alpha = cat.method.alpha;

  const makeTimeline = useCallback((w: number) => timeline(ra!, mode, v.unit, w), [ra, mode, v.unit]);

  return (
    <div className="workspace">
      <aside className="side" aria-labelledby="h-region">
        <h2 id="h-region"><span className="step">3</span> Select a region</h2>
        <label className="field">
          Region
          <select value={a} onChange={(e) => setA(e.target.value)}>
            {cat.regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}{data && !data.regions[r.id] ? ' (not available yet)' : ''}
              </option>
            ))}
          </select>
        </label>
        <details className="map-box" open={mapOpen} onToggle={(e) => setMapOpen(e.currentTarget.open)}>
          <summary>Map: trend in every region</summary>
          {geo && data ? (
            <ChileMap geo={geo} v={v} trends={trends} a={a} b={b} alpha={alpha} onSelect={setA} />
          ) : (
            <Status what="the map" s={geo ? varFile : geoFile} />
          )}
          {data && (
            <table className="region-table">
              <caption>Trend per region, north to south ({v.trend_unit}). Significance adjusted for testing 16 regions.</caption>
              <thead>
                <tr><th scope="col">Region</th><th scope="col">Change</th><th scope="col">Result</th></tr>
              </thead>
              <tbody>
                {cat.regions.map((r) => {
                  const t = trends[r.id];
                  return (
                    <tr key={r.id} className={r.id === a ? 'is-a' : undefined}>
                      <th scope="row">{r.name}</th>
                      <td>{t ? signed(t.slope_per_decade) : '—'}</td>
                      <td>{t ? MAP_STATUS[mapStatus(t, alpha)] : 'not available yet'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </details>
      </aside>

      <div className="content">
        <section aria-labelledby="h-explore">
          <h2 id="h-explore" tabIndex={-1} ref={p.exploreRef}><span className="step">4</span> Explore the timeline</h2>
          {varFile.state !== 'ok' ? (
            <Status what={`${v.label.toLowerCase()} data`} s={varFile} />
          ) : !ra ? (
            <p className="status">{nameA}: not available yet for {v.label.toLowerCase()}.</p>
          ) : (
            <>
              {wins && (
                <label className="field period">
                  Period
                  <select value={wid} onChange={(e) => setWid(e.target.value)}>
                    {Object.entries(wins).map(([k, w]) => <option key={k} value={k}>{w.label} ({w.start}–{w.end})</option>)}
                  </select>
                </label>
              )}
              {wid !== 'full' && <p className="hint">Shorter periods are a sensitivity check: the trend, its interval and the anomalies are recomputed by the pipeline for {wins?.[wid]?.start}–{wins?.[wid]?.end} (adjusted p across the 16 regions for this period). Comparisons below always use the full record.</p>}
              <div className="toggle" role="group" aria-label="What to plot">
                <button aria-pressed={mode === 'values'} onClick={() => setMode('values')}>Monthly values</button>
                <button aria-pressed={mode === 'anomalies'} onClick={() => setMode('anomalies')}>Anomalies (seasonal cycle removed)</button>
              </div>
              <p className="hint">
                {mode === 'values'
                  ? `Monthly mean of ${v.label.toLowerCase()} over ${nameA} (${v.unit}). Gaps are missing months.`
                  : `Each month minus the usual value for that calendar month: zero is a typical month. The test uses the yearly averages of these anomalies.`}
              </p>
              <PlotFigure make={makeTimeline} alt={sentence(v, nameA, ra.trend)} />
              {mode === 'anomalies' && (
                <ul className="chart-key">
                  <li><span className="sw sw-month" aria-hidden="true" /> Monthly anomalies</li>
                  <li><span className="sw sw-year" aria-hidden="true" /> Yearly means (what the test uses)</li>
                  <li><span className="sw sw-trend" aria-hidden="true" /> Trend</li>
                  <li><span className="sw sw-band" aria-hidden="true" /> Range of trends compatible with the data (95 % confidence interval)</li>
                </ul>
              )}
            </>
          )}
        </section>

        {ra && <TrendTest v={v} name={nameA} rs={ra} cat={cat} />}

        <section aria-labelledby="h-compare">
          <h2 id="h-compare"><span className="step">6</span> Compare regions</h2>
          <p className="callout" role="note">
            A significant trend in one region and a non-significant trend in another do <strong>not</strong> show that the
            regions differ. Only the test of the difference can.
          </p>
          <label className="field">
            Region B
            <select value={b} onChange={(e) => setB(e.target.value)}>
              <option value="">Choose a region to compare with {nameA}…</option>
              {cat.regions.filter((r) => r.id !== a).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}{data && !data.regions[r.id] ? ' (not available yet)' : ''}
                </option>
              ))}
            </select>
          </label>
          {b && b !== a && data && (ra && rb
            ? <Compare v={v} data={data} a={a} b={b} nameA={nameA} nameB={nameB} ra={p.ra!} rb={rb} alpha={alpha} guided={p.activeCase} />
            : <p className="status">{!ra ? nameA : nameB}: not available yet for {v.label.toLowerCase()}.</p>)}
        </section>

        <Evidence cat={cat} v={v} name={nameA} rs={ra} synthetic={p.synthetic} checks={p.checks} validation={p.validation} />
      </div>
    </div>
  );
}

/** Swap in the pipeline's results for another time window (dates cut to the window, anomalies against that window's climatology). */
function applyWindow(rs: RegionSeries | undefined, w: WindowEntry | undefined, rid: string): RegionSeries | undefined {
  const e = w?.regions[rid];
  if (!rs || !w || !e) return rs;
  const idx = rs.dates.map((d, i) => [d, i] as const).filter(([d]) => +d.slice(0, 4) >= w.start && +d.slice(0, 4) <= w.end);
  const values = idx.map(([, i]) => rs.values[i]);
  return {
    ...rs,
    dates: idx.map(([d]) => d),
    values,
    anomalies: idx.map(([d], k) => (values[k] == null ? null : (values[k] as number) - e.climatology[+d.slice(5, 7) - 1])),
    climatology: e.climatology,
    annual: e.annual,
    trend: e.trend,
  };
}

const ciText = (lo?: number, hi?: number) => (lo == null || hi == null ? '—' : `${num(lo)} to ${num(hi)}`);

function TrendTest({ v, name, rs, cat }: { v: VariableInfo; name: string; rs: RegionSeries; cat: Catalog }) {
  const t = rs.trend;
  const s = t.sensitivity;
  const methods: [string, Alt | undefined][] = [
    ['Final: yearly means', { slope_per_decade: t.slope_per_decade, ci_low: t.ci_low, ci_high: t.ci_high, p_value: t.p_value }],
    ['First revision: monthly, multi-lag', s?.first_revision_monthly_multilag],
    ['Pre-registered: monthly, lag-1', s?.preregistered_monthly_ar1],
  ];
  return (
    <section aria-labelledby="h-test">
      <h2 id="h-test"><span className="step">5</span> Test the trend</h2>
      <div className="result">
        <p className={`verdict v-${t.verdict}`}>
          <span aria-hidden="true">{t.verdict === 'significant_robust' ? '●' : t.verdict === 'method_dependent' ? '◐' : '○'}</span>{' '}
          {VERDICT[t.verdict]}
          {t.verdict === 'not_significant' && <> <Explain term="not significant">{GLOSSARY.notsig}</Explain></>}
        </p>
        <p className="sentence" aria-live="polite">{sentence(v, name, t)}</p>
        <dl className="stats">
          <div>
            <dt>Change per decade <Explain term="the change per decade">{GLOSSARY.slope}</Explain></dt>
            <dd>{signed(t.slope_per_decade)} {v.trend_unit}</dd>
          </div>
          <div>
            <dt>95 % confidence interval <Explain term="a 95 % confidence interval">{GLOSSARY.ci}</Explain></dt>
            <dd>{num(t.ci_low)} to {num(t.ci_high)}</dd>
          </div>
          <div>
            <dt>p-value <Explain term="a p-value">{GLOSSARY.p}</Explain></dt>
            <dd>{pval(t.p_value)}</dd>
          </div>
          {t.relative_pct_per_decade != null && (
            <div>
              <dt>Relative change</dt>
              <dd>
                {signed(t.relative_pct_per_decade)} % per decade (relative to the {t.start.slice(0, 4)}–{t.end.slice(0, 4)} mean
                of {level(t.mean)} {v.unit})
              </dd>
            </div>
          )}
        </dl>
        <p className="muted">
          Where does the uncertainty come from? <Explain term="the source of the uncertainty">{GLOSSARY.uncertainty}</Explain>
        </p>
        <details className="how">
          <summary>How do we know?</summary>
          <dl className="stats">
            {t.n_years_used != null && t.n_eff_annual != null && (
              <div>
                <dt>Years used <Explain term="the effective number of years">{GLOSSARY.neff}</Explain></dt>
                <dd>
                  The test uses {t.n_years_used} yearly means, which carry the information of about {Math.round(t.n_eff_annual)}{' '}
                  independent years.
                </dd>
              </div>
            )}
            {t.r1_annual != null && (
              <div>
                <dt>Year-to-year persistence</dt>
                <dd>Each year resembles the previous one by r1 = {t.r1_annual.toFixed(2)} (lag-1 autocorrelation of yearly values).</dd>
              </div>
            )}
            <div>
              <dt>Robustness check (same yearly values)</dt>
              <dd>Theil–Sen slope {signed(t.theil_sen_per_decade)} {v.trend_unit}; Mann–Kendall {pval(t.mk_p_value)}.</dd>
            </div>
            {t.p_adjusted != null && (
              <div>
                <dt>Adjusted for 16 regions <Explain term="the adjusted p-value">{GLOSSARY.fdr}</Explain></dt>
                <dd>
                  {pval(t.p_adjusted)} —{' '}
                  {t.significant_after_fdr ? 'still significant after adjustment' : 'not significant after adjustment'}. Use this one
                  when comparing regions on the map.
                </dd>
              </div>
            )}
            <div>
              <dt>Month-to-month memory (diagnostic)</dt>
              <dd>
                Monthly anomalies resemble their neighbours (r1 = {t.r1.toFixed(2)}): {t.n_months} months behave like about{' '}
                {Math.round(t.n_eff)} independent values. This is why the test works on yearly means.
              </dd>
            </div>
          </dl>
          {t.warnings.length > 0 && (
            <ul className="warnings">
              {t.warnings.map((w) => <li key={w}>{WARNING[w]?.(rs.n_cells) ?? w}</li>)}
            </ul>
          )}

          {s && (
            <>
              <h3>Would another method have said something different?</h3>
              <div className="table-scroll">
                <table className="sens">
                  <thead>
                    <tr><th scope="col">Method</th><th scope="col">Change per decade</th><th scope="col">95 % CI</th><th scope="col">p-value</th></tr>
                  </thead>
                  <tbody>
                    {methods.map(([label, m]) => (
                      <tr key={label}>
                        <th scope="row">{label}</th>
                        <td>{m?.slope_per_decade != null ? signed(m.slope_per_decade) : '—'}</td>
                        <td>{ciText(m?.ci_low, m?.ci_high)}</td>
                        <td>{m ? pval(m.p_value) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="muted">
                The two earlier monthly methods gave too many false alarms in our simulations, so the yearly-means result is the
                one we report. {cat.method.calibration}
              </p>
            </>
          )}
          {cat.method.changes && cat.method.changes.length > 0 && (
            <>
              <h3>How our method changed, and why</h3>
              <ol className="changes">{cat.method.changes.map((c) => <li key={c}>{c}</li>)}</ol>
            </>
          )}
          <p className="muted">{cat.method.main}</p>
          <p className="muted">{cat.method.robustness}</p>
        </details>
      </div>
      <ul className="caution" aria-label="How to read this result">
        <li><strong>Significant ≠ caused by something in particular.</strong> This test does not attribute causes.</li>
        <li><strong>Not significant ≠ no change.</strong> The record may be too short or too variable to tell.</li>
        <li><strong>Significant ≠ important.</strong> Look at the size of the change.</li>
      </ul>
    </section>
  );
}

function Compare(p: {
  v: VariableInfo;
  data: VariableData;
  a: string;
  b: string;
  nameA: string;
  nameB: string;
  ra: RegionSeries;
  rb: RegionSeries;
  alpha: number;
  guided?: GuidedCase;
}) {
  const { v, data, a, b, nameA, nameB, ra, rb, alpha, guided } = p;
  const c = orient(data.comparisons, a, b);
  const nPairs = Object.keys(data.comparisons).length;
  const unplanned = c?.planned === false;
  const differs = c ? (unplanned ? !!c.differs_after_fdr : c.differs) : false;
  const sigA = ra.trend.p_value < alpha;
  const sigB = rb.trend.p_value < alpha;
  const oneOfThose = !!c && sigA !== sigB && !differs;

  // Shared y-axis extent so the two panels are visually comparable (display range, not a statistic).
  const yDomain = useMemo(() => {
    const all = [...ra.anomalies, ...rb.anomalies].filter((x): x is number => x != null);
    return [Math.min(...all), Math.max(...all)] as [number, number];
  }, [ra, rb]);
  const makeA = useCallback((w: number) => timeline(ra, 'anomalies', v.unit, w, { color: COLOR_A, yDomain, height: 220 }), [ra, v.unit, yDomain]);
  const makeB = useCallback((w: number) => timeline(rb, 'anomalies', v.unit, w, { color: COLOR_B, dash: '4,3', yDomain, height: 220 }), [rb, v.unit, yDomain]);
  const rows = useMemo(() => {
    const r: Interval[] = [
      { name: `Trend in ${nameA}`, slope: ra.trend.slope_per_decade, lo: ra.trend.ci_low, hi: ra.trend.ci_high, color: COLOR_A },
      { name: `Trend in ${nameB}`, slope: rb.trend.slope_per_decade, lo: rb.trend.ci_low, hi: rb.trend.ci_high, color: COLOR_B },
    ];
    if (c) r.push({ name: `Difference ${nameA} − ${nameB}`, slope: c.slope_per_decade, lo: c.ci_low, hi: c.ci_high, color: '#374151' });
    return r;
  }, [nameA, nameB, ra, rb, c]);
  const makeIntervals = useCallback((w: number) => intervals(rows, v.trend_unit, w), [rows, v.trend_unit]);

  const alt = (n: string, t: { slope_per_decade: number; ci_low: number; ci_high: number }) =>
    `${n}: ${signed(t.slope_per_decade)} ${v.trend_unit} (95 % CI ${num(t.ci_low)} to ${num(t.ci_high)})`;

  const Block = ({ title, t, verdict, p: pv, cls }: { title: string; t: { slope_per_decade: number; ci_low: number; ci_high: number }; verdict: ReactNode; p: string; cls: string }) => (
    <div className={`cblock ${cls}`}>
      <h3>{title}</h3>
      <p className="cblock-slope">{signed(t.slope_per_decade)} <span>{v.trend_unit}</span></p>
      <p className="muted">95 % CI {num(t.ci_low)} to {num(t.ci_high)} · {pv}</p>
      {verdict}
    </div>
  );

  return (
    <div className="compare">
      {guided && guided.preregistered === false && (
        <p className="note">This pair was chosen after seeing the results, to illustrate a point.</p>
      )}
      <div className="cblocks">
        <Block title={`Trend in ${nameA}`} t={ra.trend} cls="cb-a" p={pval(ra.trend.p_value)} verdict={<VerdictBadge v={ra.trend.verdict} />} />
        <Block title={`Trend in ${nameB}`} t={rb.trend} cls="cb-b" p={pval(rb.trend.p_value)} verdict={<VerdictBadge v={rb.trend.verdict} />} />
        {c ? (
          <Block title={`Difference ${nameA} − ${nameB}`} t={c} cls="cb-d"
            p={unplanned && c.p_adjusted != null ? `adjusted ${pval(c.p_adjusted)}` : pval(c.p_value)}
            verdict={<span className={`vbadge ${differs ? 'v-significant_robust' : 'v-not_significant'}`}>{differs ? 'trends differ' : 'cannot tell apart'}</span>} />
        ) : (
          <div className="cblock cb-d"><h3>Difference {nameA} − {nameB}</h3><p className="status">Not available yet.</p></div>
        )}
      </div>

      <PlotFigure make={makeIntervals} alt={rows.map((r) => alt(r.name, { slope_per_decade: r.slope, ci_low: r.lo, ci_high: r.hi })).join('. ')} />

      {c && (
        <div className={`result compare-result${differs ? ' differs' : ''}`} aria-live="polite">
          <p className="verdict">
            {differs ? 'The two trends are significantly different.' : 'We cannot say these trends differ — even if one looks significant and the other does not.'}
          </p>
          {oneOfThose && (
            <p className="those">
              <strong>This is one of those cases:</strong> {sigA ? nameA : nameB} has a significant trend and{' '}
              {sigA ? nameB : nameA} does not, yet the test of the difference cannot tell the two regions apart.
            </p>
          )}
          {unplanned && c.p_adjusted != null && (
            <p className="adjusted">
              <strong>Adjusted {pval(c.p_adjusted)}</strong> (unadjusted {pval(c.p_value)}). This pair was not planned in advance:
              you are looking at one of {nPairs} possible pairs, so some will look different by chance. The adjusted p-value
              accounts for that.
            </p>
          )}
          <p>
            Trend of the difference {nameA} − {nameB}: {signed(c.slope_per_decade)} {v.trend_unit} (95 % CI {num(c.ci_low)} to{' '}
            {num(c.ci_high)}), {pval(c.p_value)}
            {c.n_years_used != null && c.n_eff_annual != null && <>, from {c.n_years_used} yearly means (about {Math.round(c.n_eff_annual)} independent years)</>}.
            Robustness: Theil–Sen {signed(c.theil_sen_per_decade)}, Mann–Kendall {pval(c.mk_p_value)}.
          </p>
          {guided?.lesson && (
            <p className="lesson"><strong>What this case shows:</strong> {guided.variable === 't2m' && guided.a === 'los-lagos' && guided.b === 'antofagasta' ? 'In MERRA-2 the difference between the trends is significant. ERA5 checks individual regional samples, not the difference itself; the Antofagasta station does not confirm its regional warming estimate.' : guided.lesson}</p>
          )}
        </div>
      )}

      <h3>Anomalies on the same scale</h3>
      <p className="hint">Thin grey: monthly anomalies. Dots: yearly means. Thick line and shading: trend and its 95 % range.</p>
      <div className="multiples">
        <figure>
          <figcaption><span className="key key-a" aria-hidden="true" /> {nameA} (solid line)</figcaption>
          <PlotFigure make={makeA} alt={alt(nameA, ra.trend)} />
        </figure>
        <figure>
          <figcaption><span className="key key-b" aria-hidden="true" /> {nameB} (dashed line)</figcaption>
          <PlotFigure make={makeB} alt={alt(nameB, rb.trend)} />
        </figure>
      </div>
    </div>
  );
}

const KIND: Record<string, string> = {
  station: 'Independent observation (station)',
  other_reanalysis: 'Another reanalysis',
};
const AGREEMENT: Record<string, string> = {
  consistent: 'Consistent: same verdict and overlapping intervals',
  partly: 'Partly consistent',
  inconsistent: 'Inconsistent',
};

function CheckCard({ c, name }: { c: Check; name: string }) {
  const rows = useMemo(() => {
    const r: Interval[] = [];
    const add = (label: string, x: Alt, color: string) => {
      if (x.slope_per_decade != null && x.ci_low != null && x.ci_high != null)
        r.push({ name: label, slope: x.slope_per_decade, lo: x.ci_low, hi: x.ci_high, color });
    };
    add(c.kind === 'other_reanalysis' ? `Ours (same five grid points in ${name})` : `Ours (${name} regional mean)`, c.ours, COLOR_A);
    add(c.source, c.other, '#374151');
    return r;
  }, [c, name]);
  const make = useCallback((w: number) => intervals(rows, c.unit, w), [rows, c.unit]);
  const kind = c.independent ? KIND[c.kind] ?? c.kind : 'Same underlying source — consistency check only';
  return (
    <div className="result check">
      <p>
        <span className={`badge${c.independent ? '' : ' badge-warn'}`}>{kind}</span>{' '}
        <strong>{c.url ? <a href={c.url}>{c.source}</a> : c.source}</strong>
      </p>
      <p className="muted">
        {c.period && <>Period {c.period[0]}–{c.period[1]}</>}{c.n_years != null && <> · {c.n_years} years</>}
        {c.licence && <> · Licence: {c.licence}</>}
      </p>
      {rows.length > 0 && <PlotFigure make={make} alt={rows.map((r) => `${r.name}: ${num(r.slope)} ${c.unit} (${num(r.lo)} to ${num(r.hi)})`).join('. ')} />}
      <dl className="stats">
        {c.correlation_annual != null && (
          <div><dt>Correlation of yearly anomalies</dt><dd>{c.correlation_annual.toFixed(2)}</dd></div>
        )}
        <div><dt>Agreement</dt><dd>{AGREEMENT[c.agreement] ?? c.agreement}</dd></div>
      </dl>
      {c.caveat && <p className="muted">{c.caveat}</p>}
    </div>
  );
}

function Evidence(p: {
  cat: Catalog;
  v: VariableInfo;
  name: string;
  rs?: RegionSeries;
  synthetic: boolean;
  checks: Check[];
  validation: Loaded<Validation>;
}) {
  const { cat, v, name, rs, synthetic, checks } = p;
  const download = () => {
    if (!rs) return;
    const lines = [
      ...(synthetic ? ['# SYNTHETIC fixture data - not NASA observations'] : []),
      `# ${v.label} (${v.unit}), ${name}, regional mean of ${rs.n_cells} grid cells`,
      `# Source: ${v.product} v${v.version}, doi:${v.doi}, via ${v.service}, accessed ${v.accessed}`,
      `# Citation: ${v.citation}`,
      `# Block 1: monthly series. anomaly = value minus the mean of the same calendar month over the analysed period`,
      'date,value,anomaly',
      ...rs.dates.map((d, i) => `${d},${rs.values[i] ?? ''},${rs.anomalies[i] ?? ''}`),
      ...(rs.annual
        ? [
            '',
            '# Block 2: yearly means of the monthly anomalies (the values the trend test uses), as published by the pipeline',
            'year,annual_mean_anomaly',
            ...rs.annual.years.map((y, i) => `${y},${rs.annual!.anomalies[i] ?? ''}`),
          ]
        : []),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `${v.id}_${name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(el);
    el.click();
    el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section aria-labelledby="h-evidence">
      <h2 id="h-evidence"><span className="step">7</span> Review the evidence</h2>
      <p>
        <strong>What this measures:</strong> {v.definition} {v.nature_label}.{' '}
        <Explain term={`a ${v.nature.replace('_', ' + ')} product`}>{GLOSSARY[v.nature as keyof typeof GLOSSARY] ?? v.nature_label}</Explain>
      </p>
      <dl className="facts">
        <div><dt>Product</dt><dd>{v.product} (version {v.version}) — {sourceShort(v)}</dd></div>
        <div><dt>DOI</dt><dd><a href={`https://doi.org/${v.doi}`}>{v.doi}</a></dd></div>
        <div><dt>Service</dt><dd>{v.service}</dd></div>
        <div><dt>Accessed</dt><dd>{v.accessed}</dd></div>
        <div><dt>Grid</dt><dd>{v.grid}</dd></div>
        <div><dt>Period</dt><dd>{v.period[0]}–{v.period[1]}</dd></div>
        {rs && <div><dt>Grid cells in {name}</dt><dd>{rs.n_cells}</dd></div>}
      </dl>

      <h3>External and consistency checks</h3>
      {p.validation.state !== 'ok' ? (
        <Status what="the external checks" s={p.validation} />
      ) : checks.length === 0 ? (
        <p className="status">No external check for this selection yet.</p>
      ) : (
        checks.map((c) => <CheckCard key={c.source} c={c} name={name} />)
      )}

      <h3>Caveats</h3>
      <ul>{v.caveats.map((c) => <li key={c}>{c}</li>)}</ul>
      <h3>Method</h3>
      <p>{cat.method.main}</p>
      <p>{cat.method.robustness}</p>
      <p>{cat.method.comparison}</p>
      {cat.method.multiple && <p>{cat.method.multiple}</p>}
      <p>Significance level α = {cat.method.alpha}.</p>
      <h3>Limitations</h3>
      <ul>{cat.method.limitations.map((l) => <li key={l}>{l}</li>)}</ul>
      <h3>Citation</h3>
      <p className="citation">{v.citation}</p>
      <button className="primary" onClick={download} disabled={!rs}>
        Download this series (CSV)
      </button>
    </section>
  );
}

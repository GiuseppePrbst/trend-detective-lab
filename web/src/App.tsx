// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Trend Detective Lab — displays results computed by the Python pipeline. It computes no statistics.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLOR_A, COLOR_B, intervals, PlotFigure, timeline } from './charts';
import { FIXTURE, load } from './data';
import { num, orient, pval, sentence, signed, sourceShort, VERDICT, VERDICT_SHORT, WARNING } from './format';
import { ChileMap, rewind } from './map';
import type { Catalog, Regions, RegionSeries, Trend, VariableData, VariableInfo } from './types';

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

export default function App() {
  const catalog = useFile<Catalog>('catalog.json');
  const geoFile = useFile<Regions>('regions.geojson');
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

  const startCase = (g: Catalog['guided'][number]) => {
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
          <h1>Is the climate in your region really changing? Review the evidence.</h1>
          <p className="lede">
            Pick a region of Chile and a climate variable, look at the monthly record, and see what a careful
            statistical test can — and cannot — tell you.
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
                      <button className="case" onClick={() => startCase(g)} disabled={!ok}>
                        <strong>{g.title}</strong>
                        <span>{g.question}</span>
                        {!ok && <em>Data not available yet</em>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="h-var">
              <h2 id="h-var"><span className="step">2</span> Choose a variable</h2>
              <fieldset className="vars">
                <legend className="sr-only">Variable</legend>
                {cat.variables.map((x) => (
                  <label key={x.id} className={`var-card${x.id === varId ? ' is-on' : ''}`}>
                    <input type="radio" name="variable" value={x.id} checked={x.id === varId} onChange={() => setVarId(x.id)} />
                    <span className="var-title">{x.label}</span>
                    <span className="badge">{x.nature_label}</span>
                    <span className="var-def">{x.definition}</span>
                    <span className="var-meta">{x.product} · {x.period[0]}–{x.period[1]}</span>
                  </label>
                ))}
              </fieldset>
            </section>

            {v && (
              <Workspace
                cat={cat}
                v={v}
                varFile={varFile}
                data={data}
                geo={geo}
                geoFile={geoFile}
                names={names}
                trends={trends}
                a={a}
                b={b}
                setA={(id) => {
                  setA(id);
                  if (id === b) setB('');
                }}
                setB={setB}
                ra={ra}
                rb={rb}
                mode={mode}
                setMode={setMode}
                exploreRef={exploreRef}
                synthetic={!!synthetic}
              />
            )}
          </>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <p>Team ProGarLabs · Built during NASA Space Apps Challenge 2026 · License Apache-2.0 · <a href={REPO_URL}>Source repository</a></p>
          <p>Use of SI: Parts of this code were written with SI coding tools (Claude) and reviewed by the team.</p>
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
}) {
  const { cat, v, varFile, data, geo, geoFile, names, trends, a, b, setA, setB, ra, rb, mode, setMode } = p;
  const [mapOpen, setMapOpen] = useState(() => window.matchMedia('(min-width: 900px)').matches);
  const nameA = names[a] ?? a;
  const nameB = names[b] ?? b;

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
            <ChileMap geo={geo} v={v} trends={trends} a={a} b={b} onSelect={setA} />
          ) : (
            <Status what="the map" s={geo ? varFile : geoFile} />
          )}
          {data && (
            <table className="region-table">
              <caption>Trend per region, north to south ({v.trend_unit})</caption>
              <thead>
                <tr><th scope="col">Region</th><th scope="col">Change</th><th scope="col">Verdict</th></tr>
              </thead>
              <tbody>
                {cat.regions.map((r) => {
                  const t = trends[r.id];
                  return (
                    <tr key={r.id} className={r.id === a ? 'is-a' : undefined}>
                      <th scope="row">{r.name}</th>
                      <td>{t ? signed(t.slope_per_decade) : '—'}</td>
                      <td>{t ? VERDICT_SHORT[t.verdict] : 'not available yet'}</td>
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
              <div className="toggle" role="group" aria-label="What to plot">
                <button aria-pressed={mode === 'values'} onClick={() => setMode('values')}>Monthly values</button>
                <button aria-pressed={mode === 'anomalies'} onClick={() => setMode('anomalies')}>Anomalies (seasonal cycle removed)</button>
              </div>
              <p className="hint">
                {mode === 'values'
                  ? `Monthly mean of ${v.label.toLowerCase()} over ${nameA} (${v.unit}). Gaps are missing months.`
                  : `Each month minus the usual value for that calendar month. Zero = a typical month. The thick line is the fitted trend.`}
              </p>
              <PlotFigure make={makeTimeline} alt={sentence(v, nameA, ra.trend)} />
            </>
          )}
        </section>

        {ra && <TrendTest v={v} name={nameA} rs={ra} cat={cat} />}

        <section aria-labelledby="h-compare">
          <h2 id="h-compare"><span className="step">6</span> Compare regions</h2>
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
          {b && b !== a && data && (ra && rb ? <Compare v={v} data={data} a={a} b={b} nameA={nameA} nameB={nameB} ra={ra} rb={rb} />
            : <p className="status">{!ra ? nameA : nameB}: not available yet for {v.label.toLowerCase()}.</p>)}
        </section>

        <Evidence cat={cat} v={v} name={nameA} rs={ra} synthetic={p.synthetic} />
      </div>
    </div>
  );
}

function TrendTest({ v, name, rs, cat }: { v: VariableInfo; name: string; rs: RegionSeries; cat: Catalog }) {
  const t = rs.trend;
  return (
    <section aria-labelledby="h-test">
      <h2 id="h-test"><span className="step">5</span> Test the trend</h2>
      <div className="result">
        <p className={`verdict v-${t.verdict}`}>
          <span aria-hidden="true">{t.verdict === 'significant_robust' ? '●' : t.verdict === 'method_dependent' ? '◐' : '○'}</span>{' '}
          {VERDICT[t.verdict]}
        </p>
        <p className="sentence" aria-live="polite">{sentence(v, name, t)}</p>
        <dl className="stats">
          <div><dt>Change per decade</dt><dd>{signed(t.slope_per_decade)} {v.trend_unit}</dd></div>
          <div><dt>95 % confidence interval</dt><dd>{num(t.ci_low)} to {num(t.ci_high)}</dd></div>
          <div><dt>p-value</dt><dd>{pval(t.p_value)}</dd></div>
          {t.relative_pct_per_decade != null && (
            <div><dt>Relative change</dt><dd>{signed(t.relative_pct_per_decade)} % per decade</dd></div>
          )}
        </dl>
        <details className="how">
          <summary>How do we know?</summary>
          <dl className="stats">
            <div>
              <dt>Memory between months</dt>
              <dd>Each month resembles the previous one: lag-1 autocorrelation r1 = {t.r1.toFixed(2)}.</dd>
            </div>
            <div>
              <dt>Effective sample size</dt>
              <dd>
                {t.n_months} months of data behave like about {Math.round(t.n_eff)} independent values (n_eff), so the
                uncertainty is wider than a naive count suggests.
              </dd>
            </div>
            <div>
              <dt>Robustness check</dt>
              <dd>Theil–Sen slope {signed(t.theil_sen_per_decade)} {v.trend_unit}; Mann–Kendall {pval(t.mk_p_value)}.</dd>
            </div>
            {t.p_adjusted != null && (
              <div>
                <dt>Adjusted for multiple testing</dt>
                <dd>
                  {pval(t.p_adjusted)}. Testing 16 regions at once makes some false alarms likely by chance; the adjusted
                  p-value (Benjamini–Hochberg) accounts for that when you compare across the map.
                </dd>
              </div>
            )}
          </dl>
          {t.warnings.length > 0 && (
            <ul className="warnings">
              {t.warnings.map((w) => <li key={w}>{WARNING[w]?.(rs.n_cells) ?? w}</li>)}
            </ul>
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
}) {
  const { v, data, a, b, nameA, nameB, ra, rb } = p;
  const c = orient(data.comparisons, a, b);
  // Shared y-axis extent so the two panels are visually comparable (display range, not a statistic).
  const yDomain = useMemo(() => {
    const all = [...ra.anomalies, ...rb.anomalies].filter((x): x is number => x != null);
    return [Math.min(...all), Math.max(...all)] as [number, number];
  }, [ra, rb]);
  const makeA = useCallback((w: number) => timeline(ra, 'anomalies', v.unit, w, { color: COLOR_A, yDomain, height: 200 }), [ra, v.unit, yDomain]);
  const makeB = useCallback((w: number) => timeline(rb, 'anomalies', v.unit, w, { color: COLOR_B, dash: '4,3', yDomain, height: 200 }), [rb, v.unit, yDomain]);
  const rows = useMemo(() => {
    const r = [
      { name: nameA, slope: ra.trend.slope_per_decade, lo: ra.trend.ci_low, hi: ra.trend.ci_high, color: COLOR_A },
      { name: nameB, slope: rb.trend.slope_per_decade, lo: rb.trend.ci_low, hi: rb.trend.ci_high, color: COLOR_B },
    ];
    if (c) r.push({ name: `Difference ${nameA} − ${nameB}`, slope: c.slope_per_decade, lo: c.ci_low, hi: c.ci_high, color: '#374151' });
    return r;
  }, [nameA, nameB, ra, rb, c]);
  const makeIntervals = useCallback((w: number) => intervals(rows, v.trend_unit, w), [rows, v.trend_unit]);

  const alt = (n: string, t: Trend) => `${n}: ${signed(t.slope_per_decade)} ${v.trend_unit} (95 % CI ${num(t.ci_low)} to ${num(t.ci_high)}), ${VERDICT_SHORT[t.verdict]}`;

  return (
    <div className="compare">
      {c ? (
        <div className={`result compare-result ${c.differs ? 'differs' : ''}`} aria-live="polite">
          <p className="verdict">
            {c.differs ? 'The two trends are significantly different' : 'We cannot say these trends differ — even if one looks significant and the other does not.'}
          </p>
          <p>
            Trend of the difference {nameA} − {nameB}: {signed(c.slope_per_decade)} {v.trend_unit} (95 % CI {num(c.ci_low)} to{' '}
            {num(c.ci_high)}), {pval(c.p_value)}. Robustness: Theil–Sen {signed(c.theil_sen_per_decade)}, Mann–Kendall {pval(c.mk_p_value)}.
          </p>
        </div>
      ) : (
        <p className="status">The difference test for this pair is not available yet.</p>
      )}
      <h3>Both slopes with their 95 % confidence intervals</h3>
      <PlotFigure make={makeIntervals} alt={`${alt(nameA, ra.trend)}. ${alt(nameB, rb.trend)}.`} />
      <h3>Anomalies on the same scale</h3>
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

function Evidence({ cat, v, name, rs, synthetic }: { cat: Catalog; v: VariableInfo; name: string; rs?: RegionSeries; synthetic: boolean }) {
  const download = () => {
    if (!rs) return;
    const lines = [
      ...(synthetic ? ['# SYNTHETIC fixture data - not NASA observations'] : []),
      `# ${v.label} (${v.unit}), ${name}, regional mean of ${rs.n_cells} grid cells`,
      `# Source: ${v.product} v${v.version}, doi:${v.doi}, via ${v.service}, accessed ${v.accessed}`,
      `# Citation: ${v.citation}`,
      `# anomaly = value minus the mean of the same calendar month over the analysed period`,
      'date,value,anomaly',
      ...rs.dates.map((d, i) => `${d},${rs.values[i] ?? ''},${rs.anomalies[i] ?? ''}`),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], { type: 'text/csv' }));
    const el = document.createElement('a');
    el.href = url;
    el.download = `${v.id}_${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    el.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby="h-evidence">
      <h2 id="h-evidence"><span className="step">7</span> Review the evidence</h2>
      <dl className="facts">
        <div><dt>Product</dt><dd>{v.product} (version {v.version}) — {sourceShort(v)}</dd></div>
        <div><dt>DOI</dt><dd><a href={`https://doi.org/${v.doi}`}>{v.doi}</a></dd></div>
        <div><dt>Service</dt><dd>{v.service}</dd></div>
        <div><dt>Accessed</dt><dd>{v.accessed}</dd></div>
        <div><dt>Grid</dt><dd>{v.grid}</dd></div>
        <div><dt>Period</dt><dd>{v.period[0]}–{v.period[1]}</dd></div>
        {rs && <div><dt>Grid cells in {name}</dt><dd>{rs.n_cells}</dd></div>}
      </dl>
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

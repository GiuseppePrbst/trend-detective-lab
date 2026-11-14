// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Multivariable lab: shows the EXPLORATORY results written by pipeline/multivar.py. It computes no statistics.
import * as Plot from '@observablehq/plot';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { COLOR_A, COLOR_B, intervals, PlotFigure, type Interval } from './charts';
import { num, pval, signed, VERDICT_SHORT } from './format';
import type { Assoc, CellMap, MultiVar, MVSeries, Regions, SST, Territory } from './types';

const INK = '#1f2937';

/** Documented suggestion rules: phenomenon -> variables that help to understand it (docs/multivariable/RESEARCH_QUESTIONS.md). */
export const PHENOMENA: Record<string, { label: string; vars: string[]; why: string }> = {
  water: {
    label: 'Water availability',
    vars: ['precip', 'soilm_root', 'soilm_surface', 'evap'],
    why: 'Rain is the input; soil moisture is what the land keeps; evapotranspiration is what returns to the air.',
  },
  snow: {
    label: 'Andean snow',
    vars: ['t2m', 'swe', 'precip'],
    why: 'Snowpack depends on how much falls and on whether it is cold enough to stay.',
  },
  climate: {
    label: 'Climate',
    vars: ['t2m', 'precip'],
    why: 'Temperature and precipitation are the basic state of the climate.',
  },
};

type Info = { label: string; unit: string; trend_unit: string; product?: string; nature_label?: string };

export function Lab({ mv, names, geo, cellsT2m, cellsSm, terr, focus, sst }: {
  mv: MultiVar; names: Record<string, string>; geo: Regions | null; cellsT2m: CellMap | null; cellsSm: CellMap | null; terr: Territory | null;
  focus?: { region: string; x: string; y: string; n: number };
  sst?: SST | null;
}) {
  const info: Record<string, Info> = useMemo(() => ({
    ...mv.reference,
    ...Object.fromEntries(mv.variables.map((v) => [v.id, v])),
  }), [mv]);
  const [phen, setPhen] = useState('water');
  const [region, setRegion] = useState('metropolitana-de-santiago');
  const [x, setX] = useState('precip');
  const [y, setY] = useState('soilm_root');
  useEffect(() => {
    if (!focus) return;
    setRegion(focus.region); setX(focus.x); setY(focus.y);
    const p = Object.entries(PHENOMENA).find(([, v]) => v.vars.includes(focus.x) && v.vars.includes(focus.y));
    if (p) setPhen(p[0]);
    requestAnimationFrame(() => document.getElementById('h-explore-lab')?.scrollIntoView({ block: 'start' }));
  }, [focus]);
  const R = mv.regions[region];
  const avail = (id: string) => !!R?.series[id];
  const choosePhen = (p: string) => {
    setPhen(p);
    const vs = PHENOMENA[p].vars;
    setX(vs[0]);
    setY(vs[1]);
  };
  const pairKey = mv.pairs.find(([a, b]) => (a === x && b === y) || (a === y && b === x));
  const assoc = pairKey ? R?.associations[`${pairKey[0]}|${pairKey[1]}`] : undefined;

  return (
    <section aria-labelledby="h-lab" className="lab">
      <h2 id="h-lab"><span className="step">8</span> Multivariable lab <span className="tag-exp">exploratory</span></h2>
      <p className="callout" role="note">
        Everything in this section was analysed <strong>after</strong> the main study, so it is exploratory: it can show what is
        <em> consistent with</em> an idea, not confirm it. Corrections for multiple testing cover {mv.families.E1} new trends and{' '}
        {mv.families.E2} associations. Soil moisture, evapotranspiration and snow come from GLDAS, a land-surface <strong>model</strong>{' '}
        driven partly by observed precipitation — so its agreement with IMERG rainfall is partly built in.
      </p>

      {mv.guided && (
        <>
          <h3>Guided discoveries</h3>
          <ul className="cases">
            {mv.guided.map((g) => (
              <li key={g.title}>
                <button className={`case${region === g.region && x === g.x && y === g.y ? ' is-on' : ''}`}
                  onClick={() => { setRegion(g.region); setX(g.x); setY(g.y); }}>
                  <strong>{g.title}</strong><span>{g.question}</span>
                </button>
              </li>
            ))}
            <li>
              <button className="case" onClick={() => document.getElementById('h-coast')?.scrollIntoView({ block: 'start' })}>
                <strong>Why does Antofagasta's coast behave differently from its interior?</strong>
                <span>The regional mean warms; the coast does not. Relief, distance to the sea and a second reanalysis.</span>
              </button>
            </li>
          </ul>
        </>
      )}

      <h3 id="h-explore-lab" tabIndex={-1}>Explore</h3>
      <div className="lab-controls">
        <label className="field">Phenomenon
          <select value={phen} onChange={(e) => choosePhen(e.target.value)}>
            {Object.entries(PHENOMENA).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
          </select>
        </label>
        <label className="field">Region
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {Object.keys(mv.regions).map((id) => <option key={id} value={id}>{names[id] ?? id}</option>)}
          </select>
        </label>
        <label className="field">Variable 1
          <select value={x} onChange={(e) => setX(e.target.value)}>
            {PHENOMENA[phen].vars.map((id) => <option key={id} value={id} disabled={!avail(id)}>{info[id]?.label ?? id}</option>)}
          </select>
        </label>
        <label className="field">Variable 2
          <select value={y} onChange={(e) => setY(e.target.value)}>
            {PHENOMENA[phen].vars.filter((id) => id !== x).map((id) => <option key={id} value={id} disabled={!avail(id)}>{info[id]?.label ?? id}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">Suggested for “{PHENOMENA[phen].label}”: {PHENOMENA[phen].why} Period: {mv.common_period[0]}–{mv.common_period[1]}, the years all variables share.</p>

      {R && (
        <>
          <TrendRows R={R.series} ids={[x, y]} info={info} />
          <PairChart R={R.series} x={x} y={y} info={info} />
          {assoc ? <AssocPanel a={assoc} x={pairKey![0]} y={pairKey![1]} info={info} /> : (
            <p className="status">Year-to-year association was pre-specified only for: {mv.pairs.map(([a, b]) => `${info[a]?.label} – ${info[b]?.label}`).join('; ')}.</p>
          )}
        </>
      )}

      <h3>Where is the change happening? <span className="tag-exp">descriptive</span></h3>
      <CellMaps geo={geo} t2m={cellsT2m} sm={cellsSm} />

      <h3 id="h-coast">Guided discovery: why does Antofagasta's coast behave differently from its interior? <span className="tag-exp">exploratory</span></h3>
      {terr ? <CoastSteps mv={mv} terr={terr} sst={sst} /> : <CoastPanel mv={mv} />}
    </section>
  );
}

function TrendRows({ R, ids, info }: { R: Record<string, MVSeries>; ids: string[]; info: Record<string, Info> }) {
  return (
    <table className="region-table lab-table">
      <caption>Trend 2000–2024 per variable. q = p adjusted across all new trends (family E1); precipitation and temperature are reference series. Precipitation trends depend strongly on the start year: starting in 2000 instead of 1998 makes many more regions look significant (compare with the main study above, which uses the full record).</caption>
      <thead><tr><th scope="col">Variable</th><th scope="col">Change per decade (95 % CI)</th><th scope="col">p</th><th scope="col">q</th><th scope="col">Robustness</th></tr></thead>
      <tbody>
        {ids.map((id) => {
          const s = R[id];
          if (!s) return <tr key={id}><th scope="row">{info[id]?.label ?? id}</th><td colSpan={4}>not available for this region</td></tr>;
          const t = s.trend;
          return (
            <tr key={id}>
              <th scope="row">{info[id]?.label}{s.negligible ? ' (almost no snow here)' : ''}{s.accumulating ? ' (glacier cells: GLDAS lets snow pile up, so this is not seasonal snow)' : ''}</th>
              <td>{signed(t.slope_per_decade)} {info[id]?.trend_unit} ({num(t.ci_low)} to {num(t.ci_high)})</td>
              <td>{pval(t.p_value)}</td>
              <td>{t.p_adjusted == null ? 'reference' : pval(t.p_adjusted).replace('p', 'q')}</td>
              <td>{VERDICT_SHORT[t.verdict]} · Theil–Sen {signed(t.theil_sen_per_decade)}, MK {pval(t.mk_p_value)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PairChart({ R, x, y, info }: { R: Record<string, MVSeries>; x: string; y: string; info: Record<string, Info> }) {
  const make = useCallback((w: number) => {
    const fig = document.createElement('div');
    for (const [id, color] of [[x, COLOR_A], [y, COLOR_B]] as const) {
      const s = R[id];
      if (!s) continue;
      const rows = s.annual.years.map((yr, i) => ({ date: new Date(Date.UTC(yr, 6, 1)), v: s.annual.anomalies[i] }));
      fig.append(Plot.plot({
        width: w, height: 150, marginLeft: 52, style: { fontSize: '12px', color: INK },
        x: { type: 'utc', label: null }, y: { label: `${info[id]?.label} anomaly (${info[id]?.unit})`, grid: true, nice: true },
        marks: [Plot.ruleY([0], { stroke: '#6b7280' }), Plot.lineY(rows, { x: 'date', y: 'v', stroke: color, strokeWidth: 1.5 }),
          Plot.dot(rows, { x: 'date', y: 'v', fill: color, r: 3 })],
      }));
    }
    return fig;
  }, [R, x, y, info]);
  return <PlotFigure make={make} alt={`Yearly anomalies of ${info[x]?.label} and ${info[y]?.label}, each in its own unit, on the same time axis.`} />;
}

function AssocPanel({ a, x, y, info }: { a: Assoc; x: string; y: string; info: Record<string, Info> }) {
  const make = useCallback((w: number) => {
    const pts = a.years.map((yr, i) => ({ yr, x: a.x_detrended[i], y: a.y_detrended[i] }));
    const lags = Object.entries(a.lag_r_monthly).filter(([, r]) => r != null).map(([k, r]) => ({ k: `${k} mo`, r: r as number }));
    const fig = document.createElement('div');
    fig.className = 'lab-pair';
    fig.append(Plot.plot({
      width: Math.min(w, 360), height: 280, marginLeft: 52, style: { fontSize: '12px', color: INK }, grid: true,
      x: { label: `${info[x]?.label} (${info[x]?.unit}, detrended)` }, y: { label: `${info[y]?.label} (${info[y]?.unit}, detrended)` },
      marks: [Plot.ruleX([0], { stroke: '#9ca3af' }), Plot.ruleY([0], { stroke: '#9ca3af' }),
        Plot.dot(pts, { x: 'x', y: 'y', fill: COLOR_A, r: 4, title: (d: { yr: number }) => String(d.yr) })],
    }));
    fig.append(Plot.plot({
      width: Math.min(w, 260), height: 280, marginLeft: 40, style: { fontSize: '12px', color: INK },
      x: { label: `${info[x]?.label} leads by…`, domain: lags.map((l) => l.k) }, y: { label: 'r (monthly, descriptive)', domain: [-1, 1], grid: true },
      marks: [Plot.ruleY([0]), Plot.barY(lags, { x: 'k', y: 'r', fill: '#6b7280' })],
    }));
    return fig;
  }, [a, x, y, info]);
  if (!a.computable) return <p className="status">Association not computable here (one series does not vary).</p>;
  const sig = (a.p_adjusted ?? 1) < 0.05;
  return (
    <div className="assoc">
      <p className="result-line">
        <strong>Year-to-year association</strong> (both series detrended, so a shared trend cannot create it):
        r = {signed(a.r)} (95 % CI {num(a.ci_low)} to {num(a.ci_high)}), {pval(a.p_value)}, {a.p_adjusted == null ? "" : pval(a.p_adjusted).replace("p", "q")} across all
        associations, from {a.n_years} years (about {Math.round(a.n_eff)} independent). Without detrending: r = {signed(a.r_not_detrended)}.{' '}
        {sig ? 'Unlikely to be chance alone even after the correction — still an association, not a cause.' : 'Not distinguishable from chance after the correction.'}
        {a.negligible_snow ? ' There is almost no snow in this region, so this number means little.' : ''}
      </p>
      <PlotFigure make={make} alt={`Scatter of detrended yearly anomalies, r = ${num(a.r)}; and monthly lag correlations.`} />
    </div>
  );
}

const FRAME = { type: 'MultiPoint', coordinates: [[-76, -17.4], [-66.3, -56]] };

function CellMaps({ geo, t2m, sm }: { geo: Regions | null; t2m: CellMap | null; sm: CellMap | null }) {
  const [which, setWhich] = useState<'t2m' | 'sm'>('sm');
  const m = which === 't2m' ? t2m : sm;
  const make = useCallback((w: number) => {
    if (!m) return document.createElement('div');
    const feats = m.cells.map(([lat, lon, s, , , p]) => ({
      type: 'Feature', properties: { s, p },
      geometry: { type: 'Polygon', coordinates: [[[lon - m.dlon / 2, lat - m.dlat / 2], [lon - m.dlon / 2, lat + m.dlat / 2],
        [lon + m.dlon / 2, lat + m.dlat / 2], [lon + m.dlon / 2, lat - m.dlat / 2], [lon - m.dlon / 2, lat - m.dlat / 2]]] },
    }));
    const lim = Math.max(...m.cells.map((c) => Math.abs(c[2])));
    const temp = m.variable === 't2m';
    const width = Math.min(w, 250);
    return Plot.plot({
      width, height: width * 3.3, projection: { type: 'mercator', domain: FRAME as never },
      color: { type: 'diverging', scheme: temp ? 'RdBu' : 'BrBG', reverse: temp, domain: [-lim, lim], legend: true,
        label: temp ? '°C per decade' : 'mm per decade' },
      marks: [
        Plot.geo(feats, { fill: (d: { properties: { s: number } }) => d.properties.s, stroke: (d: { properties: { p: number } }) => (d.properties.p < 0.05 ? INK : 'none'), strokeWidth: 0.6 }),
        geo ? Plot.geo(geo, { stroke: '#374151', strokeWidth: 0.5, fill: 'none' }) : null,
      ],
    });
  }, [m, geo]);
  return (
    <div className="cellmap">
      <div className="toggle" role="group" aria-label="Map variable">
        <button aria-pressed={which === 'sm'} onClick={() => setWhich('sm')}>Root-zone soil moisture 2000–2024 (GLDAS 0.25°)</button>
        <button aria-pressed={which === 't2m'} onClick={() => setWhich('t2m')}>Air temperature 1980–2025 (MERRA-2 0.5° × 0.625°)</button>
      </div>
      <p className="hint">
        Each square is one native grid cell, drawn at its true size — no interpolation. A dark outline marks cells with nominal p &lt; 0.05;
        neighbouring cells are not independent, so read the pattern, not single cells. {m ? `${m.n_cells} cells.` : ''}
      </p>
      {m ? <PlotFigure make={make} alt={`Map of the trend in each grid cell for ${which === 't2m' ? 'air temperature' : 'root-zone soil moisture'}.`} /> : <p className="status">Loading the cell map…</p>}
    </div>
  );
}

function CoastPanel({ mv }: { mv: MultiVar }) {
  const c = mv.coast_interior;
  const make = useCallback((w: number) => intervals([
    { name: `Coastal cells (${c.n_coastal})`, slope: c.coastal.slope_per_decade, lo: c.coastal.ci_low, hi: c.coastal.ci_high, color: COLOR_A },
    { name: `Interior cells (${c.n_interior})`, slope: c.interior.slope_per_decade, lo: c.interior.ci_low, hi: c.interior.ci_high, color: COLOR_B },
    { name: 'Coastal − interior', slope: c.difference.slope_per_decade, lo: c.difference.ci_low, hi: c.difference.ci_high, color: '#5b21b6' },
    ...(c.point_check?.ERA5 ? [
      { name: 'ERA5 reanalysis, coastal points', slope: c.point_check.ERA5.coastal.slope_per_decade, lo: c.point_check.ERA5.coastal.ci_low, hi: c.point_check.ERA5.coastal.ci_high, color: '#01665e' },
      { name: 'ERA5 reanalysis, interior points', slope: c.point_check.ERA5.interior.slope_per_decade, lo: c.point_check.ERA5.interior.ci_low, hi: c.point_check.ERA5.interior.ci_high, color: '#8c510a' },
    ] : []),
  ], '°C per decade', w), [c]);
  return (
    <div>
      <p>
        The weather station at Antofagasta (on the coast) shows no warming, while the regional mean of MERRA-2 does. Is the coast
        different from the desert interior? Cells were classified in QGIS: {c.rule}.
      </p>
      <PlotFigure make={make} alt="Trend of coastal cells, interior cells and their difference, with 95 % intervals." />
      <p className="result-line">
        Difference coastal − interior: {signed(c.difference.slope_per_decade)} °C per decade (95 % CI {num(c.difference.ci_low)} to{' '}
        {num(c.difference.ci_high)}), {pval(c.difference.p_value)} — {c.differs ? 'the two parts of the region warmed at different rates in MERRA-2.' : 'MERRA-2 cannot tell the two parts apart.'}{' '}
        A coastal MERRA-2 cell is still about 50 km wide and mixes ocean and land, so it is not the same as a coastal station.
      </p>
    </div>
  );
}

function CoastSteps({ mv, terr, sst }: { mv: MultiVar; terr: Territory; sst?: SST | null }) {
  const A = terr.antofagasta;
  const { t1, context } = A;
  const reg = context.regional;
  const st = context.station;
  const rho = (k: string) => (A.t2[k] as { rho: number }).rho;
  const part = (k: string) => A.t2[k] as number;
  const np = t1.nearest_elevation_pairs;
  const ci = (t: { slope_per_decade: number; ci_low: number; ci_high: number }) => `${signed(t.slope_per_decade)} °C per decade (95 % CI ${num(t.ci_low)} to ${num(t.ci_high)})`;
  const scatter = useCallback((w: number) => {
    const fig = document.createElement('div');
    fig.className = 'lab-pair';
    const rows = A.cells.map((c) => ({ ...c, cls: c.coastal_e3 === 1 ? 'coastal cell' : 'interior cell' }));
    for (const [key, lab] of [['elevation_mean', 'Mean elevation of the cell (m, CIREN DEM)'], ['distance_to_coast_km', 'Distance from cell centre to the coast (km)']] as const) {
      fig.append(Plot.plot({
        width: Math.min(w, 340), height: 260, marginLeft: 48, grid: true, style: { fontSize: '12px', color: INK },
        x: { label: lab }, y: { label: 'Trend (°C per decade)' },
        color: { domain: ['coastal cell', 'interior cell'], range: [COLOR_A, COLOR_B], legend: key === 'elevation_mean' },
        symbol: { domain: ['coastal cell', 'interior cell'], range: ['square', 'circle'] },
        marks: [Plot.ruleY([0], { stroke: '#6b7280' }),
          Plot.ruleX(rows, { x: key, y1: 'slope_ci_lower', y2: 'slope_ci_upper', stroke: 'cls', strokeOpacity: 0.35 }),
          Plot.dot(rows, { x: key, y: 'slope_per_decade', fill: 'cls', symbol: 'cls', r: 4 })],
      }));
    }
    return fig;
  }, [A]);
  return (
    <ol className="steps">
      <li><h4>Regional mean</h4>
        <p>The whole Antofagasta region (MERRA-2, 1980–2025): {ci(reg)}, {pval(reg.p_value)}.</p></li>
      <li><h4>The problem</h4>
        <p>{st.source}: {ci(st.station)}, {pval(st.station.p_value)}. On the same months, the regional mean gives {ci(st.ours_same_months)}.
          The coastal station does not show the regional warming.</p></li>
      <li><h4>Split the region</h4><CoastPanel mv={mv} /></li>
      <li><h4>Territorial context</h4>
        <p>Each MERRA-2 cell (about 50 km) was described in QGIS with a 12.5 m elevation model (CIREN; statistics only) and its distance to
          the coastline. The relief describes the cells; the climate data cannot resolve anything smaller.</p>
        <figure className="map-figure">
          <img src={`${import.meta.env.BASE_URL}img/antofagasta_territorial.png`} loading="lazy" width={620}
            alt="Map of Antofagasta: shaded relief with the MERRA-2 cells coloured by their warming trend; coastal cells outlined in black." />
          <figcaption>Exported from the project's QGIS workflow (qgis/scripts/export_territorial_maps.py). Terrain context:{' '}
            <a href="https://geoportal.cl/geoportal/catalog/35426/DEM%20Alos%20Palsar%20Regi%C3%B3n%20de%20Antofagasta">CIREN DEM ALOS PALSAR</a> (ASF ALOS
            PALSAR RTC-derived; 12.5 m pixel spacing, not 12.5 m climate data). Climate trends: NASA MERRA-2 via Giovanni. Provenance:{' '}
            <a href="https://github.com/GiuseppePrbst/trend-detective-lab/blob/main/docs/gis/DATA_LICENSES.md">DATA_LICENSES.md</a>.</figcaption>
        </figure>
        <PlotFigure make={scatter} alt="Each cell's warming trend against its mean elevation and against its distance to the coast." /></li>
      <li><h4>External check</h4>
        <p>ERA5, another reanalysis, shows the same contrast at the same points (rows in step 3). ERA5 and MERRA-2 share many assimilated
          observations, so this is supporting, not fully independent, evidence. The station sits with the coastal cells.</p>
        {sst && <SSTPanel sst={sst} />}</li>
      <li><h4>Sensitivity</h4>
        <ul>
          <li><strong>Elevation-range-restricted comparison</strong> (interior cells inside the coastal elevation range; {t1.n_matched} cells averaging
            {' '}{Math.round(t1.matched_mean_elevation)} m vs {Math.round(t1.coastal_mean_elevation)} m on the coast — not the same height): coast − interior {ci(t1.difference)}.</li>
          <li><strong>Nearest-elevation pairs</strong> ({np.n_pairs} pairs; elevation gaps up to {Math.round(np.max_abs_elevation_gap_m)} m): {ci(np.difference)}.</li>
          <li><strong>Definition of "coastal"</strong>: {A.t3.map((r) => `${r.rule}: ${signed(r.difference.slope_per_decade)}`).join('; ')} °C per decade.</li>
          <li>Coast and altitude go together (ρ = {signed(rho('elevation_vs_distance'))}). Ranking the trend against distance after removing elevation leaves
            {' '}{signed(part('partial_trend_distance_given_elevation'))}; elevation after removing distance, {signed(part('partial_trend_elevation_given_distance'))} (descriptive; neighbouring cells are not independent).</li>
        </ul></li>
      <li><h4>Interpretation</h4>
        <p>The regional average hides an important spatial difference: in two reanalyses the coastal cells did not warm while the interior did,
          and the coastal station agrees. This does not prove the cause. A cool, ocean-influenced coast is a plausible explanation (a related
          coast–inland contrast was reported for 1979–2006 by Falvey and Garreaud, doi:10.1029/2008JD010519), but our analysis does not test it.</p></li>
    </ol>
  );
}

function SSTPanel({ sst }: { sst: SST }) {
  const rows: Interval[] = [
    ...Object.values(sst.series).map((s, i) => ({ name: s.label, slope: s.trend.slope_per_decade, lo: s.trend.ci_low, hi: s.trend.ci_high, color: i ? '#6b7280' : '#01665e' })),
    { name: sst.air_coastal.label, slope: sst.air_coastal.trend.slope_per_decade, lo: sst.air_coastal.trend.ci_low, hi: sst.air_coastal.trend.ci_high, color: COLOR_A },
    { name: sst.air_interior.label, slope: sst.air_interior.trend.slope_per_decade, lo: sst.air_interior.trend.ci_low, hi: sst.air_interior.trend.ci_high, color: COLOR_B },
  ];
  const make = useCallback((w: number) => intervals(rows, '°C per decade', w), [rows]);
  return (
    <div>
      <h5>The ocean next to the coast ({sst.period[0]}–{sst.period[1]}) <span className="tag-exp">exploratory, registered before computing</span></h5>
      <p>Sea-surface temperature averaged by NASA Giovanni over the ocean within ~100 km of the coast (box {sst.box}), compared with the
        MERRA-2 air temperature of the coastal and interior cells over the same years. MODIS-Aqua is an independent satellite
        observation; MERRA-2's sea surface is a boundary condition it shares with its own air temperature.</p>
      <PlotFigure make={make} alt="Trends of sea-surface temperature and of coastal and interior air temperature over the same years." />
      <p className="hint">Different variables (water skin vs air at 2 m) and a shorter period than the main analysis: compare directions and sizes, not as proof of a cause.</p>
    </div>
  );
}

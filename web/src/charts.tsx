// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// Chart rendering with Observable Plot. Charts draw pipeline numbers; they compute no statistics.
import * as Plot from '@observablehq/plot';
import { useEffect, useRef, useState } from 'react';
import { monthDate, num } from './format';
import type { RegionSeries, Trend } from './types';

export const COLOR_A = '#0b5fa5';
export const COLOR_B = '#b8470b';
const INK = '#1f2937';

/** Renders a Plot element sized to its container. `alt` is the text alternative for screen readers. */
export function PlotFigure({ make, alt }: { make: (width: number) => Element; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (width) ref.current!.replaceChildren(make(width));
  }, [make, width]);
  return <div className="plot" ref={ref} role="img" aria-label={alt} />;
}

const fracYear = (d: string) => +d.slice(0, 4) + (+d.slice(5, 7) - 0.5) / 12;

const yearDate = (f: number) => new Date(Date.UTC(Math.floor(f), 0, 1) + (f - Math.floor(f)) * 365.25 * 864e5);

/**
 * Trend line and its 95 % band, both drawn from the pipeline's slope and CI bounds:
 * value = slope × (t − t_mid), pivoting at the middle of the analysed period (anomalies average ≈ 0).
 */
export function trendGeometry(t: Trend) {
  const mid = (fracYear(t.start) + fracYear(t.end)) / 2;
  return [fracYear(t.start), mid, fracYear(t.end)].map((f) => ({
    date: yearDate(f),
    y: (t.slope_per_decade / 10) * (f - mid),
    lo: (t.ci_low / 10) * (f - mid),
    hi: (t.ci_high / 10) * (f - mid),
  }));
}

export function timeline(
  rs: RegionSeries,
  mode: 'values' | 'anomalies',
  unit: string,
  width: number,
  opts: { color?: string; dash?: string; yDomain?: [number, number]; height?: number } = {},
) {
  const ys = mode === 'values' ? rs.values : rs.anomalies;
  const rows = rs.dates.map((d, i) => ({ date: monthDate(d), y: ys[i] }));
  const anom = mode === 'anomalies';
  const color = opts.color ?? INK;
  const annual = (rs.annual?.years ?? []).map((y, i) => ({ date: new Date(Date.UTC(y, 6, 1)), y: rs.annual!.anomalies[i] }));
  const geom = anom ? trendGeometry(rs.trend) : [];
  return Plot.plot({
    width,
    height: opts.height ?? 300,
    marginLeft: 48,
    style: { fontSize: '12px', color: INK },
    x: { type: 'utc', label: null },
    y: {
      label: anom ? `Anomaly (${unit})` : `Monthly value (${unit})`,
      grid: true,
      domain: opts.yDomain,
      nice: !opts.yDomain,
    },
    marks: [
      anom ? Plot.areaY(geom, { x: 'date', y1: 'lo', y2: 'hi', fill: color, fillOpacity: 0.16 }) : null,
      anom ? Plot.ruleY([0], { stroke: '#6b7280' }) : null,
      Plot.lineY(rows, { x: 'date', y: 'y', stroke: anom ? '#a3abb8' : '#6b7280', strokeWidth: 1 }),
      anom ? Plot.lineY(annual, { x: 'date', y: 'y', stroke: color, strokeWidth: 1.5, strokeDasharray: opts.dash }) : null,
      anom ? Plot.dot(annual, { x: 'date', y: 'y', fill: color, stroke: '#fff', r: 3.5 }) : null,
      anom ? Plot.lineY(geom, { x: 'date', y: 'y', stroke: color, strokeWidth: 3 }) : null,
    ],
  });
}

export interface Interval {
  name: string;
  slope: number;
  lo: number;
  hi: number;
  color: string;
}

/** Dot-and-interval chart: every row shares ONE x-axis, with a vertical zero line. */
export function intervals(rows: Interval[], unit: string, width: number) {
  const label = (r: Interval) => `${r.name}: ${num(r.slope)} (${num(r.lo)} to ${num(r.hi)})`;
  const narrow = width < 520;   // phones: wrap long labels instead of letting them run off the chart
  return Plot.plot({
    width,
    height: 50 + rows.length * (narrow ? 74 : 58),
    marginTop: 34,
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 46,
    style: { fontSize: '12px', color: INK },
    x: { label: `Change (${unit}) with 95 % confidence interval`, labelAnchor: 'center', labelArrow: 'none', labelOffset: 40, grid: true, nice: true },
    y: { axis: null, domain: rows.map((r) => r.name), padding: 0.1 },
    marks: [
      Plot.ruleX([0], { stroke: INK, strokeWidth: 1.5 }),
      Plot.ruleY(rows, { y: 'name', x1: 'lo', x2: 'hi', stroke: 'color', strokeWidth: 3 }),
      Plot.dot(rows, { y: 'name', x: 'slope', fill: 'color', r: 6 }),
      Plot.text(rows, { y: 'name', text: label, frameAnchor: 'left', textAnchor: 'start', dy: narrow ? -22 : -16, lineWidth: narrow ? Math.floor(width / 7.5 / 1.0 / 1.4) : undefined, fontSize: narrow ? 11 : 12, fontWeight: 600, fill: INK, stroke: '#fff', strokeWidth: 4, paintOrder: 'stroke' }),
    ],
  });
}

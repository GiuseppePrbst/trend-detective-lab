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

/** Two points of the trend line: slope × (t − t_mid), anchored at the middle of the analysed period. */
export function trendLine(t: Trend) {
  const mid = (fracYear(t.start) + fracYear(t.end)) / 2;
  return [t.start, t.end].map((d) => ({ date: monthDate(d), y: (t.slope_per_decade / 10) * (fracYear(d) - mid) }));
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
  return Plot.plot({
    width,
    height: opts.height ?? 280,
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
      anom ? Plot.ruleY([0], { stroke: '#6b7280' }) : null,
      Plot.lineY(rows, {
        x: 'date',
        y: 'y',
        stroke: opts.color ?? '#6b7280',
        strokeWidth: 1,
        strokeDasharray: opts.dash,
      }),
      anom ? Plot.lineY(trendLine(rs.trend), { x: 'date', y: 'y', stroke: opts.color ?? INK, strokeWidth: 3 }) : null,
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

/** Dot-and-interval chart: each slope with its 95 % confidence interval. */
export function intervals(rows: Interval[], unit: string, width: number) {
  return Plot.plot({
    width,
    height: 50 + rows.length * 44,
    marginLeft: Math.min(200, width / 3),
    style: { fontSize: '12px', color: INK },
    x: { label: `Change (${unit}), 95 % confidence interval`, grid: true, nice: true },
    y: { label: null, domain: rows.map((r) => r.name) },
    marks: [
      Plot.ruleX([0], { stroke: '#6b7280' }),
      Plot.ruleY(rows, { y: 'name', x1: 'lo', x2: 'hi', stroke: 'color', strokeWidth: 3 }),
      Plot.dot(rows, { y: 'name', x: 'slope', fill: 'color', r: 6 }),
      Plot.text(rows, { y: 'name', x: 'slope', text: (r: Interval) => num(r.slope), dy: -14 }),
    ],
  });
}

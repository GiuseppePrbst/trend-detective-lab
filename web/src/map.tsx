// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
// SVG map of Chile's regions, coloured by the trend slope written by the pipeline.
import * as Plot from '@observablehq/plot';
import { geoArea, geoMercator, geoPath } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { useEffect, useMemo, useRef } from 'react';
import { MAP_STATUS, mapStatus, num } from './format';
import type { Regions, Trend, VariableInfo } from './types';

/** d3-geo expects clockwise outer rings; GeoJSON (RFC 7946) is counter-clockwise. Flip polygons that cover > half the globe. */
export function rewind(fc: Regions): Regions {
  const fix = (rings: Position[][]) =>
    geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI ? rings.map((r) => [...r].reverse()) : rings;
  return {
    ...fc,
    features: fc.features.map((f) => {
      const g = f.geometry as Polygon | MultiPolygon;
      const geometry =
        g.type === 'Polygon'
          ? { ...g, coordinates: fix(g.coordinates) }
          : { ...g, coordinates: g.coordinates.map(fix) };
      return { ...f, geometry };
    }),
  };
}

// Mainland Chile only: Easter Island, Juan Fernández and Antarctic claims would shrink the mainland to a sliver.
const FRAME = { type: 'MultiPoint', coordinates: [[-76, -17.4], [-66.3, -56]] } as const;
const W = 200;

export function colorScale(v: VariableInfo, trends: Record<string, Trend>) {
  const m = Math.max(...Object.values(trends).map((t) => Math.abs(t.slope_per_decade)), 0) || 1;
  const precip = v.id === 'precip' || v.nature === 'satellite_gauge';
  return {
    type: 'diverging' as const,
    scheme: precip ? ('BrBG' as const) : ('RdBu' as const),
    reverse: !precip, // temperature: warming = red
    domain: [-m, m],
    pivot: 0,
    label: v.trend_unit,
  };
}

export function ChileMap(props: {
  geo: Regions;
  v: VariableInfo;
  trends: Record<string, Trend>;
  a: string;
  b: string;
  alpha: number;
  onSelect: (id: string) => void;
}) {
  const { geo, v, trends, a, b, alpha, onSelect } = props;
  const { path, height } = useMemo(() => {
    const proj = geoMercator().fitWidth(W, FRAME as never);
    const h = Math.ceil(geoPath(proj).bounds(FRAME as never)[1][1]);
    proj.clipExtent([[0, 0], [W, h]]);
    return { path: geoPath(proj), height: h };
  }, []);
  const scale = useMemo(() => colorScale(v, trends), [v, trends]);
  const color = useMemo(() => Plot.scale({ color: scale }), [scale]);

  const legendRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    legendRef.current?.replaceChildren(Plot.legend({ color: { ...scale, label: v.trend_unit }, width: 240, ticks: 4 }));
  }, [scale, v.trend_unit]);

  const status = (t: Trend) => mapStatus(t, alpha);
  const fill = (t: Trend | undefined) =>
    !t ? '#ffffff' : status(t) === 'ns' ? 'url(#hatch-ns)' : String(color.apply(t.slope_per_decade));

  return (
    <div className="map">
      <svg viewBox={`0 0 ${W} ${height}`} className="map-svg" aria-label="Map of Chile's regions">
        <defs>
          <pattern id="hatch-ns" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="#e5e7eb" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="#6b7280" strokeWidth="1.5" />
          </pattern>
          <pattern id="dots-md" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#ffffff" />
          </pattern>
        </defs>
        {geo.features.map((f: Feature) => {
          const id = String(f.properties?.id);
          const name = String(f.properties?.name ?? id);
          const t = trends[id];
          const d = path(f) ?? '';
          const label = t
            ? `${name}: ${num(t.slope_per_decade)} ${v.trend_unit}, ${MAP_STATUS[status(t)]}`
            : `${name}: not available yet`;
          const sel = id === a ? ' is-a' : id === b ? ' is-b' : '';
          return (
            <g key={id}>
              <path
                d={d}
                fill={fill(t)}
                className={`region${sel}${t ? '' : ' no-data'}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={id === a}
                onClick={() => onSelect(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(id);
                  }
                }}
              >
                <title>{label}</title>
              </path>
              {t && status(t) === 'unadjusted' &&<path d={d} fill="url(#dots-md)" pointerEvents="none" />}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <div ref={legendRef} />
        <ul className="legend-keys">
          <li><svg width="22" height="14" aria-hidden="true"><rect width="22" height="14" fill="#c9372c" stroke="#374151" /></svg> Solid colour: {MAP_STATUS.fdr}</li>
          <li><svg width="22" height="14" aria-hidden="true"><rect width="22" height="14" fill="#c9372c" /><rect width="22" height="14" fill="url(#dots-md)" stroke="#374151" /></svg> Colour with white dots: {MAP_STATUS.unadjusted}</li>
          <li><svg width="22" height="14" aria-hidden="true"><rect width="22" height="14" fill="url(#hatch-ns)" stroke="#374151" /></svg> Grey hatched: {MAP_STATUS.ns}</li>
          <li><svg width="22" height="14" aria-hidden="true"><rect width="22" height="14" fill="#fff" stroke="#374151" strokeDasharray="2 2" /></svg> White: not available yet</li>
          <li><svg width="22" height="14" aria-hidden="true"><rect x="1.5" y="1.5" width="19" height="11" fill="none" stroke="#111827" strokeWidth="3" /></svg> Thick outline: region A; dashed: region B</li>
        </ul>
      </div>
    </div>
  );
}

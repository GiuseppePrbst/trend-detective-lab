// Frontend unit tests (vitest): film timeline, flights, extremes, studies. They read the published files, not fixtures.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHART, DEST, flightPose, PERIOD_A, PERIOD_B, PERIOD_SWAP, planFlight, poseAt, SHOTS, stateAt, terrainAlpha, TITLE, TOTAL, WHOLE_EARTH } from './cinematic/timeline';
import type { Scene } from './engine/terrain';
import { toUV } from './engine/geo';
import { createTrendScale } from './engine/scale';
import { colourDomain, inside } from './engine/terrain';
import { extremesOf, kmBetween, sstLines, visibleCellAt } from './experiences/pure';
import { STUDIES } from './experiences/studies';

const json = <T,>(p: string) => JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf-8')) as T;
const scenes = { antofagasta: json<Scene>('scene3d/antofagasta/scene.json'), los_lagos: json<Scene>('scene3d/los_lagos/scene.json') };
const atlas = json<{ cells: Record<string, unknown[]>; places: { name: string; lon: number; lat: number; kind: string; scene: string }[]; series: { antofagasta: { years: number[]; coastal: number[]; interior: number[] } } }>('data/atlas.json');
const catalog = json<{ regions: { id: string }[] }>('data/catalog.json');

describe('picking on the relief follows the clipped footprints', () => {
  for (const id of ['antofagasta', 'los_lagos'] as const) it(`${id}: a click opens a cell only where that cell is drawn`, () => {
    const sc = scenes[id];
    const clip = (atlas.cells[id] as [number, number][][][][]).map((polys) => polys.map((rings) => rings.map((r) => r.map(([lo, la]) => toUV(sc, lo, la)))));
    let hidden = 0, shown = 0;
    sc.cells.forEach((c, i) => {
      const us = c.uv.map((p) => p[0]), vs = c.uv.map((p) => p[1]);
      for (let a = 0.05; a < 1; a += 0.1) for (let b = 0.05; b < 1; b += 0.1) {
        const q: [number, number] = [Math.min(...us) + a * (Math.max(...us) - Math.min(...us)), Math.min(...vs) + b * (Math.max(...vs) - Math.min(...vs))];
        if (!inside(q, c.uv)) continue;
        const k = visibleCellAt(q, clip);
        if (k === -1) hidden++;                                      // inside the native box, outside every drawn footprint: nothing opens
        else { shown++; expect(inside(q, sc.cells[k].uv)).toBe(true); } // what opens is the cell whose native box holds the point
        if (k === i) expect(clip[i].some(([o]) => inside(q, o))).toBe(true);
      }
    });
    expect(hidden).toBeGreaterThan(0);                               // the native boxes do reach off the region: the old test would have opened them
    expect(shown).toBeGreaterThan(hidden);
  });
});

describe('SST study area', () => {
  const sst = json<{ box: string; period: number[]; series: { mur_sst: { trend: { slope_per_decade: number; ci_low: number; ci_high: number; p_value: number; start: string; end: string } } } }>('data/sst.json');
  const sea = (atlas as unknown as { sst_sea: [number, number][][][] }).sst_sea;
  it('the outline lies inside the published box and on the sea only', () => {
    const [x0, y0, x1, y1] = sst.box.split(',').map(Number);
    for (const [lo, la] of sea.flat(2)) { expect(lo).toBeGreaterThanOrEqual(x0 - 1e-9); expect(lo).toBeLessThanOrEqual(x1 + 1e-9); expect(la).toBeGreaterThanOrEqual(y0 - 1e-9); expect(la).toBeLessThanOrEqual(y1 + 1e-9); }
    expect(visibleCellAt([-71.3, -24.0], [sea])).toBe(0);               // open Pacific inside the box
    for (const p of atlas.places.filter((q) => q.scene === 'antofagasta' && q.lon >= x0 && q.lon <= x1))
      expect(visibleCellAt([p.lon, p.lat], [sea])).toBe(-1);            // towns on the coast are land, not SST
    expect(visibleCellAt([-70.0, -24.0], [sea])).toBe(-1);              // inland
  });
  it('its card repeats sst.json and says it is one area average, not a map', () => {
    const t = sst.series.mur_sst.trend, l = sstLines(t, 'not significant');
    expect(l[0]).toBe(`${t.slope_per_decade < 0 ? '−' : '+'}${Math.abs(t.slope_per_decade).toFixed(2)} °C per decade (2003–2025)`);
    expect(l[1]).toContain(`p = ${t.p_value.toFixed(3)}`);
    expect(l[1]).toContain(`${t.ci_low < 0 ? '−' : '+'}${Math.abs(t.ci_low).toFixed(2)} to +${t.ci_high.toFixed(2)}`);
    expect(l[2]).toMatch(/not a spatial temperature map/);
    expect(sst.period).toEqual([2003, 2025]);
  });
});

describe('cell colour scales', () => {
  const vals = (id: 'antofagasta' | 'los_lagos', p: string) => scenes[id].cells.flatMap((c) => (c.trends[p] ? [c.trends[p].slope] : []));
  const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const D = colourDomain(scenes.antofagasta, 'antofagasta');
  it('Antofagasta 2003–2025, spatial: all positive → warm sequential from the real min to the real max', () => {
    const v = vals('antofagasta', '2003-2025'), s = createTrendScale(v, 'antofagasta', 'spatial', D, 3);
    expect(s.kind).toBe('sequential-positive');
    expect(s.lo).toBe(Math.min(...v)); expect(s.hi).toBe(Math.max(...v));
    expect(s.lo).toBeCloseTo(0.12, 1); expect(s.hi).toBeCloseTo(0.64, 1);
    expect(s.colour(s.lo)).not.toBe('#f7f7f7');                          // the smallest warming is not drawn as zero
    const sorted = [...v].sort((a, b) => a - b).map(s.colour).map(lum);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]).toBeLessThanOrEqual(sorted[i - 1] + 1e-9);   // larger trend → darker, never the reverse
    expect(lum(s.colour(s.lo)) - lum(s.colour(s.hi))).toBeGreaterThan(150);   // the contrast the fixed scale lacked
    const f = createTrendScale(v, 'antofagasta', 'fixed', D, 3);
    expect(lum(f.colour(Math.min(...v))) - lum(f.colour(Math.max(...v)))).toBeLessThan(lum(s.colour(s.lo)) - lum(s.colour(s.hi)));
    expect(s.warning).toMatch(/not directly comparable between periods/);
  });
  it('fixed: one symmetric domain for every window, white at zero, sign preserved', () => {
    const fs = ['1980-2025', '1980-2002', '2003-2025'].map((p) => createTrendScale(vals('antofagasta', p), 'antofagasta', 'fixed', D, 3));
    for (const f of fs) { expect([f.lo, f.hi]).toEqual([-D, D]); expect(f.colour(0)).toBe('#f7f7f7'); expect(f.warning).toBeNull(); expect(f.note).toMatch(/directly comparable/); }
    expect(fs[0].colour(0.3)).toBe(fs[2].colour(0.3));
    expect(parseInt(fs[0].colour(0.3).slice(1, 3), 16)).toBeGreaterThan(parseInt(fs[0].colour(0.3).slice(5, 7), 16));    // warming is red
    expect(parseInt(fs[0].colour(-0.3).slice(5, 7), 16)).toBeGreaterThan(parseInt(fs[0].colour(-0.3).slice(1, 3), 16));  // cooling is blue
  });
  it('spatial with both signs (Antofagasta 1980–2025) is diverging around zero; no data is never zero', () => {
    const v = vals('antofagasta', '1980-2025'), s = createTrendScale(v, 'antofagasta', 'spatial', D, 3);
    expect(Math.min(...v)).toBeLessThan(0); expect(s.kind).toBe('diverging');
    expect(s.colour(0)).toBe('#f7f7f7'); expect(s.hi).toBe(-s.lo); expect(s.hi).toBe(Math.max(...v.map(Math.abs)));
    expect(createTrendScale([NaN, ...v], 'antofagasta', 'spatial', D, 3).key).toBe(s.key);
  });
  it('soil moisture (Los Lagos) keeps its own palette and unit domain; one window → no between-period warning', () => {
    const v = vals('los_lagos', '2000-2024'), s = createTrendScale(v, 'los_lagos', 'spatial', colourDomain(scenes.los_lagos, 'los_lagos'), 1);
    expect(s.lo).toBeLessThanOrEqual(Math.min(...v)); expect(s.hi).toBeGreaterThanOrEqual(Math.max(...v));
    expect(s.warning).toBeNull();
    expect(createTrendScale(v, 'los_lagos', 'fixed', 50, 1).colour(0)).toBe('#f5f5f5');   // BrBG neutral, not the temperature palette
  });
  it('a near-uniform field is not stretched beyond the minimum span', () => {
    const s = createTrendScale([0.30, 0.31], 'antofagasta', 'spatial', D, 3);
    expect(s.hi - s.lo).toBeCloseTo(0.1, 9); expect(s.kind).toBe('sequential-positive');
  });
});

describe('film timeline', () => {
  it('lasts 30 s and is a pure function of time', () => {
    expect(TOTAL).toBe(30);
    for (const t of [0, 4, 12.5, 22, 29.99, 30]) expect(stateAt(t)).toEqual(stateAt(t));
    expect(stateAt(99)).toEqual(stateAt(TOTAL));
  });
  it('ends exactly on the interactive pose of Antofagasta (hand-off)', () => {
    const end = poseAt(TOTAL);
    (Object.keys(end) as (keyof typeof end)[]).forEach((k) => expect(end[k]).toBeCloseTo(DEST.antofagasta[k], 6));
    expect(stateAt(TOTAL).ui).toBe(1);
    expect(stateAt(TOTAL).period).toBe(PERIOD_B);
  });
  it('keeps the approved camera: start on the whole Earth, no jump between frames, range never increases', () => {
    let prev = poseAt(0);
    (Object.keys(prev) as (keyof typeof prev)[]).forEach((k) => expect(prev[k]).toBeCloseTo(WHOLE_EARTH[k], 6));
    for (let f = 1; f <= TOTAL * 30; f++) {
      const p = poseAt(f / 30);
      expect(p.range).toBeLessThanOrEqual(prev.range + 1e-6);
      expect(kmBetween(prev, p)).toBeLessThan(120);
      expect(Math.abs(p.heading - prev.heading)).toBeLessThan(1);
      prev = p;
    }
  });
  it('shows the two computed windows and nothing in between', () => {
    expect(stateAt(PERIOD_SWAP - 0.01).period).toBe(PERIOD_A);
    expect(stateAt(PERIOD_SWAP).period).toBe(PERIOD_B);
    expect(stateAt(PERIOD_SWAP).cellFade).toBe(0);          // the change of window is a dip to nothing, never a blend of two results
  });
  it('draws the yearly chart inside the scientific shots, before the title', () => {
    expect(CHART.in).toBeGreaterThanOrEqual(SHOTS[3].t0);
    expect(CHART.draw[1]).toBeLessThan(PERIOD_SWAP);        // the whole record is on screen before the recent window is highlighted
    expect(CHART.out + 0.5).toBeLessThanOrEqual(TITLE[0]);
  });
  it('has one published value per year to draw', () => {
    const s = atlas.series.antofagasta;
    expect(s.years).toHaveLength(46);
    expect(s.years[0]).toBe(1980); expect(s.years[45]).toBe(2025);
    for (const v of [...s.coastal, ...s.interior]) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('flights between territories', () => {
  const km = kmBetween(DEST.antofagasta, DEST.los_lagos);
  const f = planFlight(DEST.antofagasta, DEST.los_lagos, km);
  it('starts and ends on the two poses', () => {
    expect(flightPose(f, 0).lat).toBeCloseTo(DEST.antofagasta.lat, 6);
    const end = flightPose(f, 1);
    (Object.keys(end) as (keyof typeof end)[]).forEach((k) => expect(end[k]).toBeCloseTo(DEST.los_lagos[k], 6));
  });
  it('rises until neither relief is on screen, then descends', () => {
    expect(km).toBeGreaterThan(1500);
    expect(terrainAlpha(flightPose(f, 0.5).range)).toBe(0);
    expect(flightPose(f, 0.5).range).toBeGreaterThan(Math.max(DEST.antofagasta.range, DEST.los_lagos.range));
  });
  it('travels south along the ground without jumps and the same k gives the same pose', () => {
    let prev = flightPose(f, 0);
    for (let i = 1; i <= 200; i++) {
      const p = flightPose(f, i / 200);
      expect(p.lat).toBeLessThanOrEqual(prev.lat + 1e-9);
      expect(kmBetween(prev, p)).toBeLessThan(40);
      expect(Object.values(p).every(Number.isFinite)).toBe(true);
      prev = p;
    }
    expect(flightPose(f, 0.37)).toEqual(flightPose(f, 0.37));
  });
  it('is instant with reduced motion and symmetric the other way', () => {
    expect(planFlight(DEST.antofagasta, DEST.los_lagos, km, true).dur).toBe(0);
    const back = planFlight(DEST.los_lagos, DEST.antofagasta, km);
    expect(back.lift).toBeGreaterThan(0);
    expect(back.dur).toBe(f.dur);
  });
  it('does not rise for a short hop', () => {
    expect(planFlight(WHOLE_EARTH, DEST.antofagasta, kmBetween(WHOLE_EARTH, DEST.antofagasta)).lift).toBe(0);
  });
});

describe('highest and lowest cell trend', () => {
  for (const [id, periods] of [['antofagasta', ['1980-2025', '1980-2002', '2003-2025']], ['los_lagos', ['2000-2024']]] as const) {
    for (const per of periods) it(`${id} ${per}: equals the ordering of the published slopes`, () => {
      const cells = scenes[id].cells, sorted = cells.map((c) => c.trends[per]?.slope).filter((x): x is number => Number.isFinite(x)).sort((a, b) => a - b);
      const e = extremesOf(cells, per)!;
      expect(e.min.slope).toBe(sorted[0]);
      expect(e.max.slope).toBe(sorted[sorted.length - 1]);
      expect(cells[e.max.i].trends[per].slope).toBe(e.max.slope);
      expect(cells[e.min.i].lat).toBe(e.min.lat);
    });
  }
  it('skips cells without a value instead of reading them as zero', () => {
    const cells = [{ lat: 0, lon: 0, trends: {}, uv: [] }, { lat: 1, lon: 1, trends: { p: { slope: 2, ci_low: 1, ci_high: 3, p: 0.01 } }, uv: [] }] as unknown as Scene['cells'];
    expect(extremesOf(cells, 'p')).toEqual({ max: { i: 1, slope: 2, lat: 1, lon: 1, p: 0.01 }, min: { i: 1, slope: 2, lat: 1, lon: 1, p: 0.01 } });
    expect(extremesOf(cells, 'none')).toBeNull();
  });
});

describe('atlas content', () => {
  it('has a clipped footprint for every cell of both scenes', () => {
    expect(atlas.cells.antofagasta).toHaveLength(scenes.antofagasta.cells.length);
    expect(atlas.cells.los_lagos).toHaveLength(scenes.los_lagos.cells.length);
  });
  it('lists 16 regions and every study flies to a real destination and links to the Research Lab', () => {
    expect(catalog.regions).toHaveLength(16);
    const ok = new Set([...catalog.regions.map((r) => r.id), 'antofagasta', 'los_lagos']);
    for (const s of STUDIES) {
      expect(ok.has(s.fly)).toBe(true);
      expect(s.lab.startsWith('?view=lab')).toBe(true);
      expect(['Study area', 'Regional anchor']).toContain(s.kind);
      expect(s.limit.length).toBeGreaterThan(20);
    }
  });
  it('marks towns and landmarks apart', () => {
    expect(atlas.places.filter((p) => p.kind === 'landmark').map((p) => p.name).sort()).toEqual(['Lago Llanquihue', 'Llullaillaco', 'Volcán Osorno']);
    expect(atlas.places.filter((p) => p.kind === 'city')).toHaveLength(9);
  });
});

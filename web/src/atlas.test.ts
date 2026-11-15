// Frontend unit tests (vitest): film timeline, flights, extremes, studies. They read the published files, not fixtures.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CHART, DEST, flightPose, PERIOD_A, PERIOD_B, PERIOD_SWAP, planFlight, poseAt, SHOTS, stateAt, terrainAlpha, TITLE, TOTAL, WHOLE_EARTH } from './cinematic/timeline';
import type { Scene } from './engine/terrain';
import { toUV } from './engine/geo';
import { inside } from './engine/terrain';
import { extremesOf, kmBetween, visibleCellAt } from './experiences/pure';
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

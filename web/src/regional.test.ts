// Regional layers of the Earth Atlas: six variables × 16 regions read from two result shapes, checked against the published files.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ramp } from './engine/terrain';
import { domain, drawn, fills, fromConfirmatory, fromMultivar, LAYERS, type RegionalView } from './experiences/regional';

const json = (p: string) => JSON.parse(readFileSync(new URL(`../public/data/${p}`, import.meta.url), 'utf-8'));
const cat = json('catalog.json'), multivar = json('multivar.json');
const views: RegionalView[] = LAYERS.map((l) => (l.source === 'confirmatory' ? fromConfirmatory(l.id as 't2m', json(`${l.id}.json`), cat) : fromMultivar(l.id as 'swe', multivar)));
const regionIds: string[] = cat.regions.map((r: { id: string }) => r.id);

describe('six regional layers', () => {
  it('six layers in two groups, each with its own unit, product and period', () => {
    expect(views.map((v) => v.id)).toEqual(['t2m', 'precip', 'soilm_root', 'soilm_surface', 'evap', 'swe']);
    expect(views.map((v) => v.group)).toEqual(['Atmosphere', 'Atmosphere', 'Land surface', 'Land surface', 'Land surface', 'Land surface']);
    expect(views.find((v) => v.id === 't2m')!.unit).toMatch(/°C/);
    expect(views.find((v) => v.id === 'soilm_root')!.unit).toBe('mm per decade');
    expect(views.find((v) => v.id === 'evap')!.unit).toBe('mm/month per decade');
    for (const v of views.filter((x) => x.exploratory)) { expect(v.product).toMatch(/GLDAS/); expect(v.period).toBe('2000–2024'); expect(v.nature).toMatch(/model/i); }
    expect(views.filter((v) => v.exploratory)).toHaveLength(4);
  });
  it('every layer covers the 16 regions with the published trend, interval and p, untouched', () => {
    for (const v of views) for (const r of regionIds) {
      const t = v.regions[r]?.trend;
      expect(t, `${v.id} ${r}`).toBeTruthy();
      const src = v.exploratory ? multivar.regions[r].series[v.id].trend : json(`${v.id}.json`).regions[r].trend;
      expect(t!.slope_per_decade).toBe(src.slope_per_decade);
      expect([t!.ci_low, t!.ci_high, t!.p_value]).toEqual([src.ci_low, src.ci_high, src.p_value]);
    }
  });
  it('GLDAS layers carry the published coverage of each region', () => {
    for (const v of views.filter((x) => x.exploratory)) for (const r of regionIds) expect(v.regions[r].coverage).toBe(multivar.regions[r].coverage[v.id]);
  });
  it('snow: negligible regions and glacier regions are flagged and not drawn, so they never set the scale', () => {
    const swe = views.find((v) => v.id === 'swe')!;
    for (const r of regionIds) {
      const s = multivar.regions[r].series.swe, x = swe.regions[r];
      expect(!!x.flag).toBe(!!(s.negligible || s.accumulating));
      if (x.flag) { expect(drawn(x)).toBeNull(); expect(fills(swe)[r]).toBeNull(); }
    }
    expect(swe.regions.magallanes.flag).toBe('glacier');                 // +97.7 mm/decade of glacier accumulation is not drawn
    expect(domain(swe)).toBeLessThan(Math.abs(multivar.regions.magallanes.series.swe.trend.slope_per_decade));
  });
  it('a region without a value stays uncoloured, never coloured as zero', () => {
    const v = { ...views[0], regions: { ...views[0].regions, nowhere: { trend: null }, broken: { trend: { ...views[0].regions[regionIds[0]].trend!, slope_per_decade: NaN } } } };
    expect(fills(v).nowhere).toBeNull(); expect(fills(v).broken).toBeNull();
  });
  it('fixed symmetric scale per variable: covers every drawn trend, zero in the middle, sign kept', () => {
    for (const v of views) {
      const D = domain(v), f = fills(v);
      expect(`#${ramp(v.stops, 0.5).getHexString()}`).toBe(v.stops[3]);          // a zero trend would sit on the neutral middle colour
      for (const r of regionIds) {
        const x = drawn(v.regions[r]);
        if (x == null) continue;
        expect(Math.abs(x)).toBeLessThanOrEqual(D);
        expect(f[r]).toBe(`#${ramp(v.stops, (x / D + 1) / 2).getHexString()}`);   // decreases on the low half, increases on the high half
      }
    }
  });
});

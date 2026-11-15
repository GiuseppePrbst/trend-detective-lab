// Presenter mode (?present=1): the cue list, its clock and its navigation, checked against the published results.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { clock, CUES, cueUrl, factsFrom, LIMIT, move, narrate, spoken, startOf, timing, TOTAL_TARGET } from './presentation/cues';

const json = (p: string) => JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf-8'));
const t2m = json('data/t2m.json'), territory = json('data/territory.json');
const facts = factsFrom(t2m, territory);

describe('presenter cues', () => {
  it('eight cues, unique ids, in order, 4:35 planned and under the 5:00 limit', () => {
    expect(CUES).toHaveLength(8);
    expect(new Set(CUES.map((c) => c.id)).size).toBe(8);
    expect(CUES.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(TOTAL_TARGET).toBe(275);
    expect(TOTAL_TARGET).toBeLessThan(LIMIT);
    expect(startOf(3)).toBe(85);                                        // the comparison starts at 1:25
    expect(startOf(8)).toBe(275);
  });
  it('the film cue plays the 30 s intro once and the Lab cues point to real sections of the Lab', () => {
    expect(CUES.filter((c) => c.steps.some((s) => s.scene.kind === 'globe' && s.scene.film))).toHaveLength(1);
    const lab = readFileSync(new URL('./lab.tsx', import.meta.url), 'utf-8') + readFileSync(new URL('./discovery.tsx', import.meta.url), 'utf-8');
    for (const c of CUES) for (const s of c.steps) if (s.scene.kind === 'lab') expect(lab).toContain(`id="${s.scene.anchor}"`);
  });
  it('every step has a backup capture shipped with the site', () => {
    for (const c of CUES) for (const s of c.steps) expect(existsSync(new URL(`../public/presenter/${s.backup}`, import.meta.url))).toBe(true);
  });
  it('the narration has no figure typed by hand: every number comes from the published files', () => {
    for (const c of CUES) expect(c.narration.replace(/\{\w+\}/g, '').match(/\d+,\d+/g)).toBeNull();
    const v = spoken(facts);
    expect(v.ant).toBe(t2m.regions.antofagasta.trend.slope_per_decade.toFixed(2).replace('.', ','));
    expect(v.diff).toBe(t2m.comparisons['antofagasta|los-lagos'].slope_per_decade.toFixed(2).replace('.', ','));
    for (const c of CUES) expect(narrate(c.narration, facts)).not.toMatch(/\{\w+\}/);
  });
  it('the comparison card is the pre-registered direct test of the difference, with its interval and p', () => {
    const card = CUES.find((c) => c.id === 'comparison')!.steps[0].card!(facts);
    const d = t2m.comparisons['antofagasta|los-lagos'];
    expect(d.planned).toBe(true);
    expect(card.kicker).toMatch(/^Pre-registered comparison/);
    expect(card.rows[2][1]).toContain(`+${d.slope_per_decade.toFixed(2)}`);
    expect(card.rows[2][1]).toContain(`p = ${d.p_value.toFixed(4)}`);
  });
  it('the Antofagasta cue shows the window sensitivity from territory.json and is labelled exploratory', () => {
    const [a, b] = CUES.find((c) => c.id === 'antofagasta')!.steps.map((s) => s.card!(facts));
    const w = (p: string) => territory.antofagasta.t4.find((x: { period: string }) => x.period.replace(/\W/g, '') === p);
    expect(a.kicker).toMatch(/^Exploratory/); expect(b.kicker).toContain('2003');
    expect(a.rows[0][1]).toContain(Math.abs(w('19802025').coastal.slope_per_decade).toFixed(2));
    expect(b.rows[2][1]).toContain('not significant');
    expect(w('20032025').difference.verdict).toBe('not_significant');
    for (const s of CUES.find((c) => c.id === 'antofagasta')!.steps) expect(s.scene.kind === 'globe' && s.scene.scale).toBe('fixed');   // windows compared on one scale
  });
});

describe('presenter navigation and clock', () => {
  it('next / back walk through the steps of a two-step cue; Home, End and a number jump', () => {
    const five = CUES.findIndex((c) => c.steps.length === 2);
    expect(move({ i: five, step: 0 }, 'next')).toEqual({ i: five, step: 1 });
    expect(move({ i: five, step: 1 }, 'next')).toEqual({ i: five + 1, step: 0 });
    expect(move({ i: five + 1, step: 0 }, 'prev')).toEqual({ i: five, step: 1 });
    expect(move({ i: 0, step: 0 }, 'prev')).toEqual({ i: 0, step: 0 });
    expect(move({ i: 7, step: 0 }, 'next')).toEqual({ i: 7, step: 0 });
    expect(move({ i: 4, step: 1 }, 'home')).toEqual({ i: 0, step: 0 });
    expect(move({ i: 0, step: 0 }, 'end')).toEqual({ i: 7, step: 0 });
    expect(move({ i: 0, step: 0 }, 99)).toEqual({ i: 7, step: 0 });
    let p = { i: 0, step: 0 }, presses = 0;
    while (p.i < 7) { p = move(p, 'next'); presses++; }
    expect(presses).toBe(8);                                            // eight presses from the first to the last cue
  });
  it('warns at 10 s behind, at 4:35 and 30 s before 5:00, and never stops by itself', () => {
    expect(timing(20, 0).late).toBe(false);
    expect(timing(41, 0).late).toBe(true);                              // cue 1 ends at 30 s
    expect(timing(275, 7).overTarget).toBe(true);
    expect(timing(269, 7).nearLimit).toBe(false);
    expect(timing(270, 7).nearLimit).toBe(true);
    expect(timing(320, 7).overLimit).toBe(true);
    expect(clock(275)).toBe('4:35');
  });
  it('the address keeps the other parameters and the cue, and exit removes only the presenter ones', () => {
    const u = cueUrl('https://x.test/app/?region=maule&period=2003-2025', 'evidence');
    expect(new URL(u).searchParams.get('cue')).toBe('evidence');
    expect(new URL(u).searchParams.get('present')).toBe('1');
    expect(new URL(u).searchParams.get('region')).toBe('maule');
    const out = new URL(cueUrl(u, null));
    expect(out.searchParams.has('present') || out.searchParams.has('cue')).toBe(false);
    expect(out.searchParams.get('period')).toBe('2003-2025');
  });
});

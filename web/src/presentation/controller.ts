// Presenter mode controller: which cue is on, the talk's clock, and the calls that put the real application in each cue's state.
// It drives the existing stage (flyTo, flyToPose, play, skip) and the same store as the interface; it never clicks on the page.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
import { create } from 'zustand';
import { load } from '../data';
import { useStage, type Stage } from '../experiences/stage';
import { CUES, cueUrl, factsFrom, move, type Facts, type GlobeScene } from './cues';

export type PMode = 'live' | 'rehearsal' | 'preview';
type P = {
  started: boolean; mode: PMode; i: number; step: number;
  t0: number; pausedAt: number | null; pausedTotal: number; cueT0: number;
  actual: (number | null)[];          // seconds spent on each cue (rehearsal log)
  notes: boolean; backup: boolean; lab: string | null; labWanted: boolean;
  facts: Facts | null; error: string;
};
export const usePresenter = create<P>(() => ({
  started: false, mode: 'preview', i: 0, step: 0, t0: 0, pausedAt: null, pausedTotal: 0, cueT0: 0,
  actual: CUES.map(() => null), notes: false, backup: false, lab: null, labWanted: false, facts: null, error: '',
}));
const set = usePresenter.setState, get = usePresenter.getState;

let stage: Stage | null = null;
const stageOf = () => (stage ??= ((window as unknown as { tdlStage?: Stage }).tdlStage ?? null));
addEventListener('tdl-stage', () => { stage = (window as unknown as { tdlStage?: Stage }).tdlStage ?? null; if (stage) apply(); });
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** seconds of talk so far (pauses excluded) */
export const elapsed = (now = performance.now()) => {
  const p = get();
  return p.started && p.mode !== 'preview' ? ((p.pausedAt ?? now) - p.t0 - p.pausedTotal) / 1000 : 0;
};
export const cueElapsed = (now = performance.now()) => {
  const p = get();
  return p.started ? ((p.pausedAt ?? now) - p.cueT0) / 1000 : 0;
};

/** Put the application in the state of the current cue and step. */
export function apply() {
  const p = get(), cue = CUES[p.i], sc = cue.steps[p.step].scene;
  history.replaceState(null, '', cueUrl(location.href, cue.id));
  if (sc.kind === 'lab') { set({ lab: sc.anchor, labWanted: true }); return; }
  set({ lab: null, labWanted: p.labWanted || CUES[p.i + 1]?.steps[0].scene.kind === 'lab' });   // preload the Lab one cue ahead
  const st = stageOf();
  if (!st) return;                                            // applied again when the stage announces itself
  const g = sc as GlobeScene;
  useStage.setState({ layer: g.layer, mode: g.mode, left: g.left, right: g.right, hideUi: false, tip: null, picked: null, selected: null, ...(g.layer === 'cells' ? { cells: true } : {}), ...(g.scale ? { scaleMode: g.scale } : {}) });
  if (g.film) { void st.play().then(() => { if (reduced()) st.skip(); }); return; }
  if (g.pose) st.flyToPose(g.pose);
  else if (g.dest) st.flyTo(g.dest);
  if (g.period) useStage.setState({ period: g.period });     // after flyTo, which keeps the scene's own window
}

/** Is the screen showing what the cue needs? (data loaded, camera arrived or film running, window and layer set) */
export function ready(): boolean {
  const p = get(), sc = CUES[p.i].steps[p.step].scene, s = useStage.getState(), st = stageOf();
  if (sc.kind === 'lab') return p.lab === sc.anchor && labReady === sc.anchor;
  if (p.backup) return true;
  if (!st || s.status !== 'ready') return false;
  if (sc.film) return s.film || !st.busy();
  if (st.busy() || s.layer !== sc.layer || s.mode !== sc.mode) return false;
  if (sc.period && s.period !== sc.period) return false;
  if (sc.dest === 'antofagasta' || sc.dest === 'los_lagos') return s.near && s.scene === sc.dest;
  return true;
}
let labReady: string | null = null;             // the Lab section that is aligned at the top, if any
export const setLabReady = (anchor: string | null) => { labReady = anchor; };

function go(to: Parameters<typeof move>[1]) {
  const p = get(), now = performance.now(), n = move(p, to);
  if (n.i === p.i && n.step === p.step && to !== 'home') return;
  const actual = p.actual.slice();
  if (n.i !== p.i && p.started) actual[p.i] = (actual[p.i] ?? 0) + cueElapsed(now);
  set({ ...n, actual, cueT0: n.i !== p.i ? now : p.cueT0, pausedAt: p.pausedAt ? now : null });
  apply();
}

export const presenter = {
  async loadFacts() {
    try {
      const [t2m, terr] = await Promise.all([load<Parameters<typeof factsFrom>[0]>('t2m.json'), load<Parameters<typeof factsFrom>[1]>('territory.json')]);
      if (!t2m || !terr) throw new Error('results not found');
      set({ facts: factsFrom(t2m, terr) });
    } catch (e) { set({ error: `Could not read the published results: ${String(e)}` }); }
  },
  /** open the presenter on a cue (from ?cue=), without starting the clock */
  init(cueId: string | null) {
    const i = Math.max(0, CUES.findIndex((c) => c.id === cueId));
    set({ i, step: 0 });
    apply();
  },
  start(mode: PMode) {
    const now = performance.now();
    set({ started: true, mode, t0: now, cueT0: now, pausedAt: null, pausedTotal: 0, actual: CUES.map(() => null) });
    if (mode !== 'preview') go('home'); else apply();
  },
  next: () => go('next'), prev: () => go('prev'), home: () => go('home'), end: () => go('end'), to: (i: number) => go(i),
  restartCue() { set({ cueT0: performance.now() }); apply(); },
  togglePause() {
    const p = get(), now = performance.now();
    if (!p.started || p.mode === 'preview') return;
    if (p.pausedAt) set({ pausedTotal: p.pausedTotal + now - p.pausedAt, pausedAt: null }); else set({ pausedAt: now });
  },
  toggleNotes: () => set({ notes: !get().notes }),
  toggleBackup: () => set({ backup: !get().backup }),
  /** Escape: stop a moving camera or the film where it is; with nothing moving, the second Escape within 1.5 s leaves */
  escape() {
    const st = stageOf();
    if (st?.busy()) { if (useStage.getState().film) st.stop(); else st.interrupt(); lastEsc = 0; return; }
    const now = performance.now();
    if (now - lastEsc < 1500) presenter.exit(); else lastEsc = now;
  },
  exit() { location.href = cueUrl(location.href, null); },
};
let lastEsc = 0;

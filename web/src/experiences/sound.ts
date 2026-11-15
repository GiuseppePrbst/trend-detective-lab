// Interface sounds, synthesised in the browser with Web Audio: short sine/triangle gestures, original to this project.
// No audio file is shipped and no third-party sound is used here, so the open-source app has no audio licence to clear.
// Sound is off until the visitor turns it on; nothing in the interface depends on it.
// SI disclosure: written with the assistance of an SI coding tool (Claude) and reviewed by the team.
export type Cue = 'select' | 'panel' | 'layer' | 'period' | 'fly' | 'arrive' | 'terrain';

// [waveform, start Hz, end Hz, seconds, gain] — one or two voices per cue
const CUES: Record<Cue, [OscillatorType, number, number, number, number][]> = {
  select: [['sine', 880, 1320, 0.09, 0.5]],
  panel: [['triangle', 520, 420, 0.07, 0.35]],
  layer: [['sine', 440, 660, 0.12, 0.4]],
  period: [['triangle', 660, 660, 0.05, 0.4], ['sine', 990, 990, 0.09, 0.25]],
  fly: [['sine', 180, 420, 0.7, 0.35]],
  arrive: [['sine', 523.25, 523.25, 0.5, 0.3], ['sine', 783.99, 783.99, 0.6, 0.22]],
  terrain: [['triangle', 110, 165, 0.45, 0.4]],
};
const KEY = 'tdl-sound';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') as { on: boolean; vol: number } | null; } catch { return null; } };
let ctx: AudioContext | null = null, master: GainNode | null = null, last = 0, live = 0;
let state = read() ?? { on: false, vol: 0.5 };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode: the choice lasts for this visit */ } };

export const sound = {
  enabled: () => state.on,
  volume: () => state.vol,
  /** call from a click: browsers only start audio after a gesture */
  setEnabled(on: boolean) { state = { ...state, on }; save(); if (on) this.cue('select'); else void ctx?.suspend(); },
  setVolume(vol: number) { state = { ...state, vol }; save(); if (master) master.gain.value = vol * 0.25; },
  cue(name: Cue) {
    if (!state.on) return;
    try {
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      if (!master) { master = ctx.createGain(); master.gain.value = state.vol * 0.25; master.connect(ctx.destination); }
      const now = ctx.currentTime;
      if (now - last < 0.06 || live > 6) return;          // debounce and a ceiling on simultaneous voices
      last = now;
      for (const [type, f0, f1, dur, gain] of CUES[name]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f1, now + dur);
        g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(gain, now + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g); g.connect(master);
        live++; o.onended = () => { live--; o.disconnect(); g.disconnect(); };
        o.start(now); o.stop(now + dur + 0.02);
      }
    } catch { /* no audio device or blocked: the interface works the same in silence */ }
  },
};
